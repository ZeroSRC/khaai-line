'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useShopStore } from '@/store/shopStore'
import { createSupabaseClient } from '@/lib/supabase'
import { formatMoneyFull } from '@/lib/format'
import { useT } from '@/lib/i18n'
import dayjs from 'dayjs'
import type { Sale } from '@/lib/types'

const CARRIERS = ['ไปรษณีย์ไทย', 'Flash Express', 'Kerry', 'J&T', 'DHL', 'Ninja Van']

// Brand-coloured badges (approximations, not the actual trademarks) so carriers are
// recognisable by colour at a glance. Swap for real logo files under /public if available.
const cbadge = 'w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0'
const CARRIER_LOGOS: Record<string, JSX.Element> = {
  'ไปรษณีย์ไทย': (
    <span className={`${cbadge} bg-[#E30613] text-white`}>
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="4" width="20" height="16" rx="2"/><path d="M2 7l10 6 10-6"/>
      </svg>
    </span>
  ),
  'Flash Express': (
    <span className={`${cbadge} bg-[#FFE100] text-black`}>
      <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
        <path d="M13 2L4.5 13.5H11L9.5 22 19 10.5h-6.5L13 2z"/>
      </svg>
    </span>
  ),
  'Kerry': <span className={`${cbadge} bg-[#FF6D00] text-white text-[12px] font-black leading-none`}>K</span>,
  'J&T': <span className={`${cbadge} bg-[#EE1C25] text-white text-[10px] font-black leading-none`}>J&amp;T</span>,
  'DHL': <span className={`${cbadge} bg-[#FFCC00] text-[#D40511] text-[9px] font-black leading-none tracking-tight`}>DHL</span>,
  'Ninja Van': <span className={`${cbadge} bg-[#C8102E] text-white text-[12px] font-black leading-none`}>N</span>,
}

/** Selected date at the current time-of-day, so back-dated records land on the chosen day. */
function toTimestamp(date: string) {
  const n = dayjs()
  return dayjs(date).hour(n.hour()).minute(n.minute()).second(n.second()).toISOString()
}

const BackBtn = ({ onClick }: { onClick: () => void }) => (
  <button onClick={onClick} className="w-9 h-9 rounded-2xl bg-gray-50 flex items-center justify-center text-gray-500 active:bg-gray-100 transition-colors">
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
  </button>
)

const inp = 'w-full bg-gray-50 border-0 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#1877F2]/30'

export default function NewShipmentPage() {
  const { shopId } = useParams<{ shopId: string }>()
  const router = useRouter()
  const { shop, lineUid, jwt } = useShopStore()
  const t = useT()
  const [sales, setSales] = useState<Sale[]>([])
  const [saleId, setSaleId] = useState('')
  const [trackingNumber, setTrackingNumber] = useState('')
  const [carrier, setCarrier] = useState('')
  const [shippingCost, setShippingCost] = useState('')
  const [note, setNote] = useState('')
  const [date, setDate] = useState(dayjs().format('YYYY-MM-DD'))
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!shop || !lineUid) return
    const sb = createSupabaseClient(jwt ?? undefined)
    Promise.all([
      sb.from('sales').select('id, ref_number, created_at, total_amount').eq('shop_id', shop.id).order('created_at', { ascending: false }).limit(50),
      sb.from('shipments').select('sale_id').eq('shop_id', shop.id).not('sale_id', 'is', null),
    ]).then(([salesRes, shipmentsRes]) => {
      const linkedIds = new Set((shipmentsRes.data ?? []).map((s) => s.sale_id))
      setSales(((salesRes.data ?? []).filter((s) => !linkedIds.has(s.id))) as Sale[])
    })
  }, [shop, lineUid])

  const handleSave = async () => {
    if (!shop || !lineUid) return
    setSaving(true)
    const { error } = await createSupabaseClient(jwt ?? undefined)
      .from('shipments').insert({
        shop_id: shop.id, sale_id: saleId || null,
        tracking_number: trackingNumber || null, carrier: carrier || null,
        shipping_cost: parseFloat(shippingCost) || 0, note: note || null, status: 'pending',
        created_at: toTimestamp(date),
      })
    if (!error) router.push(`/shop/${shopId}/shipments`)
    else setSaving(false)
  }

  return (
    <div className="pb-52">
      <div className="px-4 pt-8 pb-4 flex items-center gap-3">
        <BackBtn onClick={() => router.back()} />
        <h1 className="text-lg font-bold text-gray-900">{t('shipments.newTitle')}</h1>
      </div>

      <div className="px-4 space-y-3">
        {/* Linked sale */}
        <div className="bg-white rounded-3xl p-4 shadow-[0_2px_16px_rgba(0,0,0,0.07)]">
          <p className="text-xs font-bold text-gray-400 mb-2">{t('shipments.linkedOrder')}</p>
          <div className="bg-gray-50 rounded-2xl px-4 py-3">
            <select className="w-full bg-transparent text-sm focus:outline-none text-gray-700"
              value={saleId} onChange={(e) => setSaleId(e.target.value)}>
              <option value="">{t('shipments.noOrder')}</option>
              {sales.map((s) => (
                <option key={s.id} value={s.id}>{s.ref_number ?? t('sales.order')} — {formatMoneyFull(s.total_amount)}</option>
              ))}
            </select>
          </div>
          {sales.length === 0 && <p className="text-xs text-gray-400 mt-2 text-center">{t('shipments.allLinked')}</p>}
        </div>

        {/* Carrier */}
        <div className="bg-white rounded-3xl p-4 shadow-[0_2px_16px_rgba(0,0,0,0.07)]">
          <p className="text-xs font-bold text-gray-400 mb-3">{t('shipments.carrier')}</p>
          <div className="grid grid-cols-2 gap-2 mb-3">
            {CARRIERS.map((c) => (
              <button key={c} onClick={() => setCarrier(c)}
                className={`flex items-center gap-2 px-2.5 py-2.5 rounded-2xl text-xs font-semibold transition-colors ${carrier === c ? 'bg-orange-500 text-white shadow-[0_4px_12px_rgba(249,115,22,0.3)]' : 'bg-gray-50 text-gray-600'}`}>
                {CARRIER_LOGOS[c]}
                <span className="truncate">{c}</span>
              </button>
            ))}
          </div>
          <input className={inp} placeholder={t('shipments.carrierCustom')}
            value={carrier} onChange={(e) => setCarrier(e.target.value)} />
        </div>

        {/* Tracking & cost */}
        <div className="bg-white rounded-3xl p-4 shadow-[0_2px_16px_rgba(0,0,0,0.07)] space-y-3">
          <p className="text-xs font-bold text-gray-400">{t('shipments.info')}</p>
          <div>
            <p className="text-xs text-gray-400 font-medium mb-1.5">{t('shipments.trackingNo')}</p>
            <input className={inp} placeholder={t('shipments.trackingPlaceholder')} value={trackingNumber} onChange={(e) => setTrackingNumber(e.target.value)} />
          </div>
          <div>
            <p className="text-xs text-gray-400 font-medium mb-1.5">{t('shipments.shipCost')}</p>
            <input className={inp} placeholder="0" type="number" inputMode="decimal" value={shippingCost} onChange={(e) => setShippingCost(e.target.value)} />
          </div>
        </div>

        {/* Date */}
        <div className="bg-white rounded-3xl p-4 shadow-[0_2px_16px_rgba(0,0,0,0.07)]">
          <p className="text-xs font-bold text-gray-400 mb-2">{t('common.txnDate')}</p>
          <input type="date" max={dayjs().format('YYYY-MM-DD')} className={inp}
            value={date} onChange={(e) => setDate(e.target.value)} />
        </div>

        {/* Note */}
        <div className="bg-white rounded-3xl p-4 shadow-[0_2px_16px_rgba(0,0,0,0.07)]">
          <p className="text-xs font-bold text-gray-400 mb-2">{t('common.note')}</p>
          <textarea className="w-full bg-gray-50 rounded-2xl px-4 py-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#1877F2]/30 border-0"
            rows={2} placeholder={t('common.noteMore')} value={note} onChange={(e) => setNote(e.target.value)} />
        </div>
      </div>

      <div className="fixed bottom-24 left-0 right-0 max-w-[430px] mx-auto px-4 z-40">
        <button onClick={handleSave} disabled={saving}
          className="w-full bg-orange-500 disabled:bg-gray-200 text-white disabled:text-gray-400 font-bold py-4 rounded-2xl text-base transition-all shadow-[0_4px_16px_rgba(249,115,22,0.35)] disabled:shadow-none active:scale-[0.98]">
          {saving ? t('common.saving') : t('shipments.saveBtn')}
        </button>
      </div>
    </div>
  )
}
