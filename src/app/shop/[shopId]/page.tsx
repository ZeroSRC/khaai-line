'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { useShopStore } from '@/store/shopStore'
import { createSupabaseClient } from '@/lib/supabase'
import { formatMoneyFull } from '@/lib/format'
import { useT, type TKey } from '@/lib/i18n'
import { useLangStore } from '@/store/langStore'
import dayjs from 'dayjs'

interface DashboardStats {
  today_sales: number; today_orders: number; month_sales: number
  month_expenses: number; low_stock: number; pending_shipments: number
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
    icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/></svg>,
  },
  purchase: {
    labelKey: 'activity.purchase', cls: 'bg-indigo-50 text-indigo-500',
    icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 002 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/><path d="M3.27 6.96L12 12.01l8.73-5.05"/></svg>,
  },
  product: {
    labelKey: 'activity.product', cls: 'bg-purple-50 text-purple-500',
    icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>,
  },
  expense: {
    labelKey: 'activity.expense', cls: 'bg-red-50 text-red-500',
    icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg>,
  },
  shipment: {
    labelKey: 'activity.shipment', cls: 'bg-orange-50 text-orange-500',
    icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 3h15v13H1zM16 8h4l3 3v5h-7V8z"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>,
  },
}

export default function DashboardPage() {
  const { shopId } = useParams<{ shopId: string }>()
  const router = useRouter()
  const { shop, lineDisplayName, linePictureUrl, lineUid, jwt, clear } = useShopStore()
  const t = useT()
  const lang = useLangStore((s) => s.lang)
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [activity, setActivity] = useState<Activity[]>([])
  const [showProfile, setShowProfile] = useState(false)

  useEffect(() => {
    if (!shop || !lineUid) return
    const sb = createSupabaseClient(jwt ?? undefined)
    const today = dayjs().format('YYYY-MM-DD')
    const monthStart = dayjs().startOf('month').toISOString()
    Promise.all([
      sb.from('sales').select('total_amount').eq('shop_id', shop.id).gte('created_at', today),
      sb.from('sales').select('total_amount').eq('shop_id', shop.id).gte('created_at', monthStart),
      sb.from('expenses').select('amount').eq('shop_id', shop.id).gte('expense_date', dayjs().startOf('month').format('YYYY-MM-DD')),
      sb.from('products').select('id').eq('shop_id', shop.id).lt('stock', 3).eq('is_active', true),
      sb.from('shipments').select('id').eq('shop_id', shop.id).eq('status', 'shipped'),
      // Shipping cost lives on shipments, not the expenses table — fold it in so this
      // figure agrees with the P&L on the reports page.
      sb.from('shipments').select('shipping_cost').eq('shop_id', shop.id).gte('created_at', monthStart),
    ]).then(([t, m, e, l, s, ship]) => setStats({
      today_sales: (t.data ?? []).reduce((a, r) => a + Number(r.total_amount), 0),
      today_orders: t.data?.length ?? 0,
      month_sales: (m.data ?? []).reduce((a, r) => a + Number(r.total_amount), 0),
      month_expenses:
        (e.data ?? []).reduce((a, r) => a + Number(r.amount), 0) +
        (ship.data ?? []).reduce((a, r) => a + Number(r.shipping_cost), 0),
      low_stock: l.data?.length ?? 0,
      pending_shipments: s.data?.length ?? 0,
    }))
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
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 1l4 4-4 4"/><path d="M3 11V9a4 4 0 014-4h14M7 23l-4-4 4-4"/><path d="M21 13v2a4 4 0 01-4 4H3"/></svg>
              </div>
              <div className="text-left">
                <p className="text-sm font-semibold text-gray-900">{t('dashboard.switchShop')}</p>
                <p className="text-xs text-gray-400">{t('dashboard.switchShopDesc')}</p>
              </div>
            </button>
          </div>
        </>
      )}

      {/* Header card — gradient + soft orbs so it reads as a surface, not a flat block */}
      <div className="relative overflow-hidden rounded-b-[36px] bg-gradient-to-br from-[#4C9BFF] via-[#1877F2] to-[#0B57C9] px-4 pt-8 pb-14 shadow-[0_10px_30px_rgba(24,119,242,0.3)]">
        {/* Decorative orbs */}
        <div aria-hidden className="pointer-events-none absolute -top-16 -right-8 w-52 h-52 rounded-full bg-white/[0.13]" />
        <div aria-hidden className="pointer-events-none absolute top-20 -right-24 w-44 h-44 rounded-full bg-white/[0.08]" />
        <div aria-hidden className="pointer-events-none absolute -bottom-20 -left-14 w-48 h-48 rounded-full bg-white/[0.07]" />

        <div className="relative">
          <div className="flex items-center gap-3 mb-5">
            <button onClick={() => setShowProfile(true)} className="active:scale-95 transition-transform">
              {linePictureUrl
                ? <img src={linePictureUrl} className="w-10 h-10 rounded-full ring-2 ring-white/40" alt="" />
                : <div className="w-10 h-10 rounded-full bg-white/25 flex items-center justify-center text-white font-bold text-sm">{lineDisplayName?.[0] ?? '?'}</div>
              }
            </button>
            <div className="flex-1">
              <p className="text-white/70 text-[11px]">{t('dashboard.hello')}</p>
              <p className="text-white font-bold text-sm leading-tight">{lineDisplayName}</p>
            </div>
          </div>
          <h1 className="text-white text-2xl font-bold leading-tight">{shop.name}</h1>
          <p className="text-white/60 text-xs mt-0.5">{dayjs().locale(lang).format('dddd D MMMM YYYY')}</p>
        </div>
      </div>

      {/* z-10: the header above is `relative`, so a static sibling would be painted
          under it — the -mt-6 pull would tuck this card behind the header. */}
      <div className="relative z-10 px-4 -mt-6 space-y-3 pb-8">
        {/* Today card — float over header */}
        <div className="bg-white rounded-3xl p-5 shadow-[0_8px_32px_rgba(0,0,0,0.12)]">
          <p className="text-xs text-gray-400 font-medium mb-1">{t('dashboard.salesToday')}</p>
          <p className="text-3xl font-bold text-gray-900 tracking-tight">{stats ? formatMoneyFull(stats.today_sales) : '—'}</p>
          <p className="text-xs text-gray-400 mt-1.5">{t('dashboard.ordersToday', { n: stats?.today_orders ?? 0 })}</p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white rounded-3xl p-4 shadow-[0_2px_12px_rgba(0,0,0,0.07)]">
            <p className="text-[10px] text-gray-400 font-medium mb-1.5">{t('dashboard.salesMonth')}</p>
            <p className="text-sm font-bold text-[#1877F2]">{stats ? formatMoneyFull(stats.month_sales) : '—'}</p>
          </div>
          <div className="bg-white rounded-3xl p-4 shadow-[0_2px_12px_rgba(0,0,0,0.07)]">
            <p className="text-[10px] text-gray-400 font-medium mb-1.5">{t('dashboard.expenses')}</p>
            <p className="text-sm font-bold text-red-500">{stats ? formatMoneyFull(stats.month_expenses) : '—'}</p>
          </div>
        </div>

        {/* Alerts */}
        {(stats?.low_stock ?? 0) > 0 && (
          <Link href={`${base}/products?filter=low_stock`}
            className="flex items-center gap-3 bg-amber-50 rounded-3xl p-4 active:bg-amber-100 transition-colors">
            <div className="w-10 h-10 rounded-2xl bg-amber-100 flex items-center justify-center flex-shrink-0">
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-amber-800">{t('dashboard.lowStock')}</p>
              <p className="text-xs text-amber-500 mt-0.5">{t('dashboard.lowStockDesc', { n: stats?.low_stock ?? 0 })}</p>
            </div>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
          </Link>
        )}
        {(stats?.pending_shipments ?? 0) > 0 && (
          <Link href={`${base}/shipments`}
            className="flex items-center gap-3 bg-blue-50 rounded-3xl p-4 active:bg-blue-100 transition-colors">
            <div className="w-10 h-10 rounded-2xl bg-blue-100 flex items-center justify-center flex-shrink-0">
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 3h15v13H1zM16 8h4l3 3v5h-7V8z"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-blue-800">{t('dashboard.pendingShip')}</p>
              <p className="text-xs text-blue-400 mt-0.5">{t('dashboard.pendingShipDesc', { n: stats?.pending_shipments ?? 0 })}</p>
            </div>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
          </Link>
        )}

        {/* Quick actions — solid gradient badges with a matching glow, so each action
            is told apart by colour first and icon second. */}
        <p className="text-xs font-bold text-gray-400 tracking-wide pt-1">{t('dashboard.quickMenu')}</p>
        <div className="grid grid-cols-4 gap-2.5">
          {[
            {
              grad: 'from-[#5AA4FF] to-[#1877F2]', glow: 'shadow-[0_5px_14px_rgba(24,119,242,0.45)]',
              label: t('dashboard.recordSale'), href: `${base}/sales/new`,
              icon: <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20M6 15h4M14 15h4"/></svg>,
            },
            {
              grad: 'from-[#8B92F8] to-[#4F46E5]', glow: 'shadow-[0_5px_14px_rgba(79,70,229,0.45)]',
              label: t('dashboard.recordPurchase'), href: `${base}/purchases/new`,
              icon: <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 002 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>,
            },
            {
              grad: 'from-[#FDBA74] to-[#F97316]', glow: 'shadow-[0_5px_14px_rgba(249,115,22,0.45)]',
              label: t('dashboard.shipParcel'), href: `${base}/shipments/new`,
              icon: <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M1 3h15v13H1zM16 8h4l3 3v5h-7V8z"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>,
            },
            {
              grad: 'from-[#FB7185] to-[#E11D48]', glow: 'shadow-[0_5px_14px_rgba(225,29,72,0.45)]',
              label: t('dashboard.expense'), href: `${base}/expenses/new`,
              icon: <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg>,
            },
          ].map((item) => (
            <Link key={item.href} href={item.href}
              className="bg-white rounded-3xl px-2 py-3.5 flex flex-col items-center gap-2.5 shadow-[0_2px_12px_rgba(0,0,0,0.06)] active:scale-95 transition-transform">
              <div className={`w-11 h-11 rounded-2xl flex items-center justify-center text-white bg-gradient-to-br ${item.grad} ${item.glow}`}>
                {item.icon}
              </div>
              <span className="text-[11px] font-semibold text-gray-600 text-center leading-tight">{item.label}</span>
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
                    className={`flex items-center gap-3 px-4 py-3 active:bg-gray-50 transition-colors ${i > 0 ? 'border-t border-gray-50' : ''}`}>
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${meta.cls}`}>
                      {meta.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900 truncate">
                        {t(meta.labelKey)}
                        {a.ref && <span className="text-gray-400 font-normal"> {a.ref}</span>}
                        {a.name && <span className="text-gray-400 font-normal"> · {a.name}</span>}
                      </p>
                      {a.amount != null && (
                        <p className="text-[11px] text-gray-400 mt-0.5">{formatMoneyFull(a.amount)}</p>
                      )}
                    </div>
                    <span className="text-[11px] text-gray-300 flex-shrink-0 tabular-nums">{when}</span>
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
