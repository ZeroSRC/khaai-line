import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const { idToken } = await req.json()
  if (!idToken) return NextResponse.json({ error: 'missing idToken' }, { status: 400 })

  // Verify idToken with LINE
  const res = await fetch('https://api.line.me/oauth2/v2.1/verify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      id_token: idToken,
      client_id: process.env.LINE_CHANNEL_ID!,
    }),
  })

  if (!res.ok) return NextResponse.json({ error: 'invalid token' }, { status: 401 })

  const data = await res.json()
  if (data.error) return NextResponse.json({ error: data.error }, { status: 401 })

  return NextResponse.json({ lineUid: data.sub, displayName: data.name, pictureUrl: data.picture })
}
