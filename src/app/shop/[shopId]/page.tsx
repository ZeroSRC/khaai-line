'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { useShopStore } from '@/store/shopStore'
import { createSupabaseClient } from '@/lib/supabase'
import { formatMoneyFull } from '@/lib/format'
import { useT, type TKey } from '@/lib/i18n'
import { useLangStore } from '@/store/langStore'
import { useNotifyStore } from '@/store/notifyStore'
import { Sparkline, DeltaBadge } from '@/components/Sparkline'
import { HeaderDecor } from '@/components/HeaderDecor'
import dayjs from 'dayjs'

interface DashboardStats {
  today_sales: number; today_orders: number; month_sales: number
  month_expenses: number; low_stock: number; pending_shipments: number
  /** Trend series + the baseline each card is compared against. */
  spark_today: number[]        // sales per day, last 7 days
  spark_month_sales: number[]  // sales per day, this month so far
  spark_month_exp: number[]    // expenses per day, this month so far
  prev_day_sales: number
  prev_month_sales: number     // last month, same day-of-month cutoff
  prev_month_expenses: number
}

/** Sum `rows` into one bucket per day between start..end (inclusive). */
function dailySeries<T>(rows: T[], start: dayjs.Dayjs, days: number, dateOf: (r: T) => string, amountOf: (r: T) => number) {
  const out = Array(days).fill(0) as number[]
  rows.forEach((r) => {
    const i = dayjs(dateOf(r)).startOf('day').diff(start.startOf('day'), 'day')
    if (i >= 0 && i < days) out[i] += amountOf(r)
  })
  return out
}

/** There is no activity/audit table being written to, so the feed is derived by
 *  merging the newest rows from each entity table and sorting by created_at. */
type ActivityType = 'sale' | 'purchase' | 'product' | 'expense' | 'shipment'

interface Activity {
  key: string
  type: ActivityType
  ref?: string | null      // ref_number / tracking number, shown inline
  name?: string | null     // product name
  amount?: number          // shown as the secondary line
  at: string
  href: string             // tap through to the record
}

const ACTIVITY_META: Record<ActivityType, { labelKey: TKey; cls: string; icon: JSX.Element }> = {
  sale: {
    labelKey: 'activity.sale', cls: 'bg-[#1877F2]/10 text-[#1877F2]',
    icon: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="5" width="20" height="14" rx="2" /><path d="M2 10h20" /></svg>,
  },
  purchase: {
    labelKey: 'activity.purchase', cls: 'bg-indigo-50 text-indigo-500',
    icon: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 002 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z" /><path d="M3.27 6.96L12 12.01l8.73-5.05" /></svg>,
  },
  product: {
    labelKey: 'activity.product', cls: 'bg-purple-50 text-purple-500',
    icon: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z" /><line x1="7" y1="7" x2="7.01" y2="7" /></svg>,
  },
  expense: {
    labelKey: 'activity.expense', cls: 'bg-red-50 text-red-500',
    icon: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23" /><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" /></svg>,
  },
  shipment: {
    labelKey: 'activity.shipment', cls: 'bg-orange-50 text-orange-500',
    icon: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 3h15v13H1zM16 8h4l3 3v5h-7V8z" /><circle cx="5.5" cy="18.5" r="2.5" /><circle cx="18.5" cy="18.5" r="2.5" /></svg>,
  },
}

export default function DashboardPage() {
  const { shopId } = useParams<{ shopId: string }>()
  const router = useRouter()
  const { shop, lineDisplayName, linePictureUrl, lineUid, jwt, clear } = useShopStore()
  const t = useT()
  const lang = useLangStore((s) => s.lang)
  const notifyLowStock = useNotifyStore((s) => s.lowStock)
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [activity, setActivity] = useState<Activity[]>([])
  const [showProfile, setShowProfile] = useState(false)

  // Axis for the month-to-date chart: always 1 → end of month, whatever today is.
  const daysInMonth = dayjs().daysInMonth()
  const dayTicks = [1, 8, 15, 22, daysInMonth]

  useEffect(() => {
    if (!shop || !lineUid) return
    const sb = createSupabaseClient(jwt ?? undefined)

    const now = dayjs()
    const dayOfMonth = now.date()                        // 1..31 — how far into the month we are
    const monthStart = now.startOf('month')
    const lastMonthStart = monthStart.subtract(1, 'month')
    const weekStart = now.subtract(6, 'day').startOf('day')

    // One window covering everything (from the start of LAST month) instead of a query per
    // figure: the trend lines and the month-over-month baselines all come out of the same rows.
    const from = lastMonthStart.toISOString()
    const fromDate = lastMonthStart.format('YYYY-MM-DD')

    Promise.all([
      sb.from('sales').select('total_amount, created_at').eq('shop_id', shop.id).gte('created_at', from),
      sb.from('expenses').select('amount, expense_date').eq('shop_id', shop.id).gte('expense_date', fromDate),
      // Shipping cost lives on shipments, not the expenses table — fold it in so this
      // figure agrees with the P&L on the reports page.
      sb.from('shipments').select('shipping_cost, created_at').eq('shop_id', shop.id).gte('created_at', from),
      sb.from('products').select('id').eq('shop_id', shop.id).lt('stock', 3).eq('is_active', true),
      sb.from('shipments').select('id').eq('shop_id', shop.id).eq('status', 'shipped'),
    ]).then(([saleRes, expRes, shipRes, lowRes, pendRes]) => {
      const sales = (saleRes.data ?? []).map((r) => ({ at: r.created_at as string, v: Number(r.total_amount) }))
      const costs = [
        ...(expRes.data ?? []).map((r) => ({ at: r.expense_date as string, v: Number(r.amount) })),
        ...(shipRes.data ?? []).map((r) => ({ at: r.created_at as string, v: Number(r.shipping_cost) })),
      ]

      const inRange = (at: string, start: dayjs.Dayjs, end: dayjs.Dayjs) => {
        const d = dayjs(at)
        return !d.isBefore(start) && !d.isAfter(end)
      }
      const sum = (rows: { at: string; v: number }[], start: dayjs.Dayjs, end: dayjs.Dayjs) =>
        rows.filter((r) => inRange(r.at, start, end)).reduce((a, r) => a + r.v, 0)

      const todayStart = now.startOf('day')
      const yStart = todayStart.subtract(1, 'day')

      // Compare the month against the SAME slice of last month (1st → today's date).
      // A partial month measured against a full one always looks like a collapse.
      const lastMonthCutoff = lastMonthStart.date(Math.min(dayOfMonth, lastMonthStart.daysInMonth())).endOf('day')

      setStats({
        today_sales: sum(sales, todayStart, now),
        today_orders: sales.filter((r) => inRange(r.at, todayStart, now)).length,
        month_sales: sum(sales, monthStart, now),
        month_expenses: sum(costs, monthStart, now),
        low_stock: lowRes.data?.length ?? 0,
        pending_shipments: pendRes.data?.length ?? 0,

        spark_today: dailySeries(sales, weekStart, 7, (r) => r.at, (r) => r.v),
        spark_month_sales: dailySeries(sales, monthStart, dayOfMonth, (r) => r.at, (r) => r.v),
        spark_month_exp: dailySeries(costs, monthStart, dayOfMonth, (r) => r.at, (r) => r.v),

        prev_day_sales: sum(sales, yStart, yStart.endOf('day')),
        prev_month_sales: sum(sales, lastMonthStart, lastMonthCutoff),
        prev_month_expenses: sum(costs, lastMonthStart, lastMonthCutoff),
      })
    })
  }, [shop, lineUid])

  // Recent activity — pull the latest few from each table, then merge and sort.
  useEffect(() => {
    if (!shop || !lineUid) return
    const sb = createSupabaseClient(jwt ?? undefined)
    const recent = (table: string, cols: string) =>
      sb.from(table).select(cols).eq('shop_id', shop.id).order('created_at', { ascending: false }).limit(5)

    Promise.all([
      recent('sales', 'id, ref_number, total_amount, created_at'),
      recent('purchases', 'id, ref_number, total_amount, created_at'),
      recent('products', 'id, name, created_at'),
      recent('expenses', 'id, amount, created_at'),
      recent('shipments', 'id, tracking_number, created_at'),
    ]).then(([sales, purchases, products, expenses, shipments]) => {
      const rows = (res: { data: unknown }) => (res.data ?? []) as any[]
      const b = `/shop/${shopId}`
      const merged: Activity[] = [
        ...rows(sales).map((r) => ({ key: `sale-${r.id}`, type: 'sale' as const, ref: r.ref_number, amount: Number(r.total_amount), at: r.created_at, href: `${b}/sales/${r.id}` })),
        ...rows(purchases).map((r) => ({ key: `purchase-${r.id}`, type: 'purchase' as const, ref: r.ref_number, amount: Number(r.total_amount), at: r.created_at, href: `${b}/purchases/${r.id}` })),
        ...rows(products).map((r) => ({ key: `product-${r.id}`, type: 'product' as const, name: r.name, at: r.created_at, href: `${b}/products/${r.id}` })),
        ...rows(expenses).map((r) => ({ key: `expense-${r.id}`, type: 'expense' as const, amount: Number(r.amount), at: r.created_at, href: `${b}/expenses` })),
        ...rows(shipments).map((r) => ({ key: `shipment-${r.id}`, type: 'shipment' as const, ref: r.tracking_number, at: r.created_at, href: `${b}/shipments/${r.id}` })),
      ]
      setActivity(merged.sort((a, b) => b.at.localeCompare(a.at)).slice(0, 6))
    })
  }, [shop, lineUid])

  if (!shop) return null
  const base = `/shop/${shopId}`

  return (
    <div>
      {/* Profile sheet */}
      {showProfile && (
        <>
          <div className="fixed inset-0 bg-black/30 z-40 backdrop-blur-sm" onClick={() => setShowProfile(false)} />
          <div className="fixed bottom-0 left-0 right-0 max-w-[430px] mx-auto z-50 bg-white rounded-t-[32px] p-6 pb-10">
            <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-6" />
            <div className="flex flex-col items-center gap-3 mb-6">
              {linePictureUrl
                ? <img src={linePictureUrl} className="w-16 h-16 rounded-full ring-4 ring-gray-100" alt="" />
                : <div className="w-16 h-16 rounded-full bg-[#1877F2]/15 flex items-center justify-center text-2xl font-bold text-[#1877F2]">{lineDisplayName?.[0] ?? '?'}</div>
              }
              <div className="text-center">
                <p className="font-bold text-gray-900">{lineDisplayName}</p>
                <p className="text-xs text-gray-400 mt-0.5">{lineUid}</p>
              </div>
            </div>
            <button onClick={() => { localStorage.removeItem('khaai_last_shop'); clear(); router.push('/') }}
              className="w-full flex items-center gap-3 bg-gray-50 rounded-2xl px-4 py-3.5 active:bg-gray-100 transition-colors">
              <div className="w-9 h-9 rounded-xl bg-white shadow-sm flex items-center justify-center">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 1l4 4-4 4" /><path d="M3 11V9a4 4 0 014-4h14M7 23l-4-4 4-4" /><path d="M21 13v2a4 4 0 01-4 4H3" /></svg>
              </div>
              <div className="text-left">
                <p className="text-sm font-semibold text-gray-900">{t('dashboard.switchShop')}</p>
                <p className="text-xs text-gray-400">{t('dashboard.switchShopDesc')}</p>
              </div>
            </button>
          </div>
        </>
      )}

      {/* Header card — brand blue deepening into navy, with light ribbons + sparkles on top */}
      <div className="relative overflow-hidden rounded-b-[36px] bg-gradient-to-br from-[#3D8DFF] via-[#1877F2] to-[#0A3A93] px-4 pt-8 pb-14 shadow-[0_10px_30px_rgba(24,119,242,0.35)]">
        <HeaderDecor />

        <div className="relative">
          <div className="flex items-center gap-3 mb-6">
            <button onClick={() => setShowProfile(true)} className="active:scale-95 transition-transform flex-shrink-0">
              {linePictureUrl
                ? <img src={linePictureUrl} className="w-11 h-11 rounded-full ring-2 ring-white/50 shadow-[0_4px_12px_rgba(0,0,0,0.2)]" alt="" />
                : <div className="w-11 h-11 rounded-full bg-white/25 ring-2 ring-white/40 flex items-center justify-center text-white font-bold text-sm">{lineDisplayName?.[0] ?? '?'}</div>
              }
            </button>
            <div className="flex-1 min-w-0">
              <p className="text-white/70 text-[11px] leading-tight">{t('dashboard.hello')}</p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <p className="text-white font-bold text-sm leading-tight truncate">{lineDisplayName}</p>
                {/* Real plan from the shop record, not decoration */}
                <span className="text-[9px] font-bold uppercase tracking-wide bg-white/20 text-white px-1.5 py-0.5 rounded-md flex-shrink-0">
                  {shop.plan}
                </span>
              </div>
            </div>
          </div>

          <h1 className="text-white text-3xl font-bold leading-tight tracking-tight">{shop.name}</h1>

          {/* <div className="inline-flex items-center gap-1.5 mt-2.5 bg-white/15 backdrop-blur-sm rounded-full pl-2 pr-3 py-1">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="opacity-80">
              <rect x="3" y="4" width="18" height="18" rx="2" />
              <line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
            </svg>
            <span className="text-white/90 text-[11px] font-medium">
              {dayjs().locale(lang).format('dddd D MMMM YYYY')}
            </span>
          </div> */}
        </div>
      </div>

      {/* z-10: the header above is `relative`, so a static sibling would be painted
          under it — the -mt-6 pull would tuck this card behind the header. */}
      <div className="relative z-10 px-4 -mt-6 space-y-3 pb-8">
        {/* Today card — float over header */}
        <div className="bg-white rounded-3xl p-5 shadow-[0_8px_32px_rgba(0,0,0,0.12)]">
          <div className="flex items-center gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 mb-1">
                <p className="text-xs text-gray-400 font-medium">{t('dashboard.salesToday')}</p>
                {stats && <DeltaBadge current={stats.today_sales} previous={stats.prev_day_sales} />}
              </div>
              <p className="text-3xl font-bold text-gray-900 tracking-tight truncate">
                {stats ? formatMoneyFull(stats.today_sales) : '—'}
              </p>
              {/* Order count sits in a chip so it reads as a separate metric, not a caption */}
              <span className="mt-2 inline-flex items-center gap-1 rounded-full bg-[#1877F2]/[0.07] px-2 py-1 text-[11px] font-semibold text-[#1877F2]">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M6 2 3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" /><path d="M3 6h18M16 10a4 4 0 01-8 0" />
                </svg>
                {t('dashboard.ordersToday', { n: stats?.today_orders ?? 0 })}
              </span>
            </div>

            <span className="w-12 h-12 flex-shrink-0 rounded-2xl flex items-center justify-center text-white bg-gradient-to-br from-[#5AA4FF] to-[#1877F2] shadow-[0_6px_16px_rgba(24,119,242,0.4)]">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 7H5a2 2 0 01-2-2 2 2 0 012-2h13a1 1 0 011 1v3z" />
                <path d="M3 5v14a2 2 0 002 2h15a1 1 0 001-1v-3" />
                <path d="M18 12a2 2 0 000 4h4v-4h-4z" />
              </svg>
            </span>
          </div>

          {/* Month-to-date trend. The line stops at today (axisLength = full month), so the
              flat stretch on the right is "hasn't happened yet", not "sold nothing". */}
          {stats && stats.spark_month_sales.length > 1 && (
            <div className="mt-3">
              <Sparkline
                data={stats.spark_month_sales}
                axisLength={daysInMonth}
                color="#1877F2"
                className="w-full h-10"
              />
              <div className="flex justify-between mt-1 text-[9px] text-gray-300 font-medium tabular-nums">
                {dayTicks.map((d) => <span key={d}>{d}</span>)}
              </div>
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white rounded-3xl p-4 shadow-[0_2px_12px_rgba(0,0,0,0.07)]">
            <p className="text-[10px] text-gray-400 font-medium mb-1.5">{t('dashboard.salesMonth')}</p>
            {/* Trend line tucks in beside the figure — it's context, not the headline */}
            <div className="flex items-end justify-between gap-2">
              <div className="min-w-0">
                <p className="text-sm font-bold text-[#1877F2] truncate">{stats ? formatMoneyFull(stats.month_sales) : '—'}</p>
                {stats && <DeltaBadge current={stats.month_sales} previous={stats.prev_month_sales} />}
              </div>
              {stats && <Sparkline data={stats.spark_month_sales} color="#1877F2" className="w-12 h-6 flex-shrink-0" />}
            </div>
          </div>
          <div className="bg-white rounded-3xl p-4 shadow-[0_2px_12px_rgba(0,0,0,0.07)]">
            <p className="text-[10px] text-gray-400 font-medium mb-1.5">{t('dashboard.expenses')}</p>
            <div className="flex items-end justify-between gap-2">
              <div className="min-w-0">
                <p className="text-sm font-bold text-red-500 truncate">{stats ? formatMoneyFull(stats.month_expenses) : '—'}</p>
                {/* invert: spending MORE is not good news, so up must not be green */}
                {stats && <DeltaBadge current={stats.month_expenses} previous={stats.prev_month_expenses} invert />}
              </div>
              {stats && <Sparkline data={stats.spark_month_exp} color="#ef4444" className="w-12 h-6 flex-shrink-0" />}
            </div>
          </div>
        </div>

        {/* Alerts — low stock is opt-out in /settings/notifications */}
        {notifyLowStock && (stats?.low_stock ?? 0) > 0 && (
          <Link href={`${base}/products?filter=low_stock`}
            className="flex items-center gap-3 bg-amber-50 rounded-3xl p-4 active:bg-amber-100 transition-colors">
            <div className="w-10 h-10 rounded-2xl bg-amber-100 flex items-center justify-center flex-shrink-0">
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-amber-800">{t('dashboard.lowStock')}</p>
              <p className="text-xs text-amber-500 mt-0.5">{t('dashboard.lowStockDesc', { n: stats?.low_stock ?? 0 })}</p>
            </div>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6" /></svg>
          </Link>
        )}
        {(stats?.pending_shipments ?? 0) > 0 && (
          <Link href={`${base}/shipments`}
            className="flex items-center gap-3 bg-blue-50 rounded-3xl p-4 active:bg-blue-100 transition-colors">
            <div className="w-10 h-10 rounded-2xl bg-blue-100 flex items-center justify-center flex-shrink-0">
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 3h15v13H1zM16 8h4l3 3v5h-7V8z" /><circle cx="5.5" cy="18.5" r="2.5" /><circle cx="18.5" cy="18.5" r="2.5" /></svg>
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-blue-800">{t('dashboard.pendingShip')}</p>
              <p className="text-xs text-blue-400 mt-0.5">{t('dashboard.pendingShipDesc', { n: stats?.pending_shipments ?? 0 })}</p>
            </div>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6" /></svg>
          </Link>
        )}

        {/* Quick actions — solid gradient badges with a matching glow, so each action
            is told apart by colour first and icon second. */}
        <p className="text-xs font-bold text-gray-400 tracking-wide pt-1">{t('dashboard.quickMenu')}</p>
        {/* Same gradients as the FAB radial menu, minus the coloured glow: the FAB needs the
            glow to lift off whatever page it floats over — here the badges sit flat on the
            page, so the shadow is decoration with nothing to do. */}
        <div className="grid grid-cols-4 gap-2">
          {[
            {
              badge: 'bg-gradient-to-br from-[#5AA4FF] to-[#1877F2]',
              label: t('dashboard.recordSale'), href: `${base}/sales/new`,
              icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="5" width="20" height="14" rx="2" /><path d="M2 10h20M6 15h4M14 15h4" /></svg>,
            },
            {
              badge: 'bg-gradient-to-br from-[#8B92F8] to-[#4F46E5]',
              label: t('dashboard.recordPurchase'), href: `${base}/purchases/new`,
              icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 002 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z" /><polyline points="3.27 6.96 12 12.01 20.73 6.96" /><line x1="12" y1="22.08" x2="12" y2="12" /></svg>,
            },
            {
              badge: 'bg-gradient-to-br from-[#FDBA74] to-[#F97316]',
              label: t('dashboard.shipParcel'), href: `${base}/shipments/new`,
              icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M1 3h15v13H1zM16 8h4l3 3v5h-7V8z" /><circle cx="5.5" cy="18.5" r="2.5" /><circle cx="18.5" cy="18.5" r="2.5" /></svg>,
            },
            {
              badge: 'bg-gradient-to-br from-[#FB7185] to-[#E11D48]',
              label: t('dashboard.expense'), href: `${base}/expenses/new`,
              icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23" /><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" /></svg>,
            },
          ].map((item) => (
            <Link key={item.href} href={item.href}
              className="flex flex-col items-center gap-2 py-1 active:scale-95 transition-transform">
              <div className={`w-14 h-14 rounded-full flex items-center justify-center text-white ${item.badge}`}>
                {item.icon}
              </div>
              <span className="text-[11px] font-semibold text-gray-500 text-center leading-tight">{item.label}</span>
            </Link>
          ))}
        </div>

        {/* Recent activity */}
        {activity.length > 0 && (
          <>
            <p className="text-xs font-bold text-gray-400 tracking-wide pt-1">{t('activity.title')}</p>
            <div className="bg-white rounded-3xl shadow-[0_2px_16px_rgba(0,0,0,0.07)] overflow-hidden">
              {activity.map((a, i) => {
                const meta = ACTIVITY_META[a.type]
                const at = dayjs(a.at)
                const when = at.isSame(dayjs(), 'day')
                  ? at.format('HH:mm')
                  : at.locale(lang).format('D MMM')

                return (
                  <Link key={a.key} href={a.href}
                    className={`flex items-center gap-2.5 px-3.5 py-2 active:bg-gray-50 transition-colors ${i > 0 ? 'border-t border-gray-100' : ''}`}>
                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${meta.cls}`}>
                      {meta.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-semibold text-gray-900 truncate leading-tight">
                        {t(meta.labelKey)}
                        {a.ref && <span className="text-gray-400 font-normal"> {a.ref}</span>}
                        {a.name && <span className="text-gray-400 font-normal"> · {a.name}</span>}
                      </p>
                      {a.amount != null && (
                        <p className="text-[10px] text-gray-400 leading-tight mt-0.5">{formatMoneyFull(a.amount)}</p>
                      )}
                    </div>
                    <span className="text-[10px] text-gray-300 flex-shrink-0 tabular-nums">{when}</span>
                  </Link>
                )
              })}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
