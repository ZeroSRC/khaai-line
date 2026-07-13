import { createHmac } from 'crypto'

export const runtime = 'nodejs'

/**
 * DEV ONLY — ปั้น Supabase JWT ให้ตรงกับที่ Edge Function `verify-line` ปั้น
 * แต่ข้ามขั้นตอนตรวจ LINE access token (localhost ไม่มี token จริง)
 *
 * ต้องใช้ SUPABASE_JWT_SECRET ตัวเดียวกับที่ตั้งเป็น JWT_SECRET ใน Edge Function
 * (Supabase Dashboard → Settings → API → JWT Secret)
 *
 * ⚠️ ตายทันทีบน production — กันเคสเผลอ deploy แล้วใครก็ขอ JWT ของ UID ใครก็ได้
 */
function base64url(input: Buffer | string): string {
  return Buffer.from(input)
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
}

export async function POST(req: Request) {
  if (process.env.NODE_ENV === 'production') {
    return new Response('Not found', { status: 404 })
  }

  const secret = process.env.SUPABASE_JWT_SECRET
  if (!secret) {
    return Response.json(
      { error: 'SUPABASE_JWT_SECRET ไม่ได้ตั้งใน .env.local — ก๊อปมาจาก Supabase Dashboard → Settings → API → JWT Secret' },
      { status: 500 },
    )
  }

  const { line_uid } = await req.json()
  if (!line_uid) return Response.json({ error: 'missing line_uid' }, { status: 400 })

  const now = Math.floor(Date.now() / 1000)
  const expiresIn = 60 * 60 * 24

  const header = base64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))
  const payload = base64url(
    JSON.stringify({
      aud: 'authenticated',
      iss: 'supabase',
      iat: now,
      exp: now + expiresIn,
      sub: line_uid,
      role: 'authenticated',
      line_uid,
    }),
  )
  const signingInput = `${header}.${payload}`
  const sig = base64url(createHmac('sha256', secret).update(signingInput).digest())

  return Response.json({ access_token: `${signingInput}.${sig}`, expires_in: expiresIn, line_uid })
}
