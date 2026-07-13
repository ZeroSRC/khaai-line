import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { createClient } from '@supabase/supabase-js'

const CHANNEL_SECRET = process.env.LINE_CHANNEL_SECRET!
const CHANNEL_ACCESS_TOKEN = process.env.LINE_CHANNEL_ACCESS_TOKEN!

function verifySignature(body: string, signature: string): boolean {
  const hash = crypto
    .createHmac('SHA256', CHANNEL_SECRET)
    .update(body)
    .digest('base64')
  return hash === signature
}

async function replyMessage(replyToken: string, messages: object[]) {
  await fetch('https://api.line.me/v2/bot/message/reply', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${CHANNEL_ACCESS_TOKEN}`,
    },
    body: JSON.stringify({ replyToken, messages }),
  })
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

async function handleMessage(event: any) {
  const { replyToken, source, message } = event
  const lineUid = source.userId
  const text = (message.text ?? '').trim().toLowerCase()

  // Find shop this user belongs to
  const { data: member } = await supabase
    .from('shop_members')
    .select('shop_id, role, shops(name)')
    .eq('line_uid', lineUid)
    .single()

  if (!member) {
    await replyMessage(replyToken, [{
      type: 'text',
      text: 'คุณยังไม่ได้ลงทะเบียนร้านค้า\nสร้างร้านได้ที่ลิงก์นี้: ' + process.env.NEXT_PUBLIC_APP_URL,
    }])
    return
  }

  const shopId = member.shop_id
  const shopName = (member.shops as any)?.name ?? 'ร้านค้า'

  // Command: ยอดวันนี้
  if (text.includes('ยอด') || text === '/today' || text === '/ยอด') {
    const today = new Date().toISOString().slice(0, 10)
    const { data: sales } = await supabase
      .from('sales')
      .select('total_amount')
      .eq('shop_id', shopId)
      .gte('created_at', today)

    const total = (sales ?? []).reduce((s, r) => s + Number(r.total_amount), 0)
    const count = sales?.length ?? 0

    await replyMessage(replyToken, [{
      type: 'text',
      text: `📊 ${shopName}\nยอดขายวันนี้: ${total.toLocaleString('th')} บาท\nจำนวน: ${count} ออเดอร์`,
    }])
    return
  }

  // Command: สต็อก
  if (text.includes('สต็อก') || text === '/stock') {
    const { data: lowStock } = await supabase
      .from('products')
      .select('name, stock')
      .eq('shop_id', shopId)
      .lt('stock', 3)
      .eq('is_active', true)

    if (!lowStock?.length) {
      await replyMessage(replyToken, [{ type: 'text', text: '✅ สต็อกสินค้าปกติทุกรายการ' }])
    } else {
      const lines = lowStock.map((p) => `• ${p.name}: ${p.stock} ชิ้น`).join('\n')
      await replyMessage(replyToken, [{ type: 'text', text: `⚠️ สต็อกใกล้หมด:\n${lines}` }])
    }
    return
  }

  // Command: พัสดุ
  if (text.includes('พัสดุ') || text === '/ship') {
    const { data: shipments } = await supabase
      .from('shipments')
      .select('tracking_number, carrier, status')
      .eq('shop_id', shopId)
      .eq('status', 'shipped')
      .limit(5)

    if (!shipments?.length) {
      await replyMessage(replyToken, [{ type: 'text', text: '✅ ไม่มีพัสดุรอส่ง' }])
    } else {
      const lines = shipments.map((s) => `• ${s.carrier ?? '-'}: ${s.tracking_number ?? 'ยังไม่มีเลข'}`).join('\n')
      await replyMessage(replyToken, [{ type: 'text', text: `🚚 พัสดุที่กำลังส่ง (${shipments.length}):\n${lines}` }])
    }
    return
  }

  // Default: help menu
  await replyMessage(replyToken, [{
    type: 'text',
    text: `สวัสดี! ${shopName} 🏪\n\nคำสั่งที่ใช้ได้:\n/ยอด — ยอดขายวันนี้\n/stock — เช็คสต็อก\n/ship — พัสดุที่กำลังส่ง\n\nหรือกดเปิดแอป: ${process.env.NEXT_PUBLIC_APP_URL}/shop/...`,
  }])
}

export async function POST(req: NextRequest) {
  const body = await req.text()
  const signature = req.headers.get('x-line-signature') ?? ''

  if (!verifySignature(body, signature)) {
    return NextResponse.json({ error: 'invalid signature' }, { status: 401 })
  }

  const { events } = JSON.parse(body)
  await Promise.all(
    events
      .filter((e: any) => e.type === 'message' && e.message.type === 'text')
      .map((e: any) => handleMessage(e))
  )

  return NextResponse.json({ ok: true })
}
