// @ts-nocheck
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function base64url(input: string | ArrayBuffer): string {
  const str =
    input instanceof ArrayBuffer
      ? String.fromCharCode(...new Uint8Array(input))
      : input
  return btoa(str).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_')
}

async function signJWT(payload: Record<string, unknown>, secret: string): Promise<string> {
  const header = base64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))
  const body = base64url(JSON.stringify(payload))
  const signingInput = `${header}.${body}`

  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(signingInput))
  return `${signingInput}.${base64url(sig)}`
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })

  try {
    const { line_access_token } = await req.json()
    if (!line_access_token) {
      return Response.json({ error: 'missing line_access_token' }, { status: 400, headers: CORS })
    }

    // ตรวจ LINE token และดึง profile
    const profileRes = await fetch('https://api.line.me/v2/profile', {
      headers: { Authorization: `Bearer ${line_access_token}` },
    })
    if (!profileRes.ok) {
      return Response.json({ error: 'invalid LINE token' }, { status: 401, headers: CORS })
    }
    const { userId, displayName, pictureUrl } = await profileRes.json()

    // Sign JWT ที่ Supabase เชื่อถือ — ใส่ line_uid เป็น custom claim
    const jwtSecret = Deno.env.get('SUPABASE_JWT_SECRET')
    if (!jwtSecret) {
      return Response.json({ error: 'SUPABASE_JWT_SECRET not set' }, { status: 500, headers: CORS })
    }
    const now = Math.floor(Date.now() / 1000)
    const expiresIn = 60 * 60 * 24 // 24 ชม.

    const jwt = await signJWT(
      {
        aud: 'authenticated',
        iss: 'supabase',
        iat: now,
        exp: now + expiresIn,
        sub: userId,          // LINE userId เป็น subject
        role: 'authenticated',
        line_uid: userId,     // custom claim — RLS อ่านจากนี้
      },
      jwtSecret,
    )

    return Response.json(
      { access_token: jwt, expires_in: expiresIn, line_uid: userId, display_name: displayName, picture_url: pictureUrl },
      { headers: CORS },
    )
  } catch (err) {
    console.error('verify-line error:', err)
    return Response.json({ error: 'server error', detail: String(err) }, { status: 500, headers: CORS })
  }
})
