import { NextRequest, NextResponse } from 'next/server'

// ⚠️ verifyCode/vck are anti-bot tokens captured from J&T's own tracking page — they look
// like a signed/short-lived verification result (GeeTest-style), not a stable API key.
// If tracking starts failing silently, this is almost certainly why: the token expired or
// was single-use, and a fresh one has to be captured from the network tab of
// https://www.jtexpress.co.th tracking a real parcel, then updated here (env vars, not code).
const JT_VERIFY_CODE = process.env.JT_VERIFY_CODE
const JT_VCK = process.env.JT_VCK

interface JTResponse {
  succ?: boolean
  data?: { statusCode?: string; status?: string }
}

// statusCode "5" = "เซ็นรับพัสดุ" (signed for parcel / delivered)
function isDelivered(data: unknown): boolean {
  const r = data as JTResponse
  return r?.succ === true && r?.data?.statusCode === '5'
}

export async function POST(req: NextRequest) {
  const { trackingNumbers } = await req.json() as { trackingNumbers: string[] }

  if (!Array.isArray(trackingNumbers) || trackingNumbers.length === 0) {
    return NextResponse.json({ error: 'no tracking numbers' }, { status: 400 })
  }
  if (!JT_VERIFY_CODE || !JT_VCK) {
    return NextResponse.json({ error: 'J&T tracking not configured (JT_VERIFY_CODE/JT_VCK)' }, { status: 500 })
  }

  const results: Record<string, { delivered: boolean; raw?: unknown }> = {}

  await Promise.all(
    trackingNumbers.map(async (billCode) => {
      try {
        const res = await fetch('https://websiteapi.jtexpress.co.th/jts-tha-website-api/api/v2/track/orderTrack', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ billCode, lang: 'th', verifyCode: JT_VERIFY_CODE, vck: JT_VCK }),
        })
        const data = await res.json()
        results[billCode] = { delivered: isDelivered(data), raw: data }
      } catch {
        results[billCode] = { delivered: false }
      }
    })
  )

  return NextResponse.json({ results })
}
