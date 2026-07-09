'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { useShopStore } from '@/store/shopStore'
import { createSupabaseClient } from '@/lib/supabase'
import { formatMoneyFull, formatThaiDate } from '@/lib/format'
import type { Expense, ExpenseCategory } from '@/lib/types'

const CATEGORY_MAP: Record<ExpenseCategory, { label: string; icon: string; color: string }> = {
  shipping: { label: 'ค่าขนส่ง', icon: '🚚', color: 'bg-blue-100 text-blue-700' },
  fuel:     { label: 'ค่าน้ำมัน', icon: '⛽', color: 'bg-amber-100 text-amber-700' },
  other:    { label: 'อื่นๆ',    icon: '📋', color: 'bg-gray-100 text-gray-600' },
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
      .from('expenses')
      .select('*')
      .eq('shop_id', shop.id)
      .order('expense_date', { ascending: false })
      .limit(100)
      .then(({ data }) => {
        setExpenses((data ?? []) as Expense[])
        setLoading(false)
      })
  }, [shop, lineUid])

  const filtered = filter === 'all' ? expenses : expenses.filter((e) => e.category === filter)
  const total = filtered.reduce((s, e) => s + e.amount, 0)

  return (
    <div>
      <div className="bg-white px-4 pt-12 pb-3 border-b border-gray-100 sticky top-0 z-10">
        <div className="flex items-center justify-between mb-3">
          <h1 className="text-lg font-bold">ค่าใช้จ่าย</h1>
          <Link href={`/shop/${shopId}/expenses/new`}
            className="bg-[#06C755] text-white text-sm font-semibold px-4 py-2 rounded-xl">
            + บันทึก
          </Link>
        </div>
        <div className="flex gap-2 overflow-x-auto no-scrollbar">
          {([['all', 'ทั้งหมด'], ['shipping', 'ค่าขนส่ง'], ['fuel', 'ค่าน้ำมัน'], ['other', 'อื่นๆ']] as const).map(([key, label]) => (
            <button key={key} onClick={() => setFilter(key)}
              className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap border transition-colors ${
                filter === key ? 'bg-[#06C755] text-white border-[#06C755]' : 'bg-white text-gray-500 border-gray-200'
              }`}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Total summary */}
      {!loading && filtered.length > 0 && (
        <div className="mx-4 mt-3 bg-red-50 rounded-2xl px-4 py-3 flex justify-between items-center">
          <p className="text-xs text-red-400 font-medium">{filter === 'all' ? 'รวมทั้งหมด' : `รวม${CATEGORY_MAP[filter as ExpenseCategory]?.label}`}</p>
          <p className="text-base font-bold text-red-500">{formatMoneyFull(total)}</p>
        </div>
      )}

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
            <div className="text-4xl mb-3">💸</div>
            <p className="font-medium">ยังไม่มีค่าใช้จ่าย</p>
            <p className="text-sm mt-1">กดปุ่ม "บันทึก" เพื่อเริ่มต้น</p>
          </div>
        )}

        <div className="space-y-3 pb-24">
          {filtered.map((e) => {
            const cat = CATEGORY_MAP[e.category]
            return (
              <div key={e.id} className="bg-white rounded-2xl p-4 shadow-sm border border-gray-50">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-base flex-shrink-0 ${cat.color}`}>
                      {cat.icon}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-900">{cat.label}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{formatThaiDate(e.expense_date)}</p>
                    </div>
                  </div>
                  <p className="text-base font-bold text-red-500">{formatMoneyFull(e.amount)}</p>
                </div>
                {e.note && (
                  <p className="text-xs text-gray-400 mt-2 border-t border-gray-50 pt-2">{e.note}</p>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
