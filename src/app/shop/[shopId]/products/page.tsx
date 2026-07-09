'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { useShopStore } from '@/store/shopStore'
import { createSupabaseClient } from '@/lib/supabase'
import { formatMoneyFull } from '@/lib/format'
import type { Product } from '@/lib/types'

export default function ProductsPage() {
  const { shopId } = useParams<{ shopId: string }>()
  const { shop, lineUid, jwt } = useShopStore()
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'serial' | 'low_stock'>('all')
  const [search, setSearch] = useState('')

  useEffect(() => {
    if (!shop || !lineUid) return
    createSupabaseClient(jwt ?? undefined)
      .from('products')
      .select('*')
      .eq('shop_id', shop.id)
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        setProducts((data ?? []) as Product[])
        setLoading(false)
      })
  }, [shop, lineUid])

  const filtered = products.filter((p) => {
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase()) || p.sku?.toLowerCase().includes(search.toLowerCase())
    if (filter === 'serial') return matchSearch && p.has_serial
    if (filter === 'low_stock') return matchSearch && p.stock < 3
    return matchSearch
  })

  return (
    <div>
      <div className="bg-white px-4 pt-12 pb-3 border-b border-gray-100 sticky top-0 z-10">
        <div className="flex items-center justify-between mb-3">
          <h1 className="text-lg font-bold">สินค้าทั้งหมด</h1>
          <Link href={`/shop/${shopId}/products/new`}
            className="bg-[#06C755] text-white text-sm font-semibold px-4 py-2 rounded-xl">
            + เพิ่มสินค้า
          </Link>
        </div>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300">🔍</span>
          <input
            className="w-full border border-gray-200 rounded-xl pl-9 pr-4 py-2.5 text-sm"
            placeholder="ค้นหาสินค้า หรือ SKU..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex gap-2 mt-2 overflow-x-auto no-scrollbar">
          {([['all', 'ทั้งหมด'], ['serial', 'มี S/N'], ['low_stock', 'สต็อกต่ำ']] as const).map(([key, label]) => (
            <button key={key} onClick={() => setFilter(key)}
              className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap border transition-colors ${
                filter === key ? 'bg-[#06C755] text-white border-[#06C755]' : 'bg-white text-gray-500 border-gray-200'
              }`}>
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="px-4 pt-3">
        <p className="text-xs text-gray-400 mb-2 font-medium">สินค้าทั้งหมด ({filtered.length})</p>

        {loading && <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-20 bg-gray-100 rounded-2xl animate-pulse" />)}</div>}

        <div className="space-y-3">
          {filtered.map((p) => (
            <Link key={p.id} href={`/shop/${shopId}/products/${p.id}`}
              className="bg-white rounded-2xl p-3 shadow-sm flex gap-3 border border-gray-50">
              <div className="w-11 h-11 rounded-xl bg-gray-100 flex items-center justify-center text-2xl flex-shrink-0">
                {p.image_url ? <img src={p.image_url} className="w-full h-full rounded-xl object-cover" alt="" /> : '📦'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900 truncate">{p.name}</p>
                {p.sku && <p className="text-[10px] text-gray-400">{p.sku}</p>}
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-sm font-bold text-[#06C755]">{formatMoneyFull(p.sell_price)}</span>
                  <span className="text-[10px] text-gray-400">ต้นทุน {formatMoneyFull(p.cost_price)}</span>
                </div>
                <div className="flex gap-1 mt-1.5 flex-wrap">
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                    p.stock === 0 ? 'bg-red-100 text-red-600' :
                    p.stock < 3 ? 'bg-amber-100 text-amber-700' :
                    'bg-green-100 text-green-700'
                  }`}>
                    {p.stock} ชิ้น
                  </span>
                  {p.has_serial && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-purple-100 text-purple-700 font-medium">S/N</span>}
                  {p.warranty_days > 0 && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-700 font-medium">{p.warranty_days}วัน</span>}
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
