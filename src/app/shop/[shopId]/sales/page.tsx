'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { useShopStore } from '@/store/shopStore'
import { createSupabaseClient } from '@/lib/supabase'
import { MonthFilter, monthRange } from '@/components/MonthFilter'
import dayjs from 'dayjs'
import { formatMoneyFull, formatDateTime } from '@/lib/format'
import { useT } from '@/lib/i18n'
import type { Sale } from '@/lib/types'

export default function SalesPage() {
  const { shopId } = useParams<{ shopId: string }>()
  const { shop, lineUid, jwt } = useShopStore()
  const t = useT()
  const [sales, setSales] = useState<Sale[]>([])
  const [loading, setLoading] = useState(true)
  const [month, setMonth] = useState(dayjs().format('YYYY-MM'))

  useEffect(() => {
    if (!shop || !lineUid) return
    setLoading(true)
    const { start, end } = monthRange(month)
    createSupabaseClient(jwt ?? undefined)
      // Pull the line items too — the card leads with what was sold, not the ref number.
      .from('sales').select('*, customer:customers(name), items:sale_items(quantity, product:products(name))')
      .eq('shop_id', shop.id)
      .gte('created_at', start).lte('created_at', end)
      .order('created_at', { ascending: false }).limit(50)
      .then(({ data }) => { setSales((data ?? []) as Sale[]); setLoading(false) })
  }, [shop, lineUid, month])

  /** "Maono pd300x" · "Maono pd300x +2 รายการ" · falls back to the generic word. */
  const itemsLabel = (sale: Sale) => {
    const items = sale.items ?? []
    const first = (items[0]?.product as any)?.name
    if (!first) return t('sales.order')
    return items.length > 1
      ? `${first} ${t('common.moreItems', { n: items.length - 1 })}`
      : first
  }

  return (
    <div className="pb-32">
      <div className="px-4 pt-8 pb-4 flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">{t('sales.title')}</h1>
        <Link href={`/shop/${shopId}/sales/new`}
          className="bg-[#1877F2] text-white text-sm font-semibold px-4 py-2.5 rounded-2xl shadow-[0_4px_12px_rgba(24,119,242,0.35)] active:scale-95 transition-transform">
          {t('sales.newBtn')}
        </Link>
      </div>

      <div className="px-4 mb-3">
        <MonthFilter month={month} onChange={setMonth} />
      </div>

      <div className="px-4 space-y-3">
        {loading && [1,2,3].map(i => <div key={i} className="h-20 bg-white rounded-3xl animate-pulse shadow-[0_2px_12px_rgba(0,0,0,0.06)]" />)}

        {!loading && sales.length === 0 && (
          <div className="text-center py-20">
            <div className="w-20 h-20 bg-gray-100 rounded-3xl mx-auto mb-4 flex items-center justify-center">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20M6 15h4M14 15h4"/></svg>
            </div>
            <p className="font-semibold text-gray-700">{t('sales.empty')}</p>
            <p className="text-sm text-gray-400 mt-1">{t('sales.emptyHint')}</p>
          </div>
        )}

        {sales.map((sale) => (
          <Link key={sale.id} href={`/shop/${shopId}/sales/${sale.id}`}
            className="block bg-white rounded-3xl p-4 shadow-[0_2px_12px_rgba(0,0,0,0.07)] active:scale-[0.98] transition-transform">
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-gray-900 truncate">{itemsLabel(sale)}</p>
                <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                  {sale.ref_number && (
                    <span className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-md font-medium tracking-tight">
                      {sale.ref_number}
                    </span>
                  )}
                  {sale.slip_url && <span className="text-[10px] bg-green-50 text-green-600 px-2 py-0.5 rounded-full font-semibold">{t('sales.hasSlip')}</span>}
                </div>
                <p className="text-[11px] text-gray-300 mt-1 truncate">
                  {(sale.customer as any)?.name ?? t('sales.generalCustomer')} · {formatDateTime(sale.created_at)}
                </p>
              </div>
              <div className="text-right ml-3">
                <p className="text-base font-bold text-[#1877F2]">{formatMoneyFull(sale.total_amount)}</p>
                {sale.slip_type && (
                  <p className="text-[10px] text-gray-400 mt-0.5">
                    {sale.slip_type === 'transfer' ? t('sales.transfer') : t('sales.cash')}
                  </p>
                )}
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
