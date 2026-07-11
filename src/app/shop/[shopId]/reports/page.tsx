'use client'

import { useEffect, useState } from 'react'
import { useShopStore } from '@/store/shopStore'
import { useLangStore } from '@/store/langStore'
import { createSupabaseClient } from '@/lib/supabase'
import { formatMoneyFull } from '@/lib/format'
import { useT, type TKey } from '@/lib/i18n'
import dayjs from 'dayjs'
import 'dayjs/locale/th'

dayjs.locale('th')

interface MonthReport {
  total_sales: number
  total_purchases: number
  total_expenses: number
  order_count: number
}

interface DaySales {
  day: number
  amount: number
}

const THAI_MONTHS = ['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.']
const EN_MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

function MonthLabel(month: string, lang: 'th' | 'en') {
  const d = dayjs(month)
  return lang === 'th' ? `${THAI_MONTHS[d.month()]} ${d.year() + 543}` : `${EN_MONTHS[d.month()]} ${d.year()}`
}

// SVG illustrations
const IllustrationChart = () => (
  <svg width="72" height="56" viewBox="0 0 72 56" fill="none" className="opacity-20">
    <rect x="4" y="32" width="10" height="20" rx="5" fill="white"/>
    <rect x="20" y="20" width="10" height="32" rx="5" fill="white"/>
    <rect x="36" y="10" width="10" height="42" rx="5" fill="white"/>
    <rect x="52" y="24" width="10" height="28" rx="5" fill="white"/>
    <circle cx="58" cy="14" r="10" fill="white" fillOpacity="0.3"/>
  </svg>
)

const StatIcon = ({ type }: { type: string }) => {
  const icons: Record<string, JSX.Element> = {
    sales: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/>
      </svg>
    ),
    purchases: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 01-8 0"/>
      </svg>
    ),
    expenses: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
      </svg>
    ),
    profit: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/>
      </svg>
    ),
  }
  return icons[type] ?? null
}

export default function ReportsPage() {
  const { shop, lineUid, jwt } = useShopStore()
  const t = useT()
  const lang = useLangStore((s) => s.lang)
  const [month, setMonth] = useState(dayjs().format('YYYY-MM'))
  const [report, setReport] = useState<MonthReport | null>(null)
  const [dailySales, setDailySales] = useState<DaySales[]>([])
  const [exporting, setExporting] = useState(false)

  useEffect(() => {
    if (!shop || !lineUid) return
    const sb = createSupabaseClient(jwt ?? undefined)
    const start = dayjs(month).startOf('month').toISOString()
    const end   = dayjs(month).endOf('month').toISOString()

    Promise.all([
      sb.from('sales').select('total_amount,created_at').eq('shop_id', shop.id).gte('created_at', start).lte('created_at', end),
      sb.from('purchases').select('total_amount').eq('shop_id', shop.id).gte('created_at', start).lte('created_at', end),
      sb.from('expenses').select('amount').eq('shop_id', shop.id)
        .gte('expense_date', dayjs(month).format('YYYY-MM-01'))
        .lte('expense_date', dayjs(month).endOf('month').format('YYYY-MM-DD')),
    ]).then(([salesRes, purchasesRes, expensesRes]) => {
      const salesData = salesRes.data ?? []
      const total_sales     = salesData.reduce((s, r) => s + Number(r.total_amount), 0)
      const total_purchases = (purchasesRes.data ?? []).reduce((s, r) => s + Number(r.total_amount), 0)
      const total_expenses  = (expensesRes.data ?? []).reduce((s, r) => s + Number(r.amount), 0)
      setReport({ total_sales, total_purchases, total_expenses, order_count: salesData.length })

      const daysInMonth = dayjs(month).daysInMonth()
      const byDay: Record<number, number> = {}
      salesData.forEach((s) => { const d = dayjs(s.created_at).date(); byDay[d] = (byDay[d] ?? 0) + Number(s.total_amount) })
      setDailySales(Array.from({ length: daysInMonth }, (_, i) => ({ day: i + 1, amount: byDay[i + 1] ?? 0 })))
    })
  }, [shop, lineUid, month])

  const grossProfit = (report?.total_sales ?? 0) - (report?.total_purchases ?? 0)
  const netProfit   = grossProfit - (report?.total_expenses ?? 0)
  const marginPct   = report?.total_sales ? Math.max(0, Math.min(100, (netProfit / report.total_sales) * 100)) : 0

  const handleExport = async () => {
    if (!shop || !lineUid) return
    setExporting(true)
    const sb = createSupabaseClient(jwt ?? undefined)
    const start = dayjs(month).startOf('month').toISOString()
    const end   = dayjs(month).endOf('month').toISOString()
    const { data: sales } = await sb.from('sales')
      .select('ref_number,total_amount,vat_amount,slip_type,note,created_at')
      .eq('shop_id', shop.id).gte('created_at', start).lte('created_at', end).order('created_at')
    const rows = [
      [t('reports.csvRef'), t('reports.csvTotal'), 'VAT', t('reports.csvPayType'), t('reports.csvNote'), t('reports.csvDate')],
      ...(sales ?? []).map((s) => [
        s.ref_number ?? '', s.total_amount, s.vat_amount,
        s.slip_type === 'transfer' ? t('sales.transfer') : s.slip_type === 'cash' ? t('sales.cash') : '',
        s.note ?? '', dayjs(s.created_at).format('DD/MM/YYYY HH:mm'),
      ]),
    ]
    const csv = '﻿' + rows.map((r) => r.map((c) => `"${c}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href = url; a.download = `sales-${month}.csv`; a.click()
    URL.revokeObjectURL(url)
    setExporting(false)
  }

  const maxAmount = Math.max(...dailySales.map((d) => d.amount), 1)
  const today = dayjs().date()
  const isCurrentMonth = month === dayjs().format('YYYY-MM')

  const stats: { key: string; labelKey: TKey; value: number; color: string; bg: string; icon: string }[] = [
    { key: 'sales',     labelKey: 'reports.statSales',     value: report?.total_sales ?? 0,    color: '#1877F2', bg: '#f0fdf4', icon: 'sales' },
    { key: 'purchases', labelKey: 'reports.statPurchases', value: report?.total_purchases ?? 0, color: '#ef4444', bg: '#fef2f2', icon: 'purchases' },
    { key: 'expenses',  labelKey: 'reports.statExpenses',  value: report?.total_expenses ?? 0,  color: '#f97316', bg: '#fff7ed', icon: 'expenses' },
    { key: 'profit',    labelKey: 'reports.statProfit',    value: grossProfit,                  color: grossProfit >= 0 ? '#1877F2' : '#ef4444', bg: grossProfit >= 0 ? '#f0fdf4' : '#fef2f2', icon: 'profit' },
  ]

  return (
    <div className="pb-32">
      {/* Header */}
      <div className="px-4 pt-12 pb-4">
        <div className="flex items-center justify-between mb-5">
          <h1 className="text-xl font-bold text-gray-900">{t('reports.title')}</h1>
          <button
            onClick={handleExport}
            disabled={exporting || !report?.order_count}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-2xl bg-white shadow-[0_2px_12px_rgba(0,0,0,0.08)] text-gray-500 text-xs font-semibold disabled:opacity-40 active:scale-95 transition-all">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
            {exporting ? t('reports.exporting') : 'CSV'}
          </button>
        </div>

        {/* Month switcher */}
        <div className="flex items-center gap-3 bg-white rounded-2xl shadow-[0_2px_12px_rgba(0,0,0,0.07)] px-4 py-3">
          <button
            onClick={() => setMonth(dayjs(month).subtract(1, 'month').format('YYYY-MM'))}
            className="w-8 h-8 rounded-xl bg-gray-50 flex items-center justify-center text-gray-500 active:bg-gray-100 transition-colors">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6"/>
            </svg>
          </button>
          <span className="flex-1 text-center text-sm font-bold text-gray-800">
            {MonthLabel(month, lang)}
          </span>
          <button
            onClick={() => setMonth(dayjs(month).add(1, 'month').format('YYYY-MM'))}
            disabled={month >= dayjs().format('YYYY-MM')}
            className="w-8 h-8 rounded-xl bg-gray-50 flex items-center justify-center text-gray-500 disabled:opacity-30 active:bg-gray-100 transition-colors">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 18 15 12 9 6"/>
            </svg>
          </button>
        </div>
      </div>

      <div className="px-4 space-y-3">
        {/* Net profit hero card */}
        <div className={`relative overflow-hidden rounded-3xl p-6 shadow-[0_8px_32px_rgba(24,119,242,0.25)] ${netProfit >= 0 ? 'bg-[#1877F2]' : 'bg-red-500'}`}>
          <div className="absolute right-4 bottom-0 pointer-events-none">
            <IllustrationChart />
          </div>
          <p className="text-white/70 text-xs font-semibold tracking-widest uppercase mb-1">{t('reports.netProfit')}</p>
          <p className="text-white text-4xl font-bold tracking-tight mb-3">
            {report ? formatMoneyFull(netProfit) : '—'}
          </p>
          <div className="flex items-center gap-2">
            <span className="bg-white/20 text-white text-[11px] font-semibold px-2.5 py-1 rounded-full">
              {t('reports.orders', { n: report?.order_count ?? 0 })}
            </span>
            {report && (report.total_sales > 0) && (
              <span className="bg-white/20 text-white text-[11px] font-semibold px-2.5 py-1 rounded-full">
                margin {marginPct.toFixed(1)}%
              </span>
            )}
          </div>
        </div>

        {/* Daily bar chart */}
        {dailySales.length > 0 && (
          <div className="bg-white rounded-3xl p-5 shadow-[0_2px_16px_rgba(0,0,0,0.07)]">
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm font-bold text-gray-800">{t('reports.dailySales')}</p>
              <p className="text-[11px] text-gray-400">{t('reports.max', { v: formatMoneyFull(maxAmount) })}</p>
            </div>
            <div className="flex items-end gap-0.5" style={{ height: 90 }}>
              {dailySales.map(({ day, amount }) => {
                const h = amount > 0 ? Math.max(6, Math.round((amount / maxAmount) * 80)) : 3
                const isToday = isCurrentMonth && day === today
                return (
                  <div key={day} className="flex flex-col items-center flex-1 min-w-0" style={{ height: 90, justifyContent: 'flex-end' }}>
                    <div
                      className={`w-full rounded-t-full transition-all ${
                        isToday ? 'bg-[#1877F2]' : amount > 0 ? 'bg-[#1877F2]/25' : 'bg-gray-100'
                      }`}
                      style={{ height: h }}
                    />
                  </div>
                )
              })}
            </div>
            <div className="flex justify-between mt-2">
              <span className="text-[9px] text-gray-400">1</span>
              <span className="text-[9px] text-gray-400">{Math.ceil(dailySales.length / 2)}</span>
              <span className="text-[9px] text-gray-400">{dailySales.length}</span>
            </div>
          </div>
        )}

        {/* Stats 2x2 grid */}
        <div className="grid grid-cols-2 gap-3">
          {stats.map((s) => (
            <div key={s.key} className="bg-white rounded-3xl p-4 shadow-[0_2px_16px_rgba(0,0,0,0.07)]">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: s.bg, color: s.color }}>
                  <StatIcon type={s.icon} />
                </div>
              </div>
              <p className="text-[11px] text-gray-400 font-medium mb-0.5">{t(s.labelKey)}</p>
              <p className="text-base font-bold" style={{ color: s.color }}>
                {formatMoneyFull(s.value)}
              </p>
            </div>
          ))}
        </div>

        {/* Margin bar */}
        {(report?.total_sales ?? 0) > 0 && (
          <div className="bg-white rounded-3xl p-5 shadow-[0_2px_16px_rgba(0,0,0,0.07)]">
            <div className="flex justify-between items-center mb-3">
              <p className="text-sm font-bold text-gray-800">{t('reports.netMargin')}</p>
              <span className="text-sm font-bold" style={{ color: marginPct > 0 ? '#1877F2' : '#ef4444' }}>
                {marginPct.toFixed(1)}%
              </span>
            </div>
            <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{ width: `${marginPct}%`, background: marginPct > 0 ? '#1877F2' : '#ef4444' }}
              />
            </div>
            <div className="flex justify-between mt-2">
              <span className="text-[10px] text-gray-400">0%</span>
              <span className="text-[10px] text-gray-400">50%</span>
              <span className="text-[10px] text-gray-400">100%</span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
