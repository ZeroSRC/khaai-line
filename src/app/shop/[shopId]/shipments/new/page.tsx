'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useShopStore } from '@/store/shopStore'
import { createSupabaseClient } from '@/lib/supabase'
import { uploadSlip } from '@/lib/storage'
import { formatMoneyFull } from '@/lib/format'
import { useT } from '@/lib/i18n'
import { DateField } from '@/components/DateField'
import dayjs from 'dayjs'
import type { Sale } from '@/lib/types'

const CARRIERS = ['Flash Express', 'J&T', 'Kerry', 'ไปรษณีย์ไทย']

// Real brand logo files under /public/ecommerge-logo — anything outside this shortlist is
// still supported, just typed in by hand in the free-text field below.
const CARRIER_LOGOS: Record<string, JSX.Element> = {
  'Flash Express': <img src="/ecommerge-logo/flash-express-icon.svg" alt="Flash Express" className="w-6 h-6 flex-shrink-0 object-contain" />,
  'J&T': <img src="/ecommerge-logo/jt-express-icon.svg" alt="J&T Express" className="w-6 h-6 flex-shrink-0 object-contain" />,
  'Kerry': <img src="/ecommerge-logo/kerry-express-icon.svg" alt="Kerry Express" className="w-6 h-6 flex-shrink-0 object-contain" />,
  'ไปรษณีย์ไทย': <img src="/ecommerge-logo/thailand-post-icon.svg" alt="ไปรษณีย์ไทย" className="w-6 h-6 flex-shrink-0 object-contain" />,
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
  const [slipFile, setSlipFile] = useState<File | null>(null)
  const [note, setNote] = useState('')
  const [date, setDate] = useState(dayjs().format('YYYY-MM-DD'))
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!shop || !lineUid) return
    const sb = createSupabaseClient(jwt ?? undefined)
    Promise.all([
      // Only sales that actually need shipping. Hand-over/pickup sales never get a
      // parcel, so without this filter they would sit in this dropdown forever.
      // Items pulled in too so the picker can lead with WHAT was sold, not the ref number —
      // same reasoning as the shipments list card (nobody recognises "SO-20260719-001").
      sb.from('sales').select('id, ref_number, created_at, total_amount, items:sale_items(quantity, product:products(name))')
        .eq('shop_id', shop.id).eq('delivery_method', 'ship')
        .order('created_at', { ascending: false }).limit(50),
      sb.from('shipments').select('sale_id').eq('shop_id', shop.id).not('sale_id', 'is', null),
    ]).then(([salesRes, shipmentsRes]) => {
      const linkedIds = new Set((shipmentsRes.data ?? []).map((s) => s.sale_id))
      setSales(((salesRes.data ?? []).filter((s) => !linkedIds.has(s.id))) as unknown as Sale[])
    })
  }, [shop, lineUid])

  const handleSave = async () => {
    if (!shop || !lineUid) return
    setSaving(true)
    const sb = createSupabaseClient(jwt ?? undefined)

    let slipUrl: string | null = null
    if (slipFile) {
      try { slipUrl = await uploadSlip(sb, shop.id, slipFile) }
      catch { setSaving(false); return } // don't save a parcel whose slip silently failed to attach
    }

    const { error } = await sb
      .from('shipments').insert({
        shop_id: shop.id, sale_id: saleId || null,
        tracking_number: trackingNumber || null, carrier: carrier || null,
        shipping_cost: parseFloat(shippingCost) || 0, slip_url: slipUrl,
        note: note || null, status: 'pending',
        created_at: toTimestamp(date), last_upd_by: lineUid,
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
              {sales.map((s) => {
                // "Maono pd300x" · "Maono pd300x +2 รายการ" — same product-first label as the
                // shipments list, so the same order reads identically in both places.
                const items = (s as any).items ?? []
                const firstItem = items[0]?.product?.name
                const label = firstItem
                  ? (items.length > 1 ? `${firstItem} ${t('common.moreItems', { n: items.length - 1 })}` : firstItem)
                  : (s.ref_number ?? t('sales.order'))
                return (
                  <option key={s.id} value={s.id}>{label} — {formatMoneyFull(s.total_amount)}</option>
                )
              })}
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
                className={`flex flex-col items-start gap-0.5 px-2.5 py-2.5 rounded-2xl text-xs font-semibold transition-colors ${carrier === c ? 'bg-orange-500 text-white shadow-[0_4px_12px_rgba(249,115,22,0.3)]' : 'bg-gray-50 text-gray-600'}`}>
                <span className="flex items-center gap-2 w-full">
                  {CARRIER_LOGOS[c]}
                  <span className="truncate">{c}</span>
                </span>
                {/* Only Flash's tracking endpoint is open/keyless enough to auto-check — see
                    syncTracking() in ../page.tsx. Flagging it here so the choice is informed,
                    not just discovered later on the shipments list. */}
                {c === 'Flash Express' && (
                  <span className={`text-[9px] font-medium pl-8 ${carrier === c ? 'text-white/80' : 'text-gray-400'}`}>
                    อัปเดตอัตโนมัติ
                  </span>
                )}
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
          <div>
            <p className="text-xs text-gray-400 font-medium mb-1.5">{t('shipments.slip')}</p>
            <label className="flex flex-col items-center justify-center bg-gray-50 rounded-2xl h-24 cursor-pointer border-2 border-dashed border-gray-200 active:border-[#1877F2] transition-colors">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={slipFile ? '#1877F2' : '#9ca3af'} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
              <p className="text-xs text-gray-400 mt-1 truncate max-w-[80%]">{slipFile ? slipFile.name : t('shipments.uploadSlip')}</p>
              <input type="file" accept="image/*" className="hidden" onChange={(e) => setSlipFile(e.target.files?.[0] ?? null)} />
            </label>
          </div>
        </div>

        {/* Date */}
        <div className="bg-white rounded-3xl p-4 shadow-[0_2px_16px_rgba(0,0,0,0.07)]">
          <p className="text-xs font-bold text-gray-400 mb-2">{t('common.txnDate')}</p>
          <DateField value={date} onChange={setDate} max={dayjs().format('YYYY-MM-DD')} />
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
