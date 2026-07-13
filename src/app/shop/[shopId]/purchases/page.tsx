'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { useShopStore } from '@/store/shopStore'
import { createSupabaseClient } from '@/lib/supabase'
import { formatMoneyFull, formatDateTime } from '@/lib/format'
import { useT } from '@/lib/i18n'
import { MonthFilter, monthRange } from '@/components/MonthFilter'
import dayjs from 'dayjs'
import type { Purchase } from '@/lib/types'

export default function PurchasesPage() {
  const { shopId } = useParams<{ shopId: string }>()
  const { shop, lineUid, jwt } = useShopStore()
  const t = useT()
  const [purchases, setPurchases] = useState<Purchase[]>([])
  const [loading, setLoading] = useState(true)
  const [month, setMonth] = useState(dayjs().format('YYYY-MM'))

  useEffect(() => {
    if (!shop || !lineUid) return
    setLoading(true)
    const { start, end } = monthRange(month)
    createSupabaseClient(jwt ?? undefined)
      // Pull the line items too — the card leads with what was bought, not the ref number.
      .from('purchases').select('*, items:purchase_items(quantity, product:products(name))')
      .eq('shop_id', shop.id)
      .gte('created_at', start).lte('created_at', end)
      .order('created_at', { ascending: false }).limit(200)
      .then(({ data }) => { setPurchases((data ?? []) as Purchase[]); setLoading(false) })
  }, [shop, lineUid, month])

  const itemsLabel = (p: Purchase) => {
    const items = (p as any).items ?? []
    const first = items[0]?.product?.name
    if (!first) return t('purchases.refDefault')
    return items.length > 1
      ? `${first} ${t('common.moreItems', { n: items.length - 1 })}`
      : first
  }

  // Filtering now happens in the query, so the list IS the month.
  const filtered = purchases
  const filteredTotal = filtered.reduce((s, p) => s + Number(p.total_amount), 0)

  return (
    <div className="pb-32">
      <div className="px-4 pt-8 pb-4 flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">{t('purchases.title')}</h1>
        <Link href={`/shop/${shopId}/purchases/new`}
          className="bg-indigo-500 text-white text-sm font-semibold px-4 py-2.5 rounded-2xl shadow-[0_4px_12px_rgba(79,70,229,0.35)] active:scale-95 transition-transform">
          {t('purchases.newBtn')}
        </Link>
      </div>

      <div className="px-4 mb-3">
        <MonthFilter month={month} onChange={setMonth} />
      </div>

      <div className="px-4 space-y-3">
        {loading && [1,2,3].map(i => <div key={i} className="h-20 bg-white rounded-3xl animate-pulse shadow-[0_2px_12px_rgba(0,0,0,0.06)]" />)}

        {!loading && filtered.length === 0 && (
          <div className="text-center py-20">
            <div className="w-20 h-20 bg-gray-100 rounded-3xl mx-auto mb-4 flex items-center justify-center">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 002 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>
            </div>
            <p className="font-semibold text-gray-700">{t('purchases.emptyMonth')}</p>
          </div>
        )}

        {!loading && filtered.length > 0 && (
          <div className="flex items-center justify-between px-1 mb-1">
            <p className="text-xs text-gray-400">{t('purchases.itemsCount', { n: filtered.length })}</p>
            <p className="text-sm font-bold text-red-500">{formatMoneyFull(filteredTotal)}</p>
          </div>
        )}

        {filtered.map((p) => (
          <Link key={p.id} href={`/shop/${shopId}/purchases/${p.id}`}
            className="block bg-white rounded-3xl p-4 shadow-[0_2px_12px_rgba(0,0,0,0.07)] active:scale-[0.98] transition-transform">
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-gray-900 truncate">{itemsLabel(p)}</p>
                <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                  {p.ref_number && (
                    <span className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-md font-medium tracking-tight">
                      {p.ref_number}
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-gray-300 mt-1 truncate">
                  {p.supplier ?? t('purchases.noSupplier')} · {formatDateTime(p.created_at)}
                </p>
              </div>
              <div className="text-right ml-3">
                <p className="text-base font-bold text-red-500">{formatMoneyFull(p.total_amount)}</p>
                {p.slip_url && <span className="text-[10px] bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-full font-semibold">{t('purchases.hasSlip')}</span>}
              </div>
            </div>
            {p.note && <p className="text-xs text-gray-400 mt-2 pt-2 border-t border-gray-50 truncate">{p.note}</p>}
          </Link>
        ))}
      </div>
    </div>
  )
}
