'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { useShopStore } from '@/store/shopStore'
import { createSupabaseClient } from '@/lib/supabase'
import { formatDateTime, formatMoneyFull } from '@/lib/format'
import { useT, type TKey } from '@/lib/i18n'
import { MonthFilter, monthRange } from '@/components/MonthFilter'
import dayjs from 'dayjs'
import type { Shipment } from '@/lib/types'

const STATUS_MAP: Record<string, { labelKey: TKey; color: string }> = {
  pending:   { labelKey: 'shipments.statusPending',   color: 'bg-amber-50 text-amber-700' },
  shipped:   { labelKey: 'shipments.statusShipped',   color: 'bg-blue-50 text-blue-700' },
  delivered: { labelKey: 'shipments.statusDelivered', color: 'bg-green-50 text-green-700' },
}

export default function ShipmentsPage() {
  const { shopId } = useParams<{ shopId: string }>()
  const { shop, lineUid, jwt } = useShopStore()
  const t = useT()
  const [shipments, setShipments] = useState<Shipment[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [month, setMonth] = useState(dayjs().format('YYYY-MM'))
  const [syncing, setSyncing] = useState(false)
  const [syncResult, setSyncResult] = useState<string | null>(null)

  useEffect(() => {
    if (!shop || !lineUid) return
    setLoading(true)
    const { start, end } = monthRange(month)
    createSupabaseClient(jwt ?? undefined)
      // Pull the linked sale's items so the card can lead with WHAT was shipped, not just the tracking no.
      .from('shipments').select('*, sale:sales(items:sale_items(quantity, product:products(name)))')
      .eq('shop_id', shop.id)
      .gte('created_at', start).lte('created_at', end)
      .order('created_at', { ascending: false })
      .then(({ data }) => { setShipments((data ?? []) as Shipment[]); setLoading(false) })
  }, [shop, lineUid, month])

  const filtered = statusFilter === 'all' ? shipments : shipments.filter((s) => s.status === statusFilter)

  const markDelivered = async (id: string) => {
    if (!lineUid) return
    const sb = createSupabaseClient(jwt ?? undefined)
    const now = new Date().toISOString()
    await sb.from('shipments').update({ status: 'delivered', delivered_at: now }).eq('id', id)
    setShipments((prev) => prev.map((s) => s.id === id ? { ...s, status: 'delivered', delivered_at: now } : s))
  }

  const syncFlash = async () => {
    if (!lineUid || syncing) return
    setSyncing(true); setSyncResult(null)
    const pending = shipments.filter(
      (s) => s.status !== 'delivered' && s.tracking_number && (!s.carrier || s.carrier.toLowerCase().includes('flash'))
    )
    if (pending.length === 0) { setSyncResult(t('shipments.flashNoPending')); setSyncing(false); return }
    try {
      const res = await fetch('/api/flash-track', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ trackingNumbers: pending.map((s) => s.tracking_number!) }),
      })
      const { results } = await res.json()
      const sb = createSupabaseClient(jwt ?? undefined)
      const now = new Date().toISOString()
      let updated = 0
      for (const s of pending) {
        if (results[s.tracking_number!]?.delivered) {
          await sb.from('shipments').update({ status: 'delivered', delivered_at: now }).eq('id', s.id)
          updated++
        }
      }
      if (updated > 0) setShipments((prev) => prev.map((s) => pending.find((p) => p.id === s.id) && results[s.tracking_number!]?.delivered ? { ...s, status: 'delivered', delivered_at: now } : s))
      setSyncResult(updated > 0 ? t('shipments.flashUpdated', { n: updated }) : t('shipments.flashChecked', { n: pending.length }))
    } catch { setSyncResult(t('shipments.flashError')) }
    finally { setSyncing(false); setTimeout(() => setSyncResult(null), 4000) }
  }

  const pendingFlashCount = shipments.filter(
    (s) => s.status !== 'delivered' && s.tracking_number && (!s.carrier || s.carrier.toLowerCase().includes('flash'))
  ).length

  return (
    <div className="pb-32">
      <div className="px-4 pt-8 pb-4 flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">{t('shipments.title')}</h1>
        <Link href={`/shop/${shopId}/shipments/new`}
          className="bg-orange-500 text-white text-sm font-semibold px-4 py-2.5 rounded-2xl shadow-[0_4px_12px_rgba(249,115,22,0.35)] active:scale-95 transition-transform">
          {t('shipments.newBtn')}
        </Link>
      </div>

      {/* Month first — it's the widest cut (picks the period), status narrows within it */}
      <div className="px-4 mb-3">
        <MonthFilter month={month} onChange={setMonth} />
      </div>

      {/* Filter pills */}
      <div className="flex gap-2 px-4 mb-3 overflow-x-auto no-scrollbar">
        {([['all', 'common.all'], ['pending', 'shipments.statusPending'], ['shipped', 'shipments.statusShipped'], ['delivered', 'shipments.statusDelivered']] as const).map(([key, labelKey]) => (
          <button key={key} onClick={() => setStatusFilter(key)}
            className={`px-4 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap flex-shrink-0 transition-colors ${statusFilter === key ? 'bg-[#1877F2] text-white' : 'bg-white text-gray-400 shadow-[0_1px_4px_rgba(0,0,0,0.08)]'}`}>
            {t(labelKey)}
          </button>
        ))}
      </div>

      {/* Flash sync */}
      <div className="px-4 mb-3">
        <button onClick={syncFlash} disabled={syncing || pendingFlashCount === 0}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl bg-orange-500 text-white text-sm font-semibold shadow-[0_4px_12px_rgba(249,115,22,0.3)] disabled:bg-gray-100 disabled:text-gray-400 disabled:shadow-none transition-all active:scale-[0.98]">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={syncing ? 'animate-spin' : ''}>
            <path d="M21 12a9 9 0 11-6.219-8.56"/><path d="M21 3v9h-9"/>
          </svg>
          {syncing ? t('shipments.flashSyncing') : pendingFlashCount > 0 ? t('shipments.flashUpdate', { n: pendingFlashCount }) : t('shipments.flashNone')}
        </button>
        {syncResult && (
          <div className="mt-2 px-4 py-2.5 rounded-2xl bg-blue-50 text-blue-700 text-xs font-semibold text-center">{syncResult}</div>
        )}
      </div>

      <div className="px-4 space-y-3">
        {loading && [1,2,3].map(i => <div key={i} className="h-24 bg-white rounded-3xl animate-pulse shadow-[0_2px_12px_rgba(0,0,0,0.06)]" />)}

        {!loading && filtered.length === 0 && (
          <div className="text-center py-20">
            <div className="w-20 h-20 bg-gray-100 rounded-3xl mx-auto mb-4 flex items-center justify-center">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M1 3h15v13H1zM16 8h4l3 3v5h-7V8z"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>
            </div>
            <p className="font-semibold text-gray-700">{t('shipments.empty')}</p>
          </div>
        )}

        {filtered.map((s) => {
          const statusInfo = STATUS_MAP[s.status as keyof typeof STATUS_MAP]
          const isFlash = !s.carrier || s.carrier.toLowerCase().includes('flash')
          // "Maono pd300x" · "Maono pd300x +2 รายการ" — what's inside the parcel, from the linked sale.
          const items = (s as any).sale?.items ?? []
          const firstItem = items[0]?.product?.name
          const itemsLabel = firstItem
            ? (items.length > 1 ? `${firstItem} ${t('common.moreItems', { n: items.length - 1 })}` : firstItem)
            : null
          return (
            <Link key={s.id} href={`/shop/${shopId}/shipments/${s.id}`}
              className="block bg-white rounded-3xl p-4 shadow-[0_2px_12px_rgba(0,0,0,0.07)] active:scale-[0.98] transition-transform">
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1 min-w-0">
                  {/* Lead with the product shipped — that's what the shop recognises, not the tracking code.
                      Falls back to the tracking number for parcels with no linked sale. */}
                  <div className="flex items-center gap-2 flex-wrap mb-0.5">
                    <span className="text-sm font-bold text-gray-900 truncate">{itemsLabel ?? s.tracking_number ?? t('shipments.noTracking')}</span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${statusInfo.color}`}>{t(statusInfo.labelKey)}</span>
                    {isFlash && s.status !== 'delivered' && <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold bg-orange-50 text-orange-600">Flash</span>}
                  </div>
                  {/* Tracking as a small line when a product is shown above, so both stay visible */}
                  {itemsLabel && s.tracking_number && (
                    <p className="text-[11px] text-gray-400 font-medium tracking-wide mb-0.5">{s.tracking_number}</p>
                  )}
                  <p className="text-xs text-gray-400">{s.carrier ?? 'Flash Express'} · {t('shipments.shipCostLabel')} {formatMoneyFull(s.shipping_cost)}</p>
                  <p className="text-[11px] text-gray-300 mt-0.5">{formatDateTime(s.created_at)}</p>
                </div>
              </div>
              {s.status === 'shipped' && (
                <button onClick={(e) => { e.preventDefault(); markDelivered(s.id) }}
                  className="w-full py-2.5 rounded-2xl bg-[#1877F2]/10 text-[#1877F2] text-xs font-semibold active:bg-[#1877F2]/20 transition-colors mt-1">
                  {t('shipments.confirmDelivered')}
                </button>
              )}
            </Link>
          )
        })}
      </div>
    </div>
  )
}
