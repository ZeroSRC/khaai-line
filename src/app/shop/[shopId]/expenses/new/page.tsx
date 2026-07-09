'use client'

import { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useShopStore } from '@/store/shopStore'
import { createSupabaseClient } from '@/lib/supabase'
import type { ExpenseCategory } from '@/lib/types'
import dayjs from 'dayjs'

const CATEGORIES: { value: ExpenseCategory; label: string; icon: string }[] = [
  { value: 'shipping', label: 'ค่าขนส่ง', icon: '🚚' },
  { value: 'fuel', label: 'ค่าน้ำมัน', icon: '⛽' },
  { value: 'other', label: 'อื่นๆ', icon: '📋' },
]

export default function NewExpensePage() {
  const { shopId } = useParams<{ shopId: string }>()
  const router = useRouter()
  const { shop, lineUid, jwt } = useShopStore()

  const [category, setCategory] = useState<ExpenseCategory>('other')
  const [amount, setAmount] = useState('')
  const [note, setNote] = useState('')
  const [date, setDate] = useState(dayjs().format('YYYY-MM-DD'))
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    if (!shop || !lineUid || !amount) return
    setSaving(true)

    const { error } = await createSupabaseClient(jwt ?? undefined)
      .from('expenses')
      .insert({
        shop_id: shop.id,
        category,
        amount: parseFloat(amount),
        note: note.trim() || null,
        expense_date: date,
      })

    if (!error) {
      router.push(`/shop/${shopId}/expenses`)
    } else {
      setSaving(false)
    }
  }

  return (
    <div className="pb-32">
      <div className="bg-white px-4 pt-12 pb-4 border-b border-gray-100 sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()} className="text-gray-400 text-xl">←</button>
          <h1 className="text-lg font-bold">บันทึกค่าใช้จ่าย</h1>
        </div>
      </div>

      <div className="px-4 pt-4 space-y-4">
        {/* Category */}
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <p className="text-xs font-semibold text-gray-400 mb-3">ประเภท</p>
          <div className="grid grid-cols-3 gap-2">
            {CATEGORIES.map((c) => (
              <button
                key={c.value}
                onClick={() => setCategory(c.value)}
                className={`flex flex-col items-center gap-1.5 py-3 rounded-2xl border transition-colors ${
                  category === c.value
                    ? 'bg-[#06C755]/10 border-[#06C755] text-[#06C755]'
                    : 'bg-gray-50 border-gray-200 text-gray-500'
                }`}>
                <span className="text-2xl">{c.icon}</span>
                <span className="text-xs font-medium">{c.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Amount & Date */}
        <div className="bg-white rounded-2xl p-4 shadow-sm space-y-3">
          <div>
            <p className="text-xs text-gray-400 mb-1">จำนวนเงิน (฿) <span className="text-red-400">*</span></p>
            <input
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#06C755] text-lg font-semibold"
              placeholder="0.00"
              type="number"
              inputMode="decimal"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>
          <div>
            <p className="text-xs text-gray-400 mb-1">วันที่</p>
            <input
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#06C755]"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>
        </div>

        {/* Note */}
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <p className="text-xs font-semibold text-gray-400 mb-2">รายละเอียด</p>
          <textarea
            className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm resize-none focus:outline-none focus:border-[#06C755]"
            rows={3}
            placeholder="รายละเอียดค่าใช้จ่าย เช่น ค่าส่ง Flash พัสดุ 5 ชิ้น"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 max-w-[430px] mx-auto p-4 bg-white border-t border-gray-100">
        <button
          onClick={handleSave}
          disabled={!amount || saving}
          className="w-full bg-[#06C755] disabled:bg-gray-200 text-white disabled:text-gray-400 font-bold py-4 rounded-2xl text-base transition-colors">
          {saving ? 'กำลังบันทึก...' : `บันทึก${amount ? ` ฿${parseFloat(amount).toLocaleString('th')}` : ''}`}
        </button>
      </div>
    </div>
  )
}
