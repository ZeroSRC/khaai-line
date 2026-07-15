import { createHmac, timingSafeEqual } from 'crypto'
import { createSupabaseClient } from '@/lib/supabase'

export const runtime = 'nodejs'

/**
 * Temporary invite tokens for the QR code.
 *
 * A QR that never expires is a permanent backdoor — anyone who ever photographs it can
 * join forever. So the QR encodes a short-lived signed token: {slug, exp} + HMAC.
 *
 *   sign   — owner-only. Returns { exp, sig } for a shop the caller owns.
 *   verify — open. Checks the sig and that exp hasn't passed. Called by the join page.
 *
 * No DB table: the signature IS the proof, so expired/forged tokens are rejected by maths,
 * not by a lookup. Uses SUPABASE_JWT_SECRET (same secret the app already trusts).
 */
const TTL_SECONDS = 3 * 60 // 3 minutes

function sign(slug: string, exp: number, secret: string): string {
  return createHmac('sha256', secret).update(`${slug}.${exp}`).digest('base64url')
}

/** Decode a JWT payload without verifying — RLS re-verifies on every query, so this only
 *  reads the caller's own line_uid to look their membership up. */
function lineUidFromJwt(jwt: string): string | null {
  try {
    const payload = JSON.parse(Buffer.from(jwt.split('.')[1], 'base64url').toString())
    return payload.line_uid ?? null
  } catch { return null }
}

export async function POST(req: Request) {
  const secret = process.env.SUPABASE_JWT_SECRET
  if (!secret) return Response.json({ error: 'server not configured' }, { status: 500 })

  const body = await req.json().catch(() => null)
  if (!body?.action) return Response.json({ error: 'missing action' }, { status: 400 })

  // ── verify ────────────────────────────────────────────────
  if (body.action === 'verify') {
    const { slug, exp, sig } = body
    if (!slug || !exp || !sig) return Response.json({ valid: false })
    if (Math.floor(Date.now() / 1000) > Number(exp)) return Response.json({ valid: false, reason: 'expired' })

    const expected = sign(String(slug), Number(exp), secret)
    const a = Buffer.from(expected), b = Buffer.from(String(sig))
    const ok = a.length === b.length && timingSafeEqual(a, b)
    return Response.json({ valid: ok })
  }

  // ── sign (owner only) ─────────────────────────────────────
  if (body.action === 'sign') {
    const { slug, jwt } = body
    if (!slug || !jwt) return Response.json({ error: 'missing slug/jwt' }, { status: 400 })

    const lineUid = lineUidFromJwt(jwt)
    if (!lineUid) return Response.json({ error: 'bad token' }, { status: 401 })

    // Confirm the caller actually owns this shop before minting an invite for it.
    const sb = createSupabaseClient(jwt)
    const { data: shopRows } = await sb.rpc('shop_public_by_slug', { p_slug: slug })
    const shop = Array.isArray(shopRows) ? shopRows[0] : shopRows
    if (!shop) return Response.json({ error: 'shop not found' }, { status: 404 })

    const { data: me } = await sb
      .from('shop_members').select('role').eq('shop_id', shop.id).eq('line_uid', lineUid).maybeSingle()
    if (me?.role !== 'owner') return Response.json({ error: 'not owner' }, { status: 403 })

    const exp = Math.floor(Date.now() / 1000) + TTL_SECONDS
    return Response.json({ exp, sig: sign(String(slug), exp, secret), ttl: TTL_SECONDS })
  }

  return Response.json({ error: 'unknown action' }, { status: 400 })
}
