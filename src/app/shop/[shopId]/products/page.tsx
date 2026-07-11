'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { useShopStore } from '@/store/shopStore'
import { createSupabaseClient } from '@/lib/supabase'
import { formatMoneyFull } from '@/lib/format'
import { useT } from '@/lib/i18n'
import type { Product } from '@/lib/types'

export default function ProductsPage() {
  const { shopId } = useParams<{ shopId: string }>()
  const { shop, lineUid, jwt } = useShopStore()
  const t = useT()
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'serial' | 'low_stock'>('all')
  const [search, setSearch] = useState('')

  useEffect(() => {
    if (!shop || !lineUid) return
    createSupabaseClient(jwt ?? undefined)
      .from('products').select('*').eq('shop_id', shop.id).order('created_at', { ascending: false })
      .then(({ data }) => { setProducts((data ?? []) as Product[]); setLoading(false) })
  }, [shop, lineUid])

  const filtered = products.filter((p) => {
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase()) || p.sku?.toLowerCase().includes(search.toLowerCase())
    if (filter === 'serial') return matchSearch && p.has_serial
    if (filter === 'low_stock') return matchSearch && p.stock < 3
    return matchSearch
  })

  return (
    <div className="pb-32">
      <div className="px-4 pt-8 pb-4 flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">{t('products.title')}</h1>
        <Link href={`/shop/${shopId}/products/new`}
          className="bg-[#1877F2] text-white text-sm font-semibold px-4 py-2.5 rounded-2xl shadow-[0_4px_12px_rgba(24,119,242,0.35)] active:scale-95 transition-transform">
          {t('products.newBtn')}
        </Link>
      </div>

      {/* Search */}
      <div className="px-4 mb-3">
        <div className="flex items-center gap-2 bg-white rounded-2xl px-4 py-3 shadow-[0_2px_8px_rgba(0,0,0,0.06)]">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input className="flex-1 bg-transparent text-sm focus:outline-none placeholder:text-gray-400"
            placeholder={t('products.search')}
            value={search} onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Filter pills */}
      <div className="flex gap-2 px-4 mb-3 overflow-x-auto no-scrollbar">
        {([['all', t('products.filterAll')], ['serial', t('products.filterSerial')], ['low_stock', t('products.filterLow')]] as const).map(([key, label]) => (
          <button key={key} onClick={() => setFilter(key)}
            className={`px-4 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap flex-shrink-0 transition-colors ${filter === key ? 'bg-[#1877F2] text-white' : 'bg-white text-gray-400 shadow-[0_1px_4px_rgba(0,0,0,0.08)]'}`}>
            {label}
          </button>
        ))}
      </div>

      <div className="px-4 space-y-3">
        {loading && [1,2,3].map(i => <div key={i} className="h-20 bg-white rounded-3xl animate-pulse shadow-[0_2px_12px_rgba(0,0,0,0.06)]" />)}

        {!loading && filtered.length === 0 && (
          <div className="text-center py-20">
            <div className="w-20 h-20 bg-gray-100 rounded-3xl mx-auto mb-4 flex items-center justify-center">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 002 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/></svg>
            </div>
            <p className="font-semibold text-gray-700">{t('products.empty')}</p>
            <p className="text-sm text-gray-400 mt-1">{t('products.emptyHint')}</p>
          </div>
        )}

        {filtered.map((p) => (
          <Link key={p.id} href={`/shop/${shopId}/products/${p.id}`}
            className="bg-white rounded-3xl p-4 flex gap-3 shadow-[0_2px_12px_rgba(0,0,0,0.07)] active:scale-[0.98] transition-transform block">
            <div className="w-12 h-12 rounded-2xl bg-gray-100 flex items-center justify-center flex-shrink-0 overflow-hidden">
              {p.image_url
                ? <img src={p.image_url} className="w-full h-full object-cover" alt="" />
                : <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 002 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/></svg>
              }
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-gray-900 truncate">{p.name}</p>
              {p.sku && <p className="text-[10px] text-gray-400">{p.sku}</p>}
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-sm font-bold text-[#1877F2]">{formatMoneyFull(p.sell_price)}</span>
                <span className="text-[10px] text-gray-400">{t('products.cost', { v: formatMoneyFull(p.cost_price) })}</span>
              </div>
              <div className="flex gap-1.5 mt-1.5 flex-wrap">
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${p.stock === 0 ? 'bg-red-100 text-red-600' : p.stock < 3 ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'}`}>
                  {t('products.pcs', { n: p.stock })}
                </span>
                {p.has_serial && <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 font-semibold">S/N</span>}
                {p.warranty_days > 0 && <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 font-semibold">{t('products.days', { n: p.warranty_days })}</span>}
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
