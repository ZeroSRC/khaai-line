import { NextRequest, NextResponse } from 'next/server'

// ตรวจสอบว่า Flash Express ส่งถึงปลายทางหรือยัง
function isDelivered(data: unknown): boolean {
  const json = JSON.stringify(data).toLowerCase()
  // Flash Express ใช้ statusCode 50 หรือ keyword ส่งสำเร็จ / delivered
  if (json.includes('"statuscode":50') || json.includes('"statuscode":"50"')) return true
  if (json.includes('ส่งสำเร็จ') || json.includes('delivered')) return true
  return false
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
