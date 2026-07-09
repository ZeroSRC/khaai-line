'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useShopStore } from '@/store/shopStore'
import { createSupabaseClient } from '@/lib/supabase'
import type { Sale } from '@/lib/types'

const CARRIERS = ['ไปรษณีย์ไทย', 'Flash Express', 'Kerry', 'J&T', 'DHL', 'Ninja Van']

export default function NewShipmentPage() {
  const { shopId } = useParams<{ shopId: string }>()
  const router = useRouter()
  const { shop, lineUid, jwt } = useShopStore()
  const [sales, setSales] = useState<Sale[]>([])
  const [saleId, setSaleId] = useState('')
  const [trackingNumber, setTrackingNumber] = useState('')
  const [carrier, setCarrier] = useState('')
  const [shippingCost, setShippingCost] = useState('')
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!shop || !lineUid) return
    // โหลด sales ที่ยังไม่มี shipment
    createSupabaseClient(jwt ?? undefined)
      .from('sales')
      .select('id, ref_number, created_at, total_amount')
      .eq('shop_id', shop.id)
      .order('created_at', { ascending: false })
      .limit(30)
      .then(({ data }) => setSales((data ?? []) as Sale[]))
  }, [shop, lineUid])

  const handleSave = async () => {
    if (!shop || !lineUid) return
    setSaving(true)
    const sb = createSupabaseClient(jwt ?? undefined)

    const { error } = await sb.from('shipments').insert({
      shop_id: shop.id,
      sale_id: saleId || null,
      tracking_number: trackingNumber || null,
      carrier: carrier || null,
      shipping_cost: parseFloat(shippingCost) || 0,
      note: note || null,
      status: 'pending',
    })

    if (!error) {
      router.push(`/shop/${shopId}/shipments`)
    } else {
      setSaving(false)
    }
  }

  return (
    <div className="pb-32">
      <div className="bg-white px-4 pt-12 pb-4 border-b border-gray-100 sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()} className="text-gray-400 text-xl">←</button>
          <h1 className="text-lg font-bold">เพิ่มพัสดุ</h1>
        </div>
      </div>

      <div className="px-4 pt-4 space-y-4">
        {/* ออเดอร์ที่เกี่ยวข้อง */}
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <p className="text-xs font-semibold text-gray-400 mb-2">ออเดอร์ที่เกี่ยวข้อง (ถ้ามี)</p>
          <select
            className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm bg-white"
            value={saleId}
            onChange={(e) => setSaleId(e.target.value)}>
            <option value="">— ไม่ระบุออเดอร์ —</option>
            {sales.map((s) => (
              <option key={s.id} value={s.id}>
                {s.ref_number ?? 'ออเดอร์'} — ฿{s.total_amount}
              </option>
            ))}
          </select>
        </div>

        {/* ขนส่ง */}
        <div className="bg-white rounded-2xl p-4 shadow-sm space-y-3">
          <p className="text-xs font-semibold text-gray-400">ข้อมูลพัสดุ</p>
          <div>
            <p className="text-xs text-gray-400 mb-1">บริษัทขนส่ง</p>
            <div className="flex flex-wrap gap-2">
              {CARRIERS.map((c) => (
                <button key={c} onClick={() => setCarrier(c)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition-colors ${
                    carrier === c ? 'bg-[#06C755] text-white border-[#06C755]' : 'bg-gray-50 text-gray-600 border-gray-200'
                  }`}>
                  {c}
                </button>
              ))}
            </div>
            <input
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm mt-2 focus:outline-none focus:border-[#06C755]"
              placeholder="หรือพิมพ์ชื่อขนส่งเอง"
              value={carrier}
              onChange={(e) => setCarrier(e.target.value)}
            />
          </div>

          <div>
            <p className="text-xs text-gray-400 mb-1">เลขพัสดุ</p>
            <input
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#06C755]"
              placeholder="เลขพัสดุ (ถ้ามี)"
              value={trackingNumber}
              onChange={(e) => setTrackingNumber(e.target.value)}
            />
          </div>

          <div>
            <p className="text-xs text-gray-400 mb-1">ค่าจัดส่ง (฿)</p>
            <input
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#06C755]"
              placeholder="0"
              type="number"
              inputMode="decimal"
              value={shippingCost}
              onChange={(e) => setShippingCost(e.target.value)}
            />
          </div>
        </div>

        {/* หมายเหตุ */}
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <p className="text-xs font-semibold text-gray-400 mb-2">หมายเหตุ</p>
          <textarea
            className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm resize-none focus:outline-none focus:border-[#06C755]"
            rows={2}
            placeholder="หมายเหตุเพิ่มเติม"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 max-w-[430px] mx-auto p-4 bg-white border-t border-gray-100">
        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full bg-[#06C755] disabled:bg-gray-200 text-white disabled:text-gray-400 font-bold py-4 rounded-2xl text-base transition-colors">
          {saving ? 'กำลังบันทึก...' : 'บันทึกพัสดุ'}
        </button>
      </div>
    </div>
  )
}
