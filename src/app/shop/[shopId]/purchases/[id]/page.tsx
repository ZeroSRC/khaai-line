'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useShopStore } from '@/store/shopStore'
import { createSupabaseClient } from '@/lib/supabase'
import { formatMoneyFull, formatDateTime } from '@/lib/format'
import { useT } from '@/lib/i18n'
import type { Purchase } from '@/lib/types'

interface PurchaseItem {
  id: string; product_id: string; quantity: number
  unit_cost: number; total_cost: number
  product?: { name: string; sku: string | null }
}

const BackBtn = ({ onClick }: { onClick: () => void }) => (
  <button onClick={onClick} className="w-9 h-9 rounded-2xl bg-gray-50 flex items-center justify-center text-gray-500 active:bg-gray-100 transition-colors">
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
  </button>
)

export default function PurchaseDetailPage() {
  const { id } = useParams<{ shopId: string; id: string }>()
  const router = useRouter()
  const { shop, lineUid, jwt } = useShopStore()
  const t = useT()
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

  if (loading) return <div className="flex items-center justify-center min-h-dvh"><div className="w-8 h-8 rounded-2xl bg-[#1877F2] animate-pulse" /></div>
  if (!purchase) return <div className="flex flex-col items-center justify-center min-h-dvh gap-3 p-8 text-center"><p className="font-semibold text-gray-800">{t('detail.notFoundPurchase')}</p><button onClick={() => router.back()} className="text-sm text-[#1877F2]">{t('detail.backShort')}</button></div>

  return (
    <div className="pb-10">
      <div className="px-4 pt-8 pb-4 flex items-center gap-3">
        <BackBtn onClick={() => router.back()} />
        <div className="flex-1">
          <h1 className="text-base font-bold text-gray-900">{t('detail.purchaseTitle')}</h1>
          <p className="text-[11px] text-gray-400">{purchase.ref_number}</p>
        </div>
      </div>

      <div className="px-4 space-y-3">
        {/* Hero */}
        <div className="bg-red-500 rounded-3xl p-6 shadow-[0_8px_32px_rgba(239,68,68,0.25)]">
          <p className="text-white/70 text-xs font-semibold mb-1">{t('detail.purchaseTotal')}</p>
          <p className="text-4xl font-bold text-white tracking-tight">{formatMoneyFull(purchase.total_amount)}</p>
          <div className="flex items-center gap-2 mt-3 pt-3 border-t border-white/20">
            <div className="flex-1">
              <p className="text-white/60 text-xs">{formatDateTime(purchase.created_at)}</p>
              {purchase.supplier && <p className="text-white/80 text-xs mt-0.5">{purchase.supplier}</p>}
            </div>
            {purchase.slip_url && <span className="text-[11px] bg-white/20 text-white px-2.5 py-1 rounded-full">{t('purchases.hasSlip')}</span>}
          </div>
        </div>

        {/* Items */}
        {items.length > 0 && (
          <div className="bg-white rounded-3xl shadow-[0_2px_16px_rgba(0,0,0,0.07)] overflow-hidden">
            <p className="text-xs font-bold text-gray-400 px-4 pt-4 pb-3">{t('detail.itemsList')}</p>
            {items.map((item, i) => (
              <div key={item.id} className={`flex items-center gap-3 px-4 py-3 ${i > 0 ? 'border-t border-gray-50' : ''}`}>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900">{item.product?.name ?? t('detail.productFallback')}</p>
                  {item.product?.sku && <p className="text-xs text-gray-400">{item.product.sku}</p>}
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-gray-900">{formatMoneyFull(item.total_cost)}</p>
                  <p className="text-xs text-gray-400">{formatMoneyFull(item.unit_cost)} × {item.quantity}</p>
                </div>
              </div>
            ))}
            <div className="flex justify-between px-4 py-3 border-t border-gray-100 bg-gray-50/50">
              <span className="text-sm font-semibold text-gray-700">{t('common.total')}</span>
              <span className="text-sm font-bold text-red-500">{formatMoneyFull(purchase.total_amount)}</span>
            </div>
          </div>
        )}

        {purchase.slip_url && (
          <div className="bg-white rounded-3xl p-4 shadow-[0_2px_16px_rgba(0,0,0,0.07)]">
            <p className="text-xs font-bold text-gray-400 mb-3">{t('detail.slipTitle')}</p>
            <img src={purchase.slip_url} alt="slip" className="w-full rounded-2xl object-cover max-h-64" />
          </div>
        )}

        {purchase.note && (
          <div className="bg-white rounded-3xl p-4 shadow-[0_2px_16px_rgba(0,0,0,0.07)]">
            <p className="text-xs font-bold text-gray-400 mb-1">{t('common.note')}</p>
            <p className="text-sm text-gray-700">{purchase.note}</p>
          </div>
        )}
      </div>
    </div>
  )
}
