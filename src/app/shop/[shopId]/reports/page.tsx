'use client'

import { useEffect, useState } from 'react'
import { useShopStore } from '@/store/shopStore'
import { createSupabaseClient } from '@/lib/supabase'
import { formatMoneyFull } from '@/lib/format'
import dayjs from 'dayjs'

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

export default function ReportsPage() {
  const { shop, lineUid } = useShopStore()
  const [month, setMonth] = useState(dayjs().format('YYYY-MM'))
  const [report, setReport] = useState<MonthReport | null>(null)
  const [dailySales, setDailySales] = useState<DaySales[]>([])
  const [exporting, setExporting] = useState(false)

  useEffect(() => {
    if (!shop || !lineUid) return
    const sb = createSupabaseClient(lineUid)
    const start = dayjs(month).startOf('month').toISOString()
    const end = dayjs(month).endOf('month').toISOString()

    Promise.all([
      sb.from('sales').select('total_amount,created_at').eq('shop_id', shop.id).gte('created_at', start).lte('created_at', end),
      sb.from('purchases').select('total_amount').eq('shop_id', shop.id).gte('created_at', start).lte('created_at', end),
      sb.from('expenses').select('amount').eq('shop_id', shop.id)
        .gte('expense_date', dayjs(month).format('YYYY-MM-01'))
        .lte('expense_date', dayjs(month).endOf('month').format('YYYY-MM-DD')),
    ]).then(([salesRes, purchasesRes, expensesRes]) => {
      const salesData = salesRes.data ?? []
      const total_sales = salesData.reduce((s, r) => s + Number(r.total_amount), 0)
      const total_purchases = (purchasesRes.data ?? []).reduce((s, r) => s + Number(r.total_amount), 0)
      const total_expenses = (expensesRes.data ?? []).reduce((s, r) => s + Number(r.amount), 0)

      setReport({ total_sales, total_purchases, total_expenses, order_count: salesData.length })

      // Group sales by day
      const daysInMonth = dayjs(month).daysInMonth()
      const byDay: Record<number, number> = {}
      salesData.forEach((s) => {
        const d = dayjs(s.created_at).date()
        byDay[d] = (byDay[d] ?? 0) + Number(s.total_amount)
      })
      setDailySales(
        Array.from({ length: daysInMonth }, (_, i) => ({ day: i + 1, amount: byDay[i + 1] ?? 0 }))
      )
    })
  }, [shop, lineUid, month])

  const grossProfit = (report?.total_sales ?? 0) - (report?.total_purchases ?? 0)
  const netProfit = grossProfit - (report?.total_expenses ?? 0)

  const handleExport = async () => {
    if (!shop || !lineUid) return
    setExporting(true)
    const sb = createSupabaseClient(lineUid)
    const start = dayjs(month).startOf('month').toISOString()
    const end = dayjs(month).endOf('month').toISOString()

    const { data: sales } = await sb
      .from('sales')
      .select('ref_number,total_amount,vat_amount,slip_type,note,created_at')
      .eq('shop_id', shop.id)
      .gte('created_at', start)
      .lte('created_at', end)
      .order('created_at')

    const rows = [
      ['เลขที่บิล', 'ยอดรวม', 'VAT', 'ประเภทชำระ', 'หมายเหตุ', 'วันที่'],
      ...(sales ?? []).map((s) => [
        s.ref_number ?? '',
        s.total_amount,
        s.vat_amount,
        s.slip_type === 'transfer' ? 'โอนเงิน' : s.slip_type === 'cash' ? 'เงินสด' : '',
        s.note ?? '',
        dayjs(s.created_at).format('DD/MM/YYYY HH:mm'),
      ]),
    ]

    const csv = '﻿' + rows.map((r) => r.map((c) => `"${c}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `sales-${month}.csv`
    a.click()
    URL.revokeObjectURL(url)
    setExporting(false)
  }

  // Chart
  const maxAmount = Math.max(...dailySales.map((d) => d.amount), 1)
  const chartH = 80
  const today = dayjs().date()
  const isCurrentMonth = month === dayjs().format('YYYY-MM')

  return (
    <div className="pb-8">
      <div className="bg-white px-4 pt-12 pb-4 border-b border-gray-100 sticky top-0 z-10">
        <div className="flex items-center gap-2 mb-3">
          <h1 className="text-lg font-bold flex-1">รายงาน</h1>
          <button
            onClick={handleExport}
            disabled={exporting || !report?.order_count}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gray-100 text-gray-600 text-xs font-semibold disabled:opacity-40 active:bg-gray-200 transition-colors">
            {exporting ? '⏳' : '📥'} Export CSV
          </button>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => setMonth(dayjs(month).subtract(1, 'month').format('YYYY-MM'))}
            className="w-9 h-9 rounded-xl bg-gray-100 flex items-center justify-center text-gray-600">←</button>
          <span className="flex-1 text-center text-sm font-semibold">
            {dayjs(month).format('MMMM YYYY')}
          </span>
          <button
            onClick={() => setMonth(dayjs(month).add(1, 'month').format('YYYY-MM'))}
            disabled={month >= dayjs().format('YYYY-MM')}
            className="w-9 h-9 rounded-xl bg-gray-100 flex items-center justify-center text-gray-600 disabled:opacity-30">→</button>
        </div>
      </div>

      <div className="px-4 pt-4 space-y-3 pb-6">
        {/* Net profit card */}
        <div className={`rounded-2xl p-5 ${netProfit >= 0 ? 'bg-[#06C755]' : 'bg-red-500'}`}>
          <p className="text-white/80 text-xs mb-1">กำไรสุทธิ</p>
          <p className="text-white text-3xl font-bold">{formatMoneyFull(netProfit)}</p>
          <p className="text-white/70 text-xs mt-1">{report?.order_count ?? 0} ออเดอร์</p>
        </div>

        {/* Daily bar chart */}
        {dailySales.length > 0 && (
          <div className="bg-white rounded-2xl p-4 shadow-sm">
            <p className="text-xs font-semibold text-gray-400 mb-3">ยอดขายรายวัน</p>
            <div className="flex items-end gap-px overflow-x-auto pb-2" style={{ height: chartH + 20 }}>
              {dailySales.map(({ day, amount }) => {
                const h = amount > 0 ? Math.max(4, Math.round((amount / maxAmount) * chartH)) : 2
                const isToday = isCurrentMonth && day === today
                return (
                  <div key={day} className="flex flex-col items-center gap-1 flex-1 min-w-0">
                    <div className="w-full flex items-end" style={{ height: chartH }}>
                      <div
                        className={`w-full rounded-t-sm transition-all ${isToday ? 'bg-[#06C755]' : amount > 0 ? 'bg-[#06C755]/40' : 'bg-gray-100'}`}
                        style={{ height: h }}
                      />
                    </div>
                    {(day % 5 === 0 || day === 1) && (
                      <span className="text-[9px] text-gray-400">{day}</span>
                    )}
                  </div>
                )
              })}
            </div>
            <p className="text-[10px] text-gray-400 mt-1 text-right">
              สูงสุด {formatMoneyFull(maxAmount)}
            </p>
          </div>
        )}

        {/* Stats rows */}
        {[
          { label: 'รายรับ (ยอดขาย)', value: report?.total_sales ?? 0, color: 'text-[#06C755]', icon: '💰' },
          { label: 'รายจ่าย (ซื้อสินค้า)', value: report?.total_purchases ?? 0, color: 'text-red-500', icon: '📦' },
          { label: 'ค่าใช้จ่ายอื่น', value: report?.total_expenses ?? 0, color: 'text-orange-500', icon: '💸' },
          { label: 'กำไรขั้นต้น', value: grossProfit, color: grossProfit >= 0 ? 'text-[#06C755]' : 'text-red-500', icon: '📈' },
        ].map((row) => (
          <div key={row.label} className="bg-white rounded-2xl p-4 shadow-sm flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-xl">{row.icon}</span>
              <span className="text-sm text-gray-700 font-medium">{row.label}</span>
            </div>
            <span className={`text-base font-bold ${row.color}`}>{formatMoneyFull(row.value)}</span>
          </div>
        ))}

        {/* Margin bar */}
        {(report?.total_sales ?? 0) > 0 && (
          <div className="bg-white rounded-2xl p-4 shadow-sm">
            <div className="flex justify-between text-xs text-gray-400 mb-2">
              <span className="font-medium">อัตรากำไร</span>
              <span className="font-bold text-gray-700">
                {((netProfit / (report?.total_sales ?? 1)) * 100).toFixed(1)}%
              </span>
            </div>
            <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full bg-[#06C755] transition-all"
                style={{ width: `${Math.max(0, Math.min(100, (netProfit / (report?.total_sales ?? 1)) * 100))}%` }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
