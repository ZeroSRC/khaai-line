'use client'

import { useEffect, useState, useMemo } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { useShopStore } from '@/store/shopStore'
import { createSupabaseClient } from '@/lib/supabase'
import { formatMoneyFull, formatDateTime } from '@/lib/format'
import type { Purchase } from '@/lib/types'

function getMonthKey(dateStr: string) {
  const d = new Date(dateStr)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

function formatMonthLabel(key: string) {
  const [year, month] = key.split('-').map(Number)
  const thaiMonths = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.']
  return `${thaiMonths[month - 1]} ${year + 543}`
}

export default function PurchasesPage() {
  const { shopId } = useParams<{ shopId: string }>()
  const { shop, lineUid, jwt } = useShopStore()
  const [purchases, setPurchases] = useState<Purchase[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedMonth, setSelectedMonth] = useState<string>('all')

  useEffect(() => {
    if (!shop || !lineUid) return
    createSupabaseClient(jwt ?? undefined)
      .from('purchases')
      .select('*')
      .eq('shop_id', shop.id)
      .order('created_at', { ascending: false })
      .limit(200)
      .then(({ data }) => {
        setPurchases((data ?? []) as Purchase[])
        setLoading(false)
      })
  }, [shop, lineUid])

  // สร้าง list เดือนจากข้อมูลจริง
  const months = useMemo(() => {
    const keys = Array.from(new Set(purchases.map((p) => getMonthKey(p.created_at))))
    return keys.sort((a, b) => b.localeCompare(a))
  }, [purchases])

  const filtered = useMemo(() => {
    if (selectedMonth === 'all') return purchases
    return purchases.filter((p) => getMonthKey(p.created_at) === selectedMonth)
  }, [purchases, selectedMonth])

  const filteredTotal = filtered.reduce((s, p) => s + Number(p.total_amount), 0)

  return (
    <div>
      <div className="bg-white px-4 pt-12 pb-3 border-b border-gray-100 sticky top-0 z-10">
        <div className="flex items-center justify-between mb-3">
          <h1 className="text-lg font-bold">ประวัติการซื้อ</h1>
          <Link href={`/shop/${shopId}/purchases/new`}
            className="bg-[#06C755] text-white text-sm font-semibold px-4 py-2 rounded-xl">
            + บันทึกซื้อ
          </Link>
        </div>

        {/* Month filter */}
        {months.length > 0 && (
          <div className="flex gap-2 overflow-x-auto no-scrollbar pb-0.5">
            <button
              onClick={() => setSelectedMonth('all')}
              className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap border transition-colors flex-shrink-0 ${
                selectedMonth === 'all'
                  ? 'bg-[#06C755] text-white border-[#06C755]'
                  : 'bg-white text-gray-500 border-gray-200'
              }`}>
              ทั้งหมด
            </button>
            {months.map((m) => (
              <button key={m}
                onClick={() => setSelectedMonth(m)}
                className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap border transition-colors flex-shrink-0 ${
                  selectedMonth === m
                    ? 'bg-[#06C755] text-white border-[#06C755]'
                    : 'bg-white text-gray-500 border-gray-200'
                }`}>
                {formatMonthLabel(m)}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="px-4 pt-3">
        {loading && (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 bg-gray-100 rounded-2xl animate-pulse" />
            ))}
          </div>
        )}

        {!loading && filtered.length === 0 && (
          <div className="text-center py-16 text-gray-400">
            <div className="text-4xl mb-3">📦</div>
            <p className="font-medium">
              {selectedMonth === 'all' ? 'ยังไม่มีรายการซื้อ' : 'ไม่มีรายการในเดือนนี้'}
            </p>
            {selectedMonth === 'all' && (
              <p className="text-sm mt-1">กดปุ่ม "บันทึกซื้อ" เพื่อเริ่มต้น</p>
            )}
          </div>
        )}

        {/* Summary bar */}
        {!loading && filtered.length > 0 && (
          <div className="flex items-center justify-between mb-3 px-1">
            <p className="text-xs text-gray-400">{filtered.length} รายการ</p>
            <p className="text-sm font-bold text-red-500">{formatMoneyFull(filteredTotal)}</p>
          </div>
        )}

        <div className="space-y-3 pb-6">
          {filtered.map((p) => (
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
