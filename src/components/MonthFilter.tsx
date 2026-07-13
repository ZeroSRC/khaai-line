'use client'

import { useState } from 'react'
import dayjs from 'dayjs'
import { useLangStore } from '@/store/langStore'
import { useT } from '@/lib/i18n'

const THAI_MONTHS = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.']
const EN_MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

/** Buddhist era in Thai, Gregorian in English. The `month` value stays "YYYY-MM" CE either way. */
export function monthLabel(month: string, lang: 'th' | 'en') {
  const d = dayjs(month)
  return lang === 'th'
    ? `${THAI_MONTHS[d.month()]} ${d.year() + 543}`
    : `${EN_MONTHS[d.month()]} ${d.year()}`
}

/** Inclusive ISO bounds of a "YYYY-MM" month — what every list/report query filters on. */
export function monthRange(month: string) {
  return {
    start: dayjs(month).startOf('month').toISOString(),
    end: dayjs(month).endOf('month').toISOString(),
  }
}

/**
 * Month switcher: ← → to step, tap the label for a year + 12-month grid.
 * Shared by reports and the sales/purchases/shipments lists so they filter identically.
 */
export function MonthFilter({ month, onChange }: { month: string; onChange: (m: string) => void }) {
  const t = useT()
  const lang = useLangStore((s) => s.lang)
  const [open, setOpen] = useState(false)
  const [year, setYear] = useState(dayjs(month).year())

  const nowMonth = dayjs().format('YYYY-MM')
  const MONTHS = lang === 'th' ? THAI_MONTHS : EN_MONTHS

  const pick = (m: string) => { onChange(m); setOpen(false) }

  return (
    <>
      <div className="h-[44px] flex items-center gap-3 bg-white rounded-xl shadow-[0_2px_12px_rgba(0,0,0,0.07)] px-4 py-3">
        <button
          onClick={() => onChange(dayjs(month).subtract(1, 'month').format('YYYY-MM'))}
          className="w-8 h-8 rounded-xl bg-gray-50 flex items-center justify-center text-gray-500 active:bg-gray-100 transition-colors">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
        </button>

        {/* Tapping the label is the fast path — stepping back to January is 6 taps otherwise */}
        <button
          onClick={() => { setYear(dayjs(month).year()); setOpen(true) }}
          className="flex-1 flex items-center justify-center gap-1.5 py-1 rounded-xl active:bg-gray-50 transition-colors">
          <span className="text-sm font-bold text-gray-800">{monthLabel(month, lang)}</span>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9" /></svg>
        </button>

        <button
          onClick={() => onChange(dayjs(month).add(1, 'month').format('YYYY-MM'))}
          disabled={month >= nowMonth}
          className="w-8 h-8 rounded-xl bg-gray-50 flex items-center justify-center text-gray-500 disabled:opacity-30 active:bg-gray-100 transition-colors">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6" /></svg>
        </button>
      </div>

      {open && (
        <>
          <div className="fixed inset-0 z-40 bg-black/30" onClick={() => setOpen(false)} />
          <div className="fixed bottom-0 left-0 right-0 z-50 max-w-[430px] mx-auto bg-white rounded-t-[28px] p-5 pb-8 shadow-[0_-8px_32px_rgba(0,0,0,0.15)]">
            <div className="w-10 h-1 rounded-full bg-gray-200 mx-auto mb-4" />
            <p className="text-center text-xs font-bold text-gray-400 mb-4">{t('reports.pickMonth')}</p>

            <div className="flex items-center justify-center gap-6 mb-5">
              <button onClick={() => setYear((y) => y - 1)}
                className="w-9 h-9 rounded-2xl bg-gray-50 flex items-center justify-center text-gray-500 active:bg-gray-100 transition-colors">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
              </button>
              <span className="text-lg font-bold text-gray-900 tabular-nums">
                {lang === 'th' ? year + 543 : year}
              </span>
              <button onClick={() => setYear((y) => y + 1)}
                disabled={year >= dayjs().year()}
                className="w-9 h-9 rounded-2xl bg-gray-50 flex items-center justify-center text-gray-500 disabled:opacity-30 active:bg-gray-100 transition-colors">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6" /></svg>
              </button>
            </div>

            <div className="grid grid-cols-3 gap-2">
              {MONTHS.map((label, i) => {
                const value = `${year}-${String(i + 1).padStart(2, '0')}`
                const selected = value === month
                // A month that hasn't happened yet has no data — same rule the → button follows.
                const future = value > nowMonth
                return (
                  <button key={value} disabled={future} onClick={() => pick(value)}
                    className={`py-2.5 rounded-2xl text-sm font-semibold transition-colors ${selected ? 'bg-[#1877F2] text-white shadow-[0_4px_12px_rgba(24,119,242,0.35)]'
                        : future ? 'bg-gray-50 text-gray-300'
                          : 'bg-gray-50 text-gray-600 active:bg-gray-100'
                      }`}>
                    {label}
                  </button>
                )
              })}
            </div>

            <button onClick={() => pick(nowMonth)}
              className="w-full mt-4 py-3 rounded-2xl bg-[#1877F2]/[0.07] text-[#1877F2] text-sm font-bold active:bg-[#1877F2]/[0.12] transition-colors">
              {t('reports.thisMonth')}
            </button>
          </div>
        </>
      )}
    </>
  )
}
