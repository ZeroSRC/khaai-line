'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useShopStore } from '@/store/shopStore'
import { createSupabaseClient } from '@/lib/supabase'
import { confirmDialog } from '@/lib/confirm'
import { uploadSlip } from '@/lib/storage'
import { formatDateTime, formatMoneyFull } from '@/lib/format'
import { useT, type TKey } from '@/lib/i18n'
import { btnEdit, btnDelete } from '@/lib/buttons'
import type { Shipment } from '@/lib/types'

const STATUS_MAP: Record<string, { labelKey: TKey; color: string; dot: string }> = {
  pending:   { labelKey: 'shipments.statusPending',   color: 'bg-amber-50 text-amber-700',  dot: 'bg-amber-400' },
  shipped:   { labelKey: 'shipments.statusShipped',   color: 'bg-blue-50 text-blue-700',    dot: 'bg-blue-400' },
  delivered: { labelKey: 'shipments.statusDelivered', color: 'bg-green-50 text-green-700',  dot: 'bg-green-400' },
}

const BackBtn = ({ onClick }: { onClick: () => void }) => (
  <button onClick={onClick} className="w-9 h-9 rounded-2xl bg-gray-50 flex items-center justify-center text-gray-500 active:bg-gray-100 transition-colors">
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
  </button>
)

const inp = 'w-full bg-gray-50 border-0 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#1877F2]/30'

export default function ShipmentDetailPage() {
  const { shopId, id } = useParams<{ shopId: string; id: string }>()
  const router = useRouter()
  const { shop, lineUid, jwt } = useShopStore()
  const t = useT()
  const [shipment, setShipment] = useState<Shipment | null>(null)
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)

  // Edit mode — a typo in the tracking number used to be unfixable: no edit, no delete,
  // and the linked sale was already gone from the "add parcel" picker.
  const [editing, setEditing] = useState(false)
  const [eTracking, setETracking] = useState('')
  const [eCarrier, setECarrier] = useState('')
  const [eCost, setECost] = useState('')
  const [eNote, setENote] = useState('')
  const [eSlipFile, setESlipFile] = useState<File | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!shop || !lineUid) return
    createSupabaseClient(jwt ?? undefined)
      .from('shipments').select('*, sale:sales(items:sale_items(quantity, product:products(name)))').eq('id', id).single()
      .then(({ data }) => { if (data) setShipment(data as Shipment); setLoading(false) })
  }, [shop, lineUid, id])

  const startEdit = () => {
    if (!shipment) return
    setETracking(shipment.tracking_number ?? '')
    setECarrier(shipment.carrier ?? '')
    setECost(String(shipment.shipping_cost ?? 0))
    setENote((shipment as any).note ?? '')
    setESlipFile(null)
    setError('')
    setEditing(true)
  }

  const saveEdit = async () => {
    if (!shipment || !lineUid) return
    setBusy(true); setError('')
    const sb = createSupabaseClient(jwt ?? undefined)

    // Keep the existing slip unless a new file replaces it.
    let slipUrl = shipment.slip_url
    if (eSlipFile) {
      try { slipUrl = await uploadSlip(sb, shipment.shop_id, eSlipFile) }
      catch { setError(t('shipments.saveFailed')); setBusy(false); return }
    }

    const { data, error: err } = await sb
      .from('shipments').update({
        tracking_number: eTracking.trim() || null,
        carrier: eCarrier.trim() || null,
        shipping_cost: parseFloat(eCost) || 0,
        slip_url: slipUrl,
        note: eNote.trim() || null, last_upd_by: lineUid,
      }).eq('id', id).select().single()
    if (err) setError(t('shipments.saveFailed') + err.message)
    else { setShipment(data as Shipment); setEditing(false) }
    setBusy(false)
  }

  const handleDelete = async () => {
    if (!shipment || !lineUid) return
    const ok = await confirmDialog({
      title: t('shipments.deleteTitle'),
      text: t('shipments.deleteConfirm'),
      confirmText: t('shipments.deleteBtn'),
      cancelText: t('common.cancel'),
      danger: true,
    })
    if (!ok) return
    setBusy(true); setError('')
    // Server-side: resets the serial (warranty cancelled, shipment_id cleared) then deletes
    // the row — the sale is untouched so it returns to the "create parcel" picker.
    const { error: err } = await createSupabaseClient(jwt ?? undefined)
      .rpc('delete_shipment_cascade', { p_shipment_id: id, p_by: lineUid })
    if (err) { setError(t('shipments.deleteFailed') + err.message); setBusy(false); return }
    router.push(`/shop/${shopId}/shipments`)
  }

  const copyTracking = () => {
    if (!shipment?.tracking_number) return
    navigator.clipboard.writeText(shipment.tracking_number)
    setCopied(true); setTimeout(() => setCopied(false), 2000)
  }

  const updateStatus = async (status: 'shipped' | 'delivered') => {
    if (!lineUid || !shipment) return
    setUpdating(true)
    const now = new Date().toISOString()
    const patch: any = { status, last_upd_by: lineUid }
    if (status === 'shipped') patch.shipped_at = now
    if (status === 'delivered') patch.delivered_at = now
    const { data } = await createSupabaseClient(jwt ?? undefined)
      .from('shipments').update(patch).eq('id', id).select().single()
    if (data) setShipment(data as Shipment)
    setUpdating(false)
  }

  if (loading) return <div className="flex items-center justify-center min-h-dvh"><div className="w-8 h-8 rounded-2xl bg-[#1877F2] animate-pulse" /></div>
  if (!shipment) return <div className="flex flex-col items-center justify-center min-h-dvh gap-3 p-8 text-center"><p className="font-semibold text-gray-800">{t('detail.notFoundParcel')}</p><button onClick={() => router.back()} className="text-sm text-[#1877F2]">{t('detail.backShort')}</button></div>

  const statusInfo = STATUS_MAP[shipment.status as keyof typeof STATUS_MAP] ?? STATUS_MAP.pending

  return (
    <div className="pb-10">
      <div className="px-4 pt-8 pb-4 flex items-center gap-3">
        <BackBtn onClick={() => router.back()} />
        <div className="flex-1 min-w-0">
          <h1 className="text-base font-bold text-gray-900">{t('detail.parcelTitle')}</h1>
          <p className="text-[11px] text-gray-400 truncate">{shipment.tracking_number ?? t('shipments.noTracking')}</p>
        </div>
        {!editing && (
          <div className="flex items-center gap-2 flex-shrink-0">
            <button onClick={startEdit} className={btnEdit}>
              {t('common.edit')}
            </button>
            <button onClick={handleDelete} disabled={busy} className={btnDelete}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
              </svg>
              {busy ? t('common.saving') : t('shipments.deleteBtn')}
            </button>
          </div>
        )}
      </div>

      <div className="px-4 space-y-3">
        {/* Edit form */}
        {editing && (
          <div className="bg-white rounded-3xl p-4 shadow-[0_2px_16px_rgba(0,0,0,0.07)] space-y-3">
            <p className="text-xs font-bold text-gray-400">{t('shipments.editTitle')}</p>

            <div>
              <p className="text-xs text-gray-400 font-medium mb-1.5">{t('shipments.trackingNo')}</p>
              <input className={inp} value={eTracking} onChange={(e) => setETracking(e.target.value)}
                placeholder={t('shipments.trackingPlaceholder')} autoCapitalize="characters" autoCorrect="off" />
            </div>

            <div>
              <p className="text-xs text-gray-400 font-medium mb-1.5">{t('shipments.carrier')}</p>
              <input className={inp} value={eCarrier} onChange={(e) => setECarrier(e.target.value)}
                placeholder={t('shipments.carrierCustom')} />
            </div>

            <div>
              <p className="text-xs text-gray-400 font-medium mb-1.5">{t('shipments.shipCost')}</p>
              <input className={inp} type="number" inputMode="decimal"
                value={eCost} onChange={(e) => setECost(e.target.value)} />
            </div>

            <div>
              <p className="text-xs text-gray-400 font-medium mb-1.5">{t('shipments.slip')}</p>
              <label className="flex flex-col items-center justify-center bg-gray-50 rounded-2xl h-24 cursor-pointer border-2 border-dashed border-gray-200 active:border-[#1877F2] transition-colors">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={eSlipFile || shipment.slip_url ? '#1877F2' : '#9ca3af'} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                <p className="text-xs text-gray-400 mt-1 truncate max-w-[80%]">
                  {eSlipFile ? eSlipFile.name : shipment.slip_url ? t('shipments.changeSlip') : t('shipments.uploadSlip')}
                </p>
                <input type="file" accept="image/*" className="hidden" onChange={(e) => setESlipFile(e.target.files?.[0] ?? null)} />
              </label>
            </div>

            <div>
              <p className="text-xs text-gray-400 font-medium mb-1.5">{t('common.note')}</p>
              <textarea className="w-full bg-gray-50 rounded-2xl px-4 py-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#1877F2]/30 border-0"
                rows={2} value={eNote} onChange={(e) => setENote(e.target.value)} placeholder={t('common.noteMore')} />
            </div>

            {error && <p className="text-xs text-red-500 text-center bg-red-50 rounded-2xl px-4 py-2.5">{error}</p>}

            <div className="flex gap-2 pt-1">
              <button onClick={() => setEditing(false)} disabled={busy}
                className="flex-1 py-3 rounded-2xl bg-gray-50 text-gray-600 text-sm font-semibold active:bg-gray-100 disabled:opacity-50 transition-colors">
                {t('common.cancel')}
              </button>
              <button onClick={saveEdit} disabled={busy}
                className="flex-1 py-3 rounded-2xl bg-[#1877F2] text-white text-sm font-bold shadow-[0_4px_12px_rgba(24,119,242,0.35)] disabled:opacity-50 active:scale-[0.98] transition-all">
                {busy ? t('common.saving') : t('common.save')}
              </button>
            </div>
          </div>
        )}

        {/* Hero */}
        <div className="bg-orange-500 rounded-3xl p-6 shadow-[0_8px_32px_rgba(249,115,22,0.25)]">
          {shipment.tracking_number && (
            <div className="flex items-center gap-2 mb-1">
              <p className="text-2xl font-bold text-white tracking-wider truncate">{shipment.tracking_number}</p>
              <button onClick={copyTracking} title={t('shipments.copyTracking')}
                className="flex-shrink-0 w-8 h-8 rounded-xl bg-white/15 flex items-center justify-center active:bg-white/25 transition-colors">
                {copied ? (
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                ) : (
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>
                )}
              </button>
            </div>
          )}
          {copied && <p className="text-[11px] text-white/80 -mt-0.5 mb-1">{t('shipments.copied')}</p>}
          <div className="flex items-center gap-4 mt-3 pt-3 border-t border-white/20">
            <div className="flex-1">
              <p className="text-white/60 text-xs">{shipment.carrier ?? 'Flash Express'}</p>
              <p className="text-white font-bold text-sm mt-0.5">{t('detail.shipFee')} {formatMoneyFull(shipment.shipping_cost)}</p>
            </div>
            <span className={`text-[11px] bg-white/20 text-white px-2.5 py-1 rounded-full font-medium`}>{t(statusInfo.labelKey)}</span>
          </div>
        </div>

        {/* Items in this parcel — pulled from the linked sale */}
        {(() => {
          const items = (shipment as any).sale?.items ?? []
          if (items.length === 0) return null
          return (
            <div className="bg-white rounded-3xl p-5 shadow-[0_2px_16px_rgba(0,0,0,0.07)]">
              <p className="text-xs font-bold text-gray-400 mb-3">{t('shipments.itemsInParcel')}</p>
              <div className="space-y-2.5">
                {items.map((it: any, i: number) => (
                  <div key={i} className="flex items-center justify-between gap-3">
                    <p className="text-sm font-medium text-gray-800 truncate">{it.product?.name ?? '—'}</p>
                    <span className="text-xs font-semibold text-gray-400 flex-shrink-0">× {it.quantity}</span>
                  </div>
                ))}
              </div>
            </div>
          )
        })()}

        {/* Shipping slip — tap to open full size in a new tab */}
        {shipment.slip_url && (
          <div className="bg-white rounded-3xl p-5 shadow-[0_2px_16px_rgba(0,0,0,0.07)]">
            <p className="text-xs font-bold text-gray-400 mb-3">{t('shipments.slip')}</p>
            <a href={shipment.slip_url} target="_blank" rel="noopener noreferrer" className="block">
              <img src={shipment.slip_url} alt={t('shipments.slip')} className="w-full max-h-72 object-contain rounded-2xl bg-gray-50" />
            </a>
          </div>
        )}

        {/* Timeline */}
        <div className="bg-white rounded-3xl p-5 shadow-[0_2px_16px_rgba(0,0,0,0.07)]">
          <p className="text-xs font-bold text-gray-400 mb-4">{t('detail.statusHistory')}</p>
          <div className="space-y-4">
            {[
              { label: t('detail.tlCreated'), time: shipment.created_at, dot: 'bg-gray-400', active: true },
              { label: t('detail.tlShipped'), time: shipment.shipped_at, dot: 'bg-blue-400', active: !!shipment.shipped_at },
              { label: t('detail.tlDelivered'), time: shipment.delivered_at, dot: 'bg-green-400', active: !!shipment.delivered_at },
            ].map((step) => (
              <div key={step.label} className="flex items-start gap-3">
                <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${step.active ? step.dot : 'bg-gray-200'}`} />
                <div>
                  <p className={`text-sm font-semibold ${step.active ? 'text-gray-800' : 'text-gray-300'}`}>{step.label}</p>
                  {step.time
                    ? <p className="text-xs text-gray-400">{formatDateTime(step.time)}</p>
                    : <p className="text-xs text-gray-300">{t('detail.pendingStep')}</p>
                  }
                </div>
              </div>
            ))}
          </div>
        </div>

        {(shipment as any).note && (
          <div className="bg-white rounded-3xl p-4 shadow-[0_2px_16px_rgba(0,0,0,0.07)]">
            <p className="text-xs font-bold text-gray-400 mb-1">{t('common.note')}</p>
            <p className="text-sm text-gray-700">{(shipment as any).note}</p>
          </div>
        )}

        {/* Actions */}
        {shipment.status === 'pending' && (
          <button onClick={() => updateStatus('shipped')} disabled={updating}
            className="w-full py-4 rounded-2xl bg-blue-500 text-white text-sm font-bold shadow-[0_4px_16px_rgba(59,130,246,0.35)] disabled:opacity-50 active:scale-[0.98] transition-all">
            {updating ? t('detail.updating') : t('detail.markShipped')}
          </button>
        )}
        {shipment.status === 'shipped' && (
          <button onClick={() => updateStatus('delivered')} disabled={updating}
            className="w-full py-4 rounded-2xl bg-[#1877F2] text-white text-sm font-bold shadow-[0_4px_16px_rgba(24,119,242,0.35)] disabled:opacity-50 active:scale-[0.98] transition-all">
            {updating ? t('detail.updating') : t('shipments.confirmDelivered')}
          </button>
        )}
      </div>
    </div>
  )
}
