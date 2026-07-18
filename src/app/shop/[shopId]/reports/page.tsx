'use client'

import { useEffect, useState } from 'react'
import { useShopStore } from '@/store/shopStore'
import { createSupabaseClient } from '@/lib/supabase'
import { formatMoneyFull } from '@/lib/format'
import { useT, type TKey } from '@/lib/i18n'
import { MonthFilter } from '@/components/MonthFilter'
import dayjs from 'dayjs'
import 'dayjs/locale/th'

dayjs.locale('th')

interface MonthReport {
  total_sales: number
  /** COGS — ต้นทุนของ "ของที่ขายออกไปในเดือนนี้" (ไม่ใช่เงินที่จ่ายซื้อของเข้าในเดือนนี้) */
  total_cogs: number
  /** เงินที่จ่ายซื้อสต็อกเข้าในเดือนนี้ — แสดงเป็นข้อมูล ไม่นำไปคิดกำไร */
  total_stock_in: number
  total_expenses: number
  total_shipping: number
  order_count: number
}

interface DaySales {
  day: number
  amount: number
}

/** A product that was stocked IN during the selected month (keyed on purchase date). */
interface ProductRow {
  productId: string
  name: string
  sku: string | null
  boughtQty: number  // total bought in this month
  soldQty: number    // total sold (any time) — a product bought this month can only have sold this month or later
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
    shipping: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M1 3h15v13H1zM16 8h4l3 3v5h-7V8z"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/>
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
  const [month, setMonth] = useState(dayjs().format('YYYY-MM'))
  const [report, setReport] = useState<MonthReport | null>(null)
  const [dailySales, setDailySales] = useState<DaySales[]>([])
  const [selectedDay, setSelectedDay] = useState<number | null>(null)
  const [productRows, setProductRows] = useState<ProductRow[]>([])
  const [exporting, setExporting] = useState(false)

  useEffect(() => {
    if (!shop || !lineUid) return
    const sb = createSupabaseClient(jwt ?? undefined)
    const start = dayjs(month).startOf('month').toISOString()
    const end   = dayjs(month).endOf('month').toISOString()

    Promise.all([
      sb.from('sales').select('id,total_amount,created_at').eq('shop_id', shop.id).gte('created_at', start).lte('created_at', end),
      sb.from('purchases').select('id,total_amount').eq('shop_id', shop.id).gte('created_at', start).lte('created_at', end),
      sb.from('expenses').select('amount').eq('shop_id', shop.id)
        .gte('expense_date', dayjs(month).format('YYYY-MM-01'))
        .lte('expense_date', dayjs(month).endOf('month').format('YYYY-MM-DD')),
      // Shipping is money out too — it lives on shipments, not the expenses table,
      // so it has to be pulled in separately or net profit comes out overstated.
      sb.from('shipments').select('shipping_cost').eq('shop_id', shop.id).gte('created_at', start).lte('created_at', end),
    ]).then(async ([salesRes, purchasesRes, expensesRes, shipmentsRes]) => {
      const salesData = salesRes.data ?? []
      const total_sales    = salesData.reduce((s, r) => s + Number(r.total_amount), 0)
      const total_stock_in = (purchasesRes.data ?? []).reduce((s, r) => s + Number(r.total_amount), 0)
      const total_expenses = (expensesRes.data ?? []).reduce((s, r) => s + Number(r.amount), 0)
      const total_shipping = (shipmentsRes.data ?? []).reduce((s, r) => s + Number(r.shipping_cost), 0)

      // COGS must follow the goods that were SOLD this month, not the cash spent buying
      // stock this month. Buying in June and selling in July would otherwise dump the whole
      // cost on June (huge fake loss) and leave July looking like 100% margin.
      //
      // Uses products.cost_price (current) rather than the sale_items.unit_cost snapshot —
      // by request, editing a purchase's cost should immediately move past months' profit too.
      const saleIds = salesData.map((s) => s.id)
      let total_cogs = 0
      if (saleIds.length > 0) {
        const { data: itemRows } = await sb
          .from('sale_items').select('quantity, unit_cost, product:products(cost_price)').in('sale_id', saleIds)
        // Product soft-deleted → RLS hides the join (product: null) → fall back to the unit_cost
        // snapshot so a deleted product's old sales don't silently drop out of COGS.
        total_cogs = (itemRows ?? []).reduce((s, r: any) => s + Number(r.product?.cost_price ?? r.unit_cost ?? 0) * Number(r.quantity), 0)
      }

      setReport({ total_sales, total_cogs, total_stock_in, total_expenses, total_shipping, order_count: salesData.length })

      // Products stocked IN this month (keyed on purchase date) + whether each has sold yet.
      const purchaseIds = (purchasesRes.data ?? []).map((p) => p.id)
      if (purchaseIds.length > 0) {
        const { data: pItems } = await sb
          .from('purchase_items')
          .select('product_id, quantity, product:products(name, sku)')
          .in('purchase_id', purchaseIds)

        // Group purchased quantities by product
        const byProduct = new Map<string, ProductRow>()
        for (const it of (pItems ?? []) as any[]) {
          if (!it.product_id) continue
          const row = byProduct.get(it.product_id) ?? {
            productId: it.product_id, name: it.product?.name ?? '—', sku: it.product?.sku ?? null,
            boughtQty: 0, soldQty: 0,
          }
          row.boughtQty += Number(it.quantity)
          byProduct.set(it.product_id, row)
        }

        // Sold quantity per product (any time — a product bought this month can't have sold earlier)
        const ids = Array.from(byProduct.keys())
        if (ids.length > 0) {
          const { data: sItems } = await sb
            .from('sale_items').select('product_id, quantity').eq('shop_id', shop.id).in('product_id', ids)
          for (const it of (sItems ?? []) as any[]) {
            const row = byProduct.get(it.product_id)
            if (row) row.soldQty += Number(it.quantity)
          }
        }

        // Not-yet-sold first (those need attention), then by quantity bought
        setProductRows(Array.from(byProduct.values()).sort((a, b) =>
          (a.soldQty > 0 ? 1 : 0) - (b.soldQty > 0 ? 1 : 0) || b.boughtQty - a.boughtQty))
      } else {
        setProductRows([])
      }

      const daysInMonth = dayjs(month).daysInMonth()
      const byDay: Record<number, number> = {}
      salesData.forEach((s) => { const d = dayjs(s.created_at).date(); byDay[d] = (byDay[d] ?? 0) + Number(s.total_amount) })
      setDailySales(Array.from({ length: daysInMonth }, (_, i) => ({ day: i + 1, amount: byDay[i + 1] ?? 0 })))
      setSelectedDay(null) // a stale day from the previous month would point at the wrong bar
    })
  }, [shop, lineUid, month])

  const grossProfit = (report?.total_sales ?? 0) - (report?.total_cogs ?? 0)
  const netProfit   = grossProfit - (report?.total_expenses ?? 0) - (report?.total_shipping ?? 0)
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

  const stats: { key: string; labelKey: TKey; value: number; color: string; bg: string; icon: string; wide?: boolean }[] = [
    { key: 'sales',     labelKey: 'reports.statSales',     value: report?.total_sales ?? 0,     color: '#1877F2', bg: '#eff6ff', icon: 'sales' },
    { key: 'cogs',      labelKey: 'reports.statPurchases', value: report?.total_cogs ?? 0,      color: '#4F46E5', bg: '#eef2ff', icon: 'purchases' },
    { key: 'shipping',  labelKey: 'reports.statShipping',  value: report?.total_shipping ?? 0,  color: '#f97316', bg: '#fff7ed', icon: 'shipping' },
    { key: 'expenses',  labelKey: 'reports.statExpenses',  value: report?.total_expenses ?? 0,  color: '#ef4444', bg: '#fef2f2', icon: 'expenses' },
    { key: 'profit',    labelKey: 'reports.statProfit',    value: grossProfit,                  color: grossProfit >= 0 ? '#1877F2' : '#ef4444', bg: grossProfit >= 0 ? '#eff6ff' : '#fef2f2', icon: 'profit', wide: true },
  ]

  return (
    <div className="pb-32">
      {/* Header */}
      <div className="px-4 pt-8 pb-4">
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

        <MonthFilter month={month} onChange={setMonth} />
      </div>

      <div className="px-4 space-y-3">
        {/* Net profit hero card */}
        <div className={`relative overflow-hidden rounded-3xl p-5 shadow-[0_8px_32px_rgba(24,119,242,0.25)] ${netProfit >= 0 ? 'bg-[#1877F2]' : 'bg-red-500'}`}>
          <div className="absolute right-4 bottom-0 pointer-events-none">
            <IllustrationChart />
          </div>
          <p className="text-white/70 text-xs font-semibold tracking-widest uppercase mb-1">{t('reports.netProfit')}</p>
          <p className="text-white text-3xl font-bold tracking-tight mb-2.5">
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

        {/* Daily bar chart — tap a bar to read that day's total */}
        {dailySales.length > 0 && (
          <div className="bg-white rounded-3xl p-4 shadow-[0_2px_16px_rgba(0,0,0,0.07)]">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-bold text-gray-800">{t('reports.dailySales')}</p>
              {/* Header doubles as the readout: peak by default, the tapped day once one is picked */}
              {selectedDay !== null ? (
                <p className="text-[11px] font-semibold text-[#1877F2] tabular-nums">
                  {t('reports.dayN', { n: selectedDay })} · {formatMoneyFull(dailySales[selectedDay - 1]?.amount ?? 0)}
                </p>
              ) : (
                <p className="text-[11px] text-gray-400">{t('reports.max', { v: formatMoneyFull(maxAmount) })}</p>
              )}
            </div>
            <div className="flex items-end gap-0.5" style={{ height: 64 }}>
              {dailySales.map(({ day, amount }) => {
                const h = amount > 0 ? Math.max(5, Math.round((amount / maxAmount) * 56)) : 3
                const isToday = isCurrentMonth && day === today
                const isSelected = day === selectedDay
                // Selected bar is solid; when something is selected the rest dim so the pick stands out
                const color = isSelected ? 'bg-[#1877F2]'
                  : selectedDay !== null ? (amount > 0 ? 'bg-[#1877F2]/15' : 'bg-gray-100')
                  : isToday ? 'bg-[#1877F2]'
                  : amount > 0 ? 'bg-[#1877F2]/25' : 'bg-gray-100'
                return (
                  <button
                    key={day}
                    onClick={() => setSelectedDay(isSelected ? null : day)}
                    aria-label={`${t('reports.dayN', { n: day })}`}
                    className="flex flex-col items-center flex-1 min-w-0 h-16 justify-end cursor-pointer">
                    <div className={`w-full rounded-t-full transition-all ${color}`} style={{ height: isSelected ? Math.max(h, 6) : h }} />
                  </button>
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

        {/* Stats 2x2 grid — icon inline with the text so each card is two lines tall, not four */}
        <div className="grid grid-cols-2 gap-2.5">
          {stats.map((s) => (
            <div key={s.key} className={`bg-white rounded-2xl p-3 shadow-[0_2px_12px_rgba(0,0,0,0.06)] flex items-center gap-2.5 ${s.wide ? 'col-span-2' : ''}`}>
              <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: s.bg, color: s.color }}>
                <StatIcon type={s.icon} />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] text-gray-400 font-medium leading-tight truncate">{t(s.labelKey)}</p>
                <p className="text-sm font-bold leading-tight mt-0.5" style={{ color: s.color }}>
                  {formatMoneyFull(s.value)}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Stock bought this month — cash out, but NOT a cost until the goods sell.
            Kept visible so the number isn't lost, clearly outside the profit maths.
            TEMPORARILY HIDDEN (`false &&`): the per-product table below now covers "what was
            stocked in this month", so this total is redundant for now. Flip back to
            `(report?.total_stock_in ?? 0) > 0` to restore. */}
        {false && (report?.total_stock_in ?? 0) > 0 && (
          <div className="bg-white rounded-3xl p-4 shadow-[0_2px_16px_rgba(0,0,0,0.07)] flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gray-100 text-gray-500 flex items-center justify-center flex-shrink-0">
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 002 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/>
                <path d="M3.27 6.96L12 12.01l8.73-5.05"/>
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-gray-700">{t('reports.stockIn')}</p>
              <p className="text-[10px] text-gray-400 mt-0.5 leading-tight">{t('reports.stockInHint')}</p>
            </div>
            <p className="text-sm font-bold text-gray-500 flex-shrink-0">
              {formatMoneyFull(report?.total_stock_in ?? 0)}
            </p>
          </div>
        )}

        {/* Products stocked in this month — itemised, with a sold / not-sold check per product */}
        {productRows.length > 0 && (
          <div className="bg-white rounded-3xl p-4 shadow-[0_2px_16px_rgba(0,0,0,0.07)]">
            <p className="text-sm font-bold text-gray-800">{t('reports.productsTitle')}</p>
            <p className="text-[10px] text-gray-400 mt-0.5 mb-3">{t('reports.productsHint')}</p>

            <div className="overflow-hidden rounded-2xl border border-gray-100">
              {/* Header row */}
              <div className="flex items-center gap-2 bg-gray-50 px-3 py-2 text-[10px] font-bold text-gray-400 uppercase tracking-wide">
                <span className="flex-1 min-w-0">{t('nav.products')}</span>
                <span className="w-8 text-right tabular-nums">{t('reports.colBought')}</span>
                <span className="w-8 text-right tabular-nums">{t('reports.sold')}</span>
                <span className="w-[74px] text-right">{t('reports.colStatus')}</span>
              </div>

              {/* Body rows — divided so it reads as a table, zebra so long lists stay scannable */}
              <div className="divide-y divide-gray-100">
                {productRows.map((p, i) => {
                  // sold=0 → not sold · sold≥bought → fully sold · in between → partly sold
                  const status = p.soldQty === 0 ? 'notSold' : p.soldQty >= p.boughtQty ? 'sold' : 'soldPartial'
                  const dot = status === 'sold' ? 'bg-emerald-500'
                    : status === 'soldPartial' ? 'bg-[#1877F2]'
                    : 'bg-amber-500'
                  const dotText = status === 'sold' ? 'text-emerald-600'
                    : status === 'soldPartial' ? 'text-[#1877F2]'
                    : 'text-amber-600'
                  return (
                    <div key={p.productId} className={`flex items-center gap-2 px-3 py-2.5 ${i % 2 ? 'bg-gray-50/40' : 'bg-white'}`}>
                      <p className="flex-1 min-w-0 text-sm font-semibold text-gray-900 truncate">{p.name}</p>
                      <span className="w-8 text-right text-sm font-medium text-gray-700 tabular-nums">{p.boughtQty}</span>
                      <span className="w-8 text-right text-sm font-medium text-gray-500 tabular-nums">{p.soldQty}</span>
                      <span className={`w-[74px] flex items-center justify-end gap-1 text-[10px] font-semibold whitespace-nowrap ${dotText}`}>
                        <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${dot}`} />
                        {t(`reports.${status}` as TKey)}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        )}

        {/* Margin bar */}
        {(report?.total_sales ?? 0) > 0 && (
          <div className="bg-white rounded-2xl p-4 shadow-[0_2px_12px_rgba(0,0,0,0.06)]">
            <div className="flex justify-between items-center mb-2.5">
              <p className="text-sm font-bold text-gray-800">{t('reports.netMargin')}</p>
              <span className="text-sm font-bold" style={{ color: marginPct > 0 ? '#1877F2' : '#ef4444' }}>
                {marginPct.toFixed(1)}%
              </span>
            </div>
            <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{ width: `${marginPct}%`, background: marginPct > 0 ? '#1877F2' : '#ef4444' }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
