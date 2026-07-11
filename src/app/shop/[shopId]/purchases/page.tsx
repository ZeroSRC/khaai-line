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
  const thaiMonths = ['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.']
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
      .from('purchases').select('*').eq('shop_id', shop.id)
      .order('created_at', { ascending: false }).limit(200)
      .then(({ data }) => { setPurchases((data ?? []) as Purchase[]); setLoading(false) })
  }, [shop, lineUid])

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
    <div className="pb-32">
      <div className="px-4 pt-12 pb-4 flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">ประวัติการซื้อ</h1>
        <Link href={`/shop/${shopId}/purchases/new`}
          className="bg-blue-500 text-white text-sm font-semibold px-4 py-2.5 rounded-2xl shadow-[0_4px_12px_rgba(59,130,246,0.35)] active:scale-95 transition-transform">
          + บันทึกซื้อ
        </Link>
      </div>

      {/* Month filter */}
      {months.length > 0 && (
        <div className="flex gap-2 px-4 overflow-x-auto no-scrollbar pb-3">
          <button onClick={() => setSelectedMonth('all')}
            className={`px-4 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap flex-shrink-0 transition-colors ${selectedMonth === 'all' ? 'bg-[#1877F2] text-white' : 'bg-white text-gray-400 shadow-[0_1px_4px_rgba(0,0,0,0.08)]'}`}>
            ทั้งหมด
          </button>
          {months.map((m) => (
            <button key={m} onClick={() => setSelectedMonth(m)}
              className={`px-4 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap flex-shrink-0 transition-colors ${selectedMonth === m ? 'bg-[#1877F2] text-white' : 'bg-white text-gray-400 shadow-[0_1px_4px_rgba(0,0,0,0.08)]'}`}>
              {formatMonthLabel(m)}
            </button>
          ))}
        </div>
      )}

      <div className="px-4 space-y-3">
        {loading && [1,2,3].map(i => <div key={i} className="h-20 bg-white rounded-3xl animate-pulse shadow-[0_2px_12px_rgba(0,0,0,0.06)]" />)}

        {!loading && filtered.length === 0 && (
          <div className="text-center py-20">
            <div className="w-20 h-20 bg-gray-100 rounded-3xl mx-auto mb-4 flex items-center justify-center">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 002 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>
            </div>
            <p className="font-semibold text-gray-700">{selectedMonth === 'all' ? 'ยังไม่มีรายการซื้อ' : 'ไม่มีรายการในเดือนนี้'}</p>
            <p className="text-sm text-gray-400 mt-1">{selectedMonth === 'all' ? 'กดปุ่ม "บันทึกซื้อ" เพื่อเริ่มต้น' : ''}</p>
          </div>
        )}

        {!loading && filtered.length > 0 && (
          <div className="flex items-center justify-between px-1 mb-1">
            <p className="text-xs text-gray-400">{filtered.length} รายการ</p>
            <p className="text-sm font-bold text-red-500">{formatMoneyFull(filteredTotal)}</p>
          </div>
        )}

        {filtered.map((p) => (
          <Link key={p.id} href={`/shop/${shopId}/purchases/${p.id}`}
            className="block bg-white rounded-3xl p-4 shadow-[0_2px_12px_rgba(0,0,0,0.07)] active:scale-[0.98] transition-transform">
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-gray-900">{p.ref_number ?? 'ใบซื้อ'}</p>
                <p className="text-xs text-gray-400 mt-0.5">{p.supplier ?? 'ไม่ระบุซัพพลายเออร์'}</p>
                <p className="text-[11px] text-gray-300 mt-0.5">{formatDateTime(p.created_at)}</p>
              </div>
              <div className="text-right ml-3">
                <p className="text-base font-bold text-red-500">{formatMoneyFull(p.total_amount)}</p>
                {p.slip_url && <span className="text-[10px] bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full font-semibold">มีสลิป</span>}
              </div>
            </div>
            {p.note && <p className="text-xs text-gray-400 mt-2 pt-2 border-t border-gray-50 truncate">{p.note}</p>}
          </Link>
        ))}
      </div>
    </div>
  )
}
