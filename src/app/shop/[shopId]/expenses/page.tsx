'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { useShopStore } from '@/store/shopStore'
import { createSupabaseClient } from '@/lib/supabase'
import { formatMoneyFull, formatThaiDate } from '@/lib/format'
import type { Expense, ExpenseCategory } from '@/lib/types'

const CATEGORY_MAP: Record<ExpenseCategory, { label: string; color: string; icon: JSX.Element }> = {
  shipping: {
    label: 'ค่าขนส่ง', color: 'bg-blue-50 text-blue-500',
    icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M1 3h15v13H1zM16 8h4l3 3v5h-7V8z"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>,
  },
  fuel: {
    label: 'ค่าน้ำมัน', color: 'bg-amber-50 text-amber-500',
    icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M4 2h10l2 4H4zM4 6v14a2 2 0 002 2h8a2 2 0 002-2V6"/><path d="M8 6v4M12 6v4"/><path d="M19 7l1 1v6l-1 1M19 7l2 1M19 14l2 1"/></svg>,
  },
  other: {
    label: 'อื่นๆ', color: 'bg-gray-100 text-gray-500',
    icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>,
  },
}

export default function ExpensesPage() {
  const { shopId } = useParams<{ shopId: string }>()
  const { shop, lineUid, jwt } = useShopStore()
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | ExpenseCategory>('all')

  useEffect(() => {
    if (!shop || !lineUid) return
    createSupabaseClient(jwt ?? undefined)
      .from('expenses').select('*').eq('shop_id', shop.id)
      .order('expense_date', { ascending: false }).limit(100)
      .then(({ data }) => { setExpenses((data ?? []) as Expense[]); setLoading(false) })
  }, [shop, lineUid])

  const filtered = filter === 'all' ? expenses : expenses.filter((e) => e.category === filter)
  const total = filtered.reduce((s, e) => s + e.amount, 0)

  return (
    <div className="pb-32">
      <div className="px-4 pt-12 pb-4 flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">ค่าใช้จ่าย</h1>
        <Link href={`/shop/${shopId}/expenses/new`}
          className="bg-red-500 text-white text-sm font-semibold px-4 py-2.5 rounded-2xl shadow-[0_4px_12px_rgba(239,68,68,0.35)] active:scale-95 transition-transform">
          + บันทึก
        </Link>
      </div>

      {/* Filter */}
      <div className="flex gap-2 px-4 mb-3 overflow-x-auto no-scrollbar">
        {([['all', 'ทั้งหมด'], ['shipping', 'ค่าขนส่ง'], ['fuel', 'ค่าน้ำมัน'], ['other', 'อื่นๆ']] as const).map(([key, label]) => (
          <button key={key} onClick={() => setFilter(key)}
            className={`px-4 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap flex-shrink-0 transition-colors ${filter === key ? 'bg-[#06C755] text-white' : 'bg-white text-gray-400 shadow-[0_1px_4px_rgba(0,0,0,0.08)]'}`}>
            {label}
          </button>
        ))}
      </div>

      {!loading && filtered.length > 0 && (
        <div className="mx-4 mb-3 bg-red-50 rounded-3xl px-4 py-3 flex justify-between items-center">
          <p className="text-xs text-red-400 font-semibold">{filter === 'all' ? 'รวมทั้งหมด' : `รวม${CATEGORY_MAP[filter as ExpenseCategory]?.label}`}</p>
          <p className="text-base font-bold text-red-500">{formatMoneyFull(total)}</p>
        </div>
      )}

      <div className="px-4 space-y-3">
        {loading && [1,2,3].map(i => <div key={i} className="h-20 bg-white rounded-3xl animate-pulse shadow-[0_2px_12px_rgba(0,0,0,0.06)]" />)}

        {!loading && filtered.length === 0 && (
          <div className="text-center py-20">
            <div className="w-20 h-20 bg-gray-100 rounded-3xl mx-auto mb-4 flex items-center justify-center">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg>
            </div>
            <p className="font-semibold text-gray-700">ยังไม่มีค่าใช้จ่าย</p>
            <p className="text-sm text-gray-400 mt-1">กดปุ่ม "+ บันทึก" เพื่อเริ่มต้น</p>
          </div>
        )}

        {filtered.map((e) => {
          const cat = CATEGORY_MAP[e.category]
          return (
            <div key={e.id} className="bg-white rounded-3xl p-4 shadow-[0_2px_12px_rgba(0,0,0,0.07)]">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0 ${cat.color}`}>{cat.icon}</div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{cat.label}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{formatThaiDate(e.expense_date)}</p>
                  </div>
                </div>
                <p className="text-base font-bold text-red-500">{formatMoneyFull(e.amount)}</p>
              </div>
              {e.note && <p className="text-xs text-gray-400 mt-2.5 pt-2.5 border-t border-gray-50">{e.note}</p>}
            </div>
          )
        })}
      </div>
    </div>
  )
}
