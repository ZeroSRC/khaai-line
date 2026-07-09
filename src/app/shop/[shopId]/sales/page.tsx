'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { useShopStore } from '@/store/shopStore'
import { createSupabaseClient } from '@/lib/supabase'
import { formatMoneyFull, formatDateTime } from '@/lib/format'
import type { Sale } from '@/lib/types'

export default function SalesPage() {
  const { shopId } = useParams<{ shopId: string }>()
  const { shop, lineUid, jwt } = useShopStore()
  const [sales, setSales] = useState<Sale[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!shop || !lineUid) return
    createSupabaseClient(jwt ?? undefined)
      .from('sales').select('*, customer:customers(name)')
      .eq('shop_id', shop.id).order('created_at', { ascending: false }).limit(50)
      .then(({ data }) => { setSales((data ?? []) as Sale[]); setLoading(false) })
  }, [shop, lineUid])

  return (
    <div className="pb-32">
      <div className="px-4 pt-12 pb-4 flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">ประวัติการขาย</h1>
        <Link href={`/shop/${shopId}/sales/new`}
          className="bg-[#06C755] text-white text-sm font-semibold px-4 py-2.5 rounded-2xl shadow-[0_4px_12px_rgba(6,199,85,0.35)] active:scale-95 transition-transform">
          + บันทึกขาย
        </Link>
      </div>

      <div className="px-4 space-y-3">
        {loading && [1,2,3].map(i => <div key={i} className="h-20 bg-white rounded-3xl animate-pulse shadow-[0_2px_12px_rgba(0,0,0,0.06)]" />)}

        {!loading && sales.length === 0 && (
          <div className="text-center py-20">
            <div className="w-20 h-20 bg-gray-100 rounded-3xl mx-auto mb-4 flex items-center justify-center">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20M6 15h4M14 15h4"/></svg>
            </div>
            <p className="font-semibold text-gray-700">ยังไม่มีรายการขาย</p>
            <p className="text-sm text-gray-400 mt-1">กดปุ่ม "บันทึกขาย" เพื่อเริ่มต้น</p>
          </div>
        )}

        {sales.map((sale) => (
          <Link key={sale.id} href={`/shop/${shopId}/sales/${sale.id}`}
            className="block bg-white rounded-3xl p-4 shadow-[0_2px_12px_rgba(0,0,0,0.07)] active:scale-[0.98] transition-transform">
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-sm font-bold text-gray-900">{sale.ref_number ?? 'ออเดอร์'}</span>
                  {sale.slip_url && <span className="text-[10px] bg-green-50 text-green-600 px-2 py-0.5 rounded-full font-semibold">มีสลิป</span>}
                </div>
                <p className="text-xs text-gray-400">{(sale.customer as any)?.name ?? 'ลูกค้าทั่วไป'}</p>
                <p className="text-[11px] text-gray-300 mt-0.5">{formatDateTime(sale.created_at)}</p>
              </div>
              <div className="text-right ml-3">
                <p className="text-base font-bold text-[#06C755]">{formatMoneyFull(sale.total_amount)}</p>
                {sale.slip_type && (
                  <p className="text-[10px] text-gray-400 mt-0.5">
                    {sale.slip_type === 'transfer' ? 'โอนเงิน' : 'เงินสด'}
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
