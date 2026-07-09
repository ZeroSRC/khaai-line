'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useShopStore } from '@/store/shopStore'
import { createSupabaseClient } from '@/lib/supabase'
import { formatMoneyFull, formatDateTime } from '@/lib/format'
import type { Sale, SaleItem } from '@/lib/types'

export default function SaleDetailPage() {
  const { saleId } = useParams<{ shopId: string; saleId: string }>()
  const router = useRouter()
  const { shop, lineUid, jwt } = useShopStore()
  const [sale, setSale] = useState<Sale | null>(null)
  const [items, setItems] = useState<SaleItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!shop || !lineUid) return
    const sb = createSupabaseClient(jwt ?? undefined)
    Promise.all([
      sb.from('sales').select('*').eq('id', saleId).single(),
      sb.from('sale_items').select('*, product:products(name, sku)').eq('sale_id', saleId),
    ]).then(([saleRes, itemsRes]) => {
      if (saleRes.data) setSale(saleRes.data as Sale)
      setItems((itemsRes.data ?? []) as SaleItem[])
      setLoading(false)
    })
  }, [shop, lineUid, saleId])

  if (loading) return (
    <div className="flex items-center justify-center min-h-dvh">
      <div className="w-8 h-8 rounded-lg bg-[#06C755] animate-pulse" />
    </div>
  )

  if (!sale) return (
    <div className="flex flex-col items-center justify-center min-h-dvh gap-3 p-8 text-center">
      <p className="font-semibold">ไม่พบบิลนี้</p>
      <button onClick={() => router.back()} className="text-[#06C755] text-sm">← กลับ</button>
    </div>
  )

  const slipTypeLabel = sale.slip_type === 'transfer' ? '💳 โอนเงิน' : sale.slip_type === 'cash' ? '💵 เงินสด' : null

  return (
    <div className="pb-8">
      <div className="bg-white px-4 pt-12 pb-4 border-b border-gray-100 sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()} className="text-gray-400 text-xl">←</button>
          <div className="flex-1">
            <h1 className="text-lg font-bold">รายละเอียดบิล</h1>
            <p className="text-xs text-gray-400">{sale.ref_number}</p>
          </div>
        </div>
      </div>

      <div className="px-4 pt-4 space-y-4">
        {/* Summary card */}
        <div className="bg-[#06C755] rounded-2xl p-5 text-white">
          <p className="text-white/70 text-xs mb-1">ยอดรวม</p>
          <p className="text-3xl font-bold">{formatMoneyFull(sale.total_amount)}</p>
          {sale.vat_amount > 0 && (
            <p className="text-white/70 text-xs mt-1">รวม VAT {formatMoneyFull(sale.vat_amount)}</p>
          )}
          <div className="flex items-center gap-3 mt-3 pt-3 border-t border-white/20">
            <p className="text-white/80 text-xs flex-1">{formatDateTime(sale.created_at)}</p>
            {slipTypeLabel && (
              <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full">{slipTypeLabel}</span>
            )}
          </div>
        </div>

        {/* Items */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <p className="text-xs font-semibold text-gray-400 px-4 pt-4 pb-2">รายการสินค้า</p>
          {items.map((item, i) => (
            <div key={item.id} className={`flex items-center gap-3 px-4 py-3 ${i > 0 ? 'border-t border-gray-50' : ''}`}>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900">
                  {(item.product as any)?.name ?? 'สินค้า'}
                </p>
                {(item.product as any)?.sku && (
                  <p className="text-xs text-gray-400">{(item.product as any).sku}</p>
                )}
              </div>
              <div className="text-right">
                <p className="text-sm font-semibold text-gray-900">{formatMoneyFull(item.total_price)}</p>
                <p className="text-xs text-gray-400">{formatMoneyFull(item.unit_price)} × {item.quantity}</p>
              </div>
            </div>
          ))}
          <div className="flex justify-between px-4 py-3 border-t border-gray-100 bg-gray-50">
            <span className="text-sm font-semibold text-gray-700">รวมทั้งหมด</span>
            <span className="text-sm font-bold text-[#06C755]">{formatMoneyFull(sale.total_amount)}</span>
          </div>
        </div>

        {/* Slip image */}
        {sale.slip_url && (
          <div className="bg-white rounded-2xl p-4 shadow-sm">
            <p className="text-xs font-semibold text-gray-400 mb-3">สลิปโอนเงิน</p>
            <img
              src={sale.slip_url}
              alt="slip"
              className="w-full rounded-xl object-cover max-h-64"
            />
          </div>
        )}

        {/* Note */}
        {sale.note && (
          <div className="bg-white rounded-2xl p-4 shadow-sm">
            <p className="text-xs font-semibold text-gray-400 mb-1">หมายเหตุ</p>
            <p className="text-sm text-gray-700">{sale.note}</p>
          </div>
        )}
      </div>
    </div>
  )
}
