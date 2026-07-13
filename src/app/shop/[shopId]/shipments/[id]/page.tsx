'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useShopStore } from '@/store/shopStore'
import { createSupabaseClient } from '@/lib/supabase'
import { formatDateTime, formatMoneyFull } from '@/lib/format'
import { useT, type TKey } from '@/lib/i18n'
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
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!shop || !lineUid) return
    createSupabaseClient(jwt ?? undefined)
      .from('shipments').select('*').eq('id', id).single()
      .then(({ data }) => { if (data) setShipment(data as Shipment); setLoading(false) })
  }, [shop, lineUid, id])

  const startEdit = () => {
    if (!shipment) return
    setETracking(shipment.tracking_number ?? '')
    setECarrier(shipment.carrier ?? '')
    setECost(String(shipment.shipping_cost ?? 0))
    setENote((shipment as any).note ?? '')
    setError('')
    setEditing(true)
  }

  const saveEdit = async () => {
    if (!shipment || !lineUid) return
    setBusy(true); setError('')
    const { data, error: err } = await createSupabaseClient(jwt ?? undefined)
      .from('shipments').update({
        tracking_number: eTracking.trim() || null,
        carrier: eCarrier.trim() || null,
        shipping_cost: parseFloat(eCost) || 0,
        note: eNote.trim() || null,
      }).eq('id', id).select().single()
    if (err) setError(t('shipments.saveFailed') + err.message)
    else { setShipment(data as Shipment); setEditing(false) }
    setBusy(false)
  }

  const handleDelete = async () => {
    if (!shipment || !lineUid) return
    if (!confirm(t('shipments.deleteConfirm'))) return
    setBusy(true); setError('')
    const { error: err } = await createSupabaseClient(jwt ?? undefined)
      .from('shipments').delete().eq('id', id)
    if (err) { setError(t('shipments.deleteFailed') + err.message); setBusy(false); return }
    router.push(`/shop/${shopId}/shipments`)
  }

  const updateStatus = async (status: 'shipped' | 'delivered') => {
    if (!lineUid || !shipment) return
    setUpdating(true)
    const now = new Date().toISOString()
    const patch: Partial<Shipment> = { status }
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
          <>
            <button onClick={startEdit}
              className="text-xs font-semibold px-3 py-1.5 rounded-xl bg-gray-50 text-gray-600 active:bg-gray-100 transition-colors flex-shrink-0">
              {t('common.edit')}
            </button>
            <button onClick={handleDelete} disabled={busy}
              className="text-xs font-semibold px-3 py-1.5 rounded-xl bg-red-50 text-red-400 active:bg-red-100 disabled:opacity-50 transition-colors flex-shrink-0">
              {t('common.delete')}
            </button>
          </>
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
            <p className="text-2xl font-bold text-white tracking-wider mb-1">{shipment.tracking_number}</p>
          )}
          <div className="flex items-center gap-4 mt-3 pt-3 border-t border-white/20">
            <div className="flex-1">
              <p className="text-white/60 text-xs">{shipment.carrier ?? 'Flash Express'}</p>
              <p className="text-white font-bold text-sm mt-0.5">{t('detail.shipFee')} {formatMoneyFull(shipment.shipping_cost)}</p>
            </div>
            <span className={`text-[11px] bg-white/20 text-white px-2.5 py-1 rounded-full font-medium`}>{t(statusInfo.labelKey)}</span>
          </div>
        </div>

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
