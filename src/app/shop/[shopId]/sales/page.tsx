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
    const sb = createSupabaseClient(jwt ?? undefined)
    sb.from('sales')
      .select('*, customer:customers(name, is_vip)')
      .eq('shop_id', shop.id)
      .order('created_at', { ascending: false })
      .limit(50)
      .then(({ data }) => {
        setSales((data ?? []) as Sale[])
        setLoading(false)
      })
  }, [shop, lineUid])

  return (
    <div>
      <div className="bg-white px-4 pt-12 pb-4 border-b border-gray-100 flex items-center justify-between sticky top-0 z-10">
        <h1 className="text-lg font-bold">ประวัติการขาย</h1>
        <Link href={`/shop/${shopId}/sales/new`}
          className="bg-[#06C755] text-white text-sm font-semibold px-4 py-2 rounded-xl">
          + บันทึกขาย
        </Link>
      </div>

      <div className="px-4 pt-3">
        {loading && (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 bg-gray-100 rounded-2xl animate-pulse" />
            ))}
          </div>
        )}

        {!loading && sales.length === 0 && (
          <div className="text-center py-16 text-gray-400">
            <div className="text-4xl mb-3">💰</div>
            <p className="font-medium">ยังไม่มีรายการขาย</p>
            <p className="text-sm mt-1">กดปุ่ม "บันทึกขาย" เพื่อเริ่มต้น</p>
          </div>
        )}

        <div className="space-y-3">
          {sales.map((sale) => (
            <Link key={sale.id} href={`/shop/${shopId}/sales/${sale.id}`}
              className="bg-white rounded-2xl p-4 shadow-sm block border border-gray-50">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-gray-900">
                      {sale.ref_number ?? 'ออเดอร์'}
                    </span>
                    {sale.slip_url && (
                      <span className="text-[10px] bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">
                        มีสลิป
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {(sale.customer as any)?.name ?? 'ลูกค้าทั่วไป'}
                  </p>
                  <p className="text-xs text-gray-300 mt-0.5">{formatDateTime(sale.created_at)}</p>
                </div>
                <div className="text-right">
                  <p className="text-base font-bold text-[#06C755]">{formatMoneyFull(sale.total_amount)}</p>
                  {sale.slip_type && (
                    <p className="text-[10px] text-gray-400">
                      {sale.slip_type === 'transfer' ? '💳 โอน' : '💵 เงินสด'}
                    </p>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
