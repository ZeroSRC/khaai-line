'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { useShopStore } from '@/store/shopStore'
import { createSupabaseClient } from '@/lib/supabase'
import { formatMoneyFull, formatDateTime } from '@/lib/format'
import type { Purchase } from '@/lib/types'

export default function PurchasesPage() {
  const { shopId } = useParams<{ shopId: string }>()
  const { shop, lineUid } = useShopStore()
  const [purchases, setPurchases] = useState<Purchase[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!shop || !lineUid) return
    createSupabaseClient(lineUid)
      .from('purchases')
      .select('*')
      .eq('shop_id', shop.id)
      .order('created_at', { ascending: false })
      .limit(50)
      .then(({ data }) => {
        setPurchases((data ?? []) as Purchase[])
        setLoading(false)
      })
  }, [shop, lineUid])

  return (
    <div>
      <div className="bg-white px-4 pt-12 pb-4 border-b border-gray-100 flex items-center justify-between sticky top-0 z-10">
        <h1 className="text-lg font-bold">ประวัติการซื้อ</h1>
        <a href={`/shop/${shopId}/purchases/new`}
          className="bg-[#06C755] text-white text-sm font-semibold px-4 py-2 rounded-xl">
          + บันทึกซื้อ
        </a>
      </div>

      <div className="px-4 pt-3">
        {loading && (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 bg-gray-100 rounded-2xl animate-pulse" />
            ))}
          </div>
        )}

        {!loading && purchases.length === 0 && (
          <div className="text-center py-16 text-gray-400">
            <div className="text-4xl mb-3">📦</div>
            <p className="font-medium">ยังไม่มีรายการซื้อ</p>
            <p className="text-sm mt-1">กดปุ่ม "บันทึกซื้อ" เพื่อเริ่มต้น</p>
          </div>
        )}

        <div className="space-y-3">
          {purchases.map((p) => (
            <Link key={p.id} href={`/shop/${shopId}/purchases/${p.id}`} className="block bg-white rounded-2xl p-4 shadow-sm border border-gray-50 active:bg-gray-50">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-semibold text-gray-900">
                    {p.ref_number ?? 'ใบซื้อ'}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {p.supplier ?? 'ไม่ระบุซัพพลายเออร์'}
                  </p>
                  <p className="text-xs text-gray-300 mt-0.5">{formatDateTime(p.created_at)}</p>
                </div>
                <div className="text-right">
                  <p className="text-base font-bold text-red-500">{formatMoneyFull(p.total_amount)}</p>
                  {p.slip_url && (
                    <span className="text-[10px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">
                      มีสลิป
                    </span>
                  )}
                </div>
              </div>
              {p.note && (
                <p className="text-xs text-gray-400 mt-2 border-t border-gray-50 pt-2">{p.note}</p>
              )}
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
