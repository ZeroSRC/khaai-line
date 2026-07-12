'use client'

import { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useShopStore } from '@/store/shopStore'
import { createSupabaseClient } from '@/lib/supabase'
import { formatMoneyFull } from '@/lib/format'
import { useT, type TKey } from '@/lib/i18n'
import { DateField } from '@/components/DateField'
import type { ExpenseCategory } from '@/lib/types'
import dayjs from 'dayjs'

const BackBtn = ({ onClick }: { onClick: () => void }) => (
  <button onClick={onClick} className="w-9 h-9 rounded-2xl bg-gray-50 flex items-center justify-center text-gray-500 active:bg-gray-100 transition-colors">
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
  </button>
)

const CATEGORIES: { value: ExpenseCategory; labelKey: TKey; icon: JSX.Element }[] = [
  { value: 'shipping', labelKey: 'expenses.catShipping', icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M1 3h15v13H1zM16 8h4l3 3v5h-7V8z"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg> },
  { value: 'fuel', labelKey: 'expenses.catFuel', icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M4 2h10l2 4H4zM4 6v14a2 2 0 002 2h8a2 2 0 002-2V6"/></svg> },
  { value: 'other', labelKey: 'expenses.catOther', icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg> },
]

export default function NewExpensePage() {
  const { shopId } = useParams<{ shopId: string }>()
  const router = useRouter()
  const { shop, lineUid, jwt } = useShopStore()
  const t = useT()
  const [category, setCategory] = useState<ExpenseCategory>('other')
  const [amount, setAmount] = useState('')
  const [note, setNote] = useState('')
  const [date, setDate] = useState(dayjs().format('YYYY-MM-DD'))
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    if (!shop || !lineUid || !amount) return
    setSaving(true)
    const { error } = await createSupabaseClient(jwt ?? undefined)
      .from('expenses').insert({
        shop_id: shop.id, category, amount: parseFloat(amount),
        note: note.trim() || null, expense_date: date,
      })
    if (!error) router.push(`/shop/${shopId}/expenses`)
    else setSaving(false)
  }

  return (
    <div className="pb-52">
      <div className="px-4 pt-8 pb-4 flex items-center gap-3">
        <BackBtn onClick={() => router.back()} />
        <h1 className="text-lg font-bold text-gray-900">{t('expenses.newTitle')}</h1>
      </div>

      <div className="px-4 space-y-3">
        {/* Category */}
        <div className="bg-white rounded-3xl p-4 shadow-[0_2px_16px_rgba(0,0,0,0.07)]">
          <p className="text-xs font-bold text-gray-400 mb-3">{t('expenses.catType')}</p>
          <div className="grid grid-cols-3 gap-2">
            {CATEGORIES.map((c) => (
              <button key={c.value} onClick={() => setCategory(c.value)}
                className={`flex flex-col items-center gap-2 py-4 rounded-2xl transition-colors ${category === c.value ? 'bg-[#1877F2]/10 text-[#1877F2] ring-2 ring-[#1877F2]/30' : 'bg-gray-50 text-gray-400'}`}>
                {c.icon}
                <span className="text-xs font-semibold">{t(c.labelKey)}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Amount & date */}
        <div className="bg-white rounded-3xl p-4 shadow-[0_2px_16px_rgba(0,0,0,0.07)] space-y-3">
          <div>
            <p className="text-xs text-gray-400 font-medium mb-1.5">{t('expenses.amount')}<span className="text-red-400 ml-0.5">*</span></p>
            <input className="w-full bg-gray-50 border-0 rounded-2xl px-4 py-3 text-lg font-bold focus:outline-none focus:ring-2 focus:ring-[#1877F2]/30"
              placeholder="0.00" type="number" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} />
          </div>
          <div>
            <p className="text-xs text-gray-400 font-medium mb-1.5">{t('expenses.date')}</p>
            <DateField value={date} onChange={setDate} max={dayjs().format('YYYY-MM-DD')} />
          </div>
        </div>

        {/* Note */}
        <div className="bg-white rounded-3xl p-4 shadow-[0_2px_16px_rgba(0,0,0,0.07)]">
          <p className="text-xs font-bold text-gray-400 mb-2">{t('expenses.detail')}</p>
          <textarea className="w-full bg-gray-50 rounded-2xl px-4 py-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#1877F2]/30 border-0"
            rows={3} placeholder={t('expenses.detailPlaceholder')}
            value={note} onChange={(e) => setNote(e.target.value)} />
        </div>
      </div>

      <div className="fixed bottom-24 left-0 right-0 max-w-[430px] mx-auto px-4 z-40">
        <button onClick={handleSave} disabled={!amount || saving}
          className="w-full bg-red-500 disabled:bg-gray-200 text-white disabled:text-gray-400 font-bold py-4 rounded-2xl text-base transition-all shadow-[0_4px_16px_rgba(239,68,68,0.35)] disabled:shadow-none active:scale-[0.98]">
          {saving ? t('common.saving') : `${t('expenses.saveBtn')}${amount ? ` · ${formatMoneyFull(parseFloat(amount))}` : ''}`}
        </button>
      </div>
    </div>
  )
}
