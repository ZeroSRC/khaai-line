'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useShopStore } from '@/store/shopStore'
import { createSupabaseClient } from '@/lib/supabase'
import { formatMoneyFull, formatDateTime } from '@/lib/format'
import type { Purchase } from '@/lib/types'

interface PurchaseItem {
  id: string
  product_id: string
  quantity: number
  unit_cost: number
  total_cost: number
  product?: { name: string; sku: string | null }
}

export default function PurchaseDetailPage() {
  const { id } = useParams<{ shopId: string; id: string }>()
  const router = useRouter()
  const { shop, lineUid, jwt } = useShopStore()
  const [purchase, setPurchase] = useState<Purchase | null>(null)
  const [items, setItems] = useState<PurchaseItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!shop || !lineUid) return
    const sb = createSupabaseClient(jwt ?? undefined)
    Promise.all([
      sb.from('purchases').select('*').eq('id', id).single(),
      sb.from('purchase_items').select('*, product:products(name, sku)').eq('purchase_id', id),
    ]).then(([purchaseRes, itemsRes]) => {
      if (purchaseRes.data) setPurchase(purchaseRes.data as Purchase)
      setItems((itemsRes.data ?? []) as PurchaseItem[])
      setLoading(false)
    })
  }, [shop, lineUid, id])

  if (loading) return (
    <div className="flex items-center justify-center min-h-dvh">
      <div className="w-8 h-8 rounded-lg bg-[#06C755] animate-pulse" />
    </div>
  )

  if (!purchase) return (
    <div className="flex flex-col items-center justify-center min-h-dvh gap-3 p-8 text-center">
      <p className="font-semibold">ไม่พบรายการซื้อนี้</p>
      <button onClick={() => router.back()} className="text-[#06C755] text-sm">← กลับ</button>
    </div>
  )

  return (
    <div className="pb-8">
      <div className="bg-white px-4 pt-12 pb-4 border-b border-gray-100 sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()} className="text-gray-400 text-xl">←</button>
          <div className="flex-1">
            <h1 className="text-lg font-bold">รายละเอียดการซื้อ</h1>
            <p className="text-xs text-gray-400">{purchase.ref_number}</p>
          </div>
        </div>
      </div>

      <div className="px-4 pt-4 space-y-4">
        {/* Summary card */}
        <div className="bg-red-500 rounded-2xl p-5 text-white">
          <p className="text-white/70 text-xs mb-1">ยอดรวม</p>
          <p className="text-3xl font-bold">{formatMoneyFull(purchase.total_amount)}</p>
          <div className="flex items-center gap-3 mt-3 pt-3 border-t border-white/20">
            <div className="flex-1">
              <p className="text-white/80 text-xs">{formatDateTime(purchase.created_at)}</p>
              {purchase.supplier && (
                <p className="text-white/90 text-xs mt-0.5">📦 {purchase.supplier}</p>
              )}
            </div>
            {purchase.slip_url && (
              <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full">มีสลิป</span>
            )}
          </div>
        </div>

        {/* Items */}
        {items.length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
            <p className="text-xs font-semibold text-gray-400 px-4 pt-4 pb-2">รายการสินค้า</p>
            {items.map((item, i) => (
              <div key={item.id} className={`flex items-center gap-3 px-4 py-3 ${i > 0 ? 'border-t border-gray-50' : ''}`}>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900">{item.product?.name ?? 'สินค้า'}</p>
                  {item.product?.sku && <p className="text-xs text-gray-400">{item.product.sku}</p>}
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-gray-900">{formatMoneyFull(item.total_cost)}</p>
                  <p className="text-xs text-gray-400">{formatMoneyFull(item.unit_cost)} × {item.quantity}</p>
                </div>
              </div>
            ))}
            <div className="flex justify-between px-4 py-3 border-t border-gray-100 bg-gray-50">
              <span className="text-sm font-semibold text-gray-700">รวมทั้งหมด</span>
              <span className="text-sm font-bold text-red-500">{formatMoneyFull(purchase.total_amount)}</span>
            </div>
          </div>
        )}

        {/* Slip image */}
        {purchase.slip_url && (
          <div className="bg-white rounded-2xl p-4 shadow-sm">
            <p className="text-xs font-semibold text-gray-400 mb-3">สลิปโอนเงิน</p>
            <img
              src={purchase.slip_url}
              alt="slip"
              className="w-full rounded-xl object-cover max-h-64"
            />
          </div>
        )}

        {/* Note */}
        {purchase.note && (
          <div className="bg-white rounded-2xl p-4 shadow-sm">
            <p className="text-xs font-semibold text-gray-400 mb-1">หมายเหตุ</p>
            <p className="text-sm text-gray-700">{purchase.note}</p>
          </div>
        )}
      </div>
    </div>
  )
}
