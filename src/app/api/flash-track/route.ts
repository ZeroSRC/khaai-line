import { NextRequest, NextResponse } from 'next/server'

interface FlashResponse {
  code: number
  data?: {
    list?: Array<{ state: number; state_text: string }>
  }
}

// state === 5 = "เซ็นรับแล้ว" (delivered)
function isDelivered(data: unknown): boolean {
  const r = data as FlashResponse
  if (r?.code !== 1) return false
  const item = r?.data?.list?.[0]
  return item?.state === 5
}

export async function POST(req: NextRequest) {
  const { trackingNumbers } = await req.json() as { trackingNumbers: string[] }

  if (!Array.isArray(trackingNumbers) || trackingNumbers.length === 0) {
    return NextResponse.json({ error: 'no tracking numbers' }, { status: 400 })
  }

  const results: Record<string, { delivered: boolean; raw?: unknown }> = {}

  await Promise.all(
    trackingNumbers.map(async (no) => {
      try {
        const res = await fetch('https://www.flashexpress.co.th/webApi/tools/tracking', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ search: no }),
        })
        const data = await res.json()
        results[no] = { delivered: isDelivered(data), raw: data }
      } catch {
        results[no] = { delivered: false }
      }
    })
  )

  return NextResponse.json({ results })
}
