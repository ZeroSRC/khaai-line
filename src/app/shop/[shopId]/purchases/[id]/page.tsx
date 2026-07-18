'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useShopStore } from '@/store/shopStore'
import { createSupabaseClient } from '@/lib/supabase'
import { confirmDialog, alertDialog } from '@/lib/confirm'
import { uploadSlip } from '@/lib/storage'
import { formatMoneyFull, formatDateTime } from '@/lib/format'
import { useT } from '@/lib/i18n'
import type { Purchase } from '@/lib/types'

interface PurchaseItem {
  id: string; product_id: string; quantity: number
  unit_cost: number; total_cost: number
  product?: { name: string; sku: string | null }
}

const BackBtn = ({ onClick }: { onClick: () => void }) => (
  <button onClick={onClick} className="w-9 h-9 rounded-2xl bg-gray-50 flex items-center justify-center text-gray-500 active:bg-gray-100 transition-colors">
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
  </button>
)

export default function PurchaseDetailPage() {
  const { shopId, id } = useParams<{ shopId: string; id: string }>()
  const router = useRouter()
  const { shop, lineUid, jwt } = useShopStore()
  const t = useT()
  const [purchase, setPurchase] = useState<Purchase | null>(null)
  const [items, setItems] = useState<PurchaseItem[]>([])
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState(false)

  // Edit mode — correct a wrong cost / quantity / slip after the fact
  const [editing, setEditing] = useState(false)
  const [eCosts, setECosts] = useState<Record<string, string>>({}) // itemId → unit cost
  const [eQtys, setEQtys] = useState<Record<string, string>>({})   // itemId → quantity
  const [eSlipFile, setESlipFile] = useState<File | null>(null)
  const [saving, setSaving] = useState(false)
  const [editErr, setEditErr] = useState('')

  const startEdit = () => {
    setECosts(Object.fromEntries(items.map((it) => [it.id, String(it.unit_cost)])))
    setEQtys(Object.fromEntries(items.map((it) => [it.id, String(it.quantity)])))
    setESlipFile(null)
    setEditErr('')
    setEditing(true)
  }

  const eUnit = (id: string) => parseFloat(eCosts[id] ?? '0') || 0
  const eQty = (id: string) => parseInt(eQtys[id] ?? '0') || 0
  // Live preview of the new total while editing
  const editedTotal = items.reduce((s, it) => s + eUnit(it.id) * eQty(it.id), 0)

  const saveEdit = async () => {
    if (!purchase || !lineUid) return
    setSaving(true); setEditErr('')
    const sb = createSupabaseClient(jwt ?? undefined)
    try {
      let slipUrl = purchase.slip_url
      if (eSlipFile) slipUrl = await uploadSlip(sb, purchase.shop_id, eSlipFile)

      // Server-side so the stock delta (new qty − old qty) is applied atomically — a
      // client read-then-write would race with any sale happening at the same moment.
      const payload = items.map((it) => ({ id: it.id, unit_cost: eUnit(it.id), quantity: eQty(it.id) }))
      const { error } = await sb.rpc('edit_purchase', { p_purchase_id: id, p_items: payload, p_slip_url: slipUrl, p_by: lineUid })
      if (error) throw error

      // Reload the fresh purchase + items
      const [{ data: p }, { data: its }] = await Promise.all([
        sb.from('purchases').select('*').eq('id', id).single(),
        sb.from('purchase_items').select('*, product:products(name, sku)').eq('purchase_id', id),
      ])
      if (p) setPurchase(p as Purchase)
      setItems((its ?? []) as PurchaseItem[])
      setEditing(false)
    } catch (e: any) {
      setEditErr(t('detail.editPurchaseFailed') + (e?.message ?? ''))
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!purchase || !lineUid) return
    const sb = createSupabaseClient(jwt ?? undefined)

    // Blast radius: sales that include any product from this purchase (aggressive cascade).
    const productIds = items.map((it) => it.product_id)
    let saleCount = 0, shipCount = 0
    if (productIds.length > 0) {
      const { data: saleItemRows } = await sb.from('sale_items').select('sale_id').in('product_id', productIds)
      const saleIds = Array.from(new Set((saleItemRows ?? []).map((r) => r.sale_id)))
      saleCount = saleIds.length
      if (saleIds.length > 0) {
        const { count } = await sb.from('shipments').select('id', { count: 'exact', head: true }).in('sale_id', saleIds)
        shipCount = count ?? 0
      }
    }

    const ok = await confirmDialog({
      title: t('detail.deletePurchaseTitle'),
      text: saleCount > 0 || shipCount > 0
        ? t('detail.deletePurchaseCascade', { sales: saleCount, ships: shipCount })
        : t('detail.deletePurchaseSimple'),
      confirmText: t('detail.deletePurchase'),
      cancelText: t('common.cancel'),
      danger: true,
    })
    if (!ok) return

    setDeleting(true)
    const { error } = await sb.rpc('delete_purchase_cascade', { p_purchase_id: id, p_by: lineUid })
    if (error) { await alertDialog({ title: t('detail.deletePurchaseFailed'), text: error.message, okText: t('common.back'), icon: 'error' }); setDeleting(false); return }
    router.push(`/shop/${shopId}/purchases`)
  }

  useEffect(() => {
    if (!shop || !lineUid) return
    const sb = createSupabaseClient(jwt ?? undefined)
    Promise.all([
      sb.from('purchases').select('*').eq('id', id).single(),
      sb.from('purchase_items').select('*, product:products(name, sku)').eq('purchase_id', id),
    ]).then(([purchaseRes, itemsRes]) => {
      if (purchaseRes.data) setPurchase(purchaseRes.data as Purchase)
      setItems((itemsRes.data ?? []) as PurchaseItem[])
      setLoading(false)
    })
  }, [shop, lineUid, id])

  if (loading) return <div className="flex items-center justify-center min-h-dvh"><div className="w-8 h-8 rounded-2xl bg-[#1877F2] animate-pulse" /></div>
  if (!purchase) return <div className="flex flex-col items-center justify-center min-h-dvh gap-3 p-8 text-center"><p className="font-semibold text-gray-800">{t('detail.notFoundPurchase')}</p><button onClick={() => router.back()} className="text-sm text-[#1877F2]">{t('detail.backShort')}</button></div>

  return (
    <div className="pb-10">
      <div className="px-4 pt-8 pb-4 flex items-center gap-3">
        <BackBtn onClick={() => router.back()} />
        <div className="flex-1">
          <h1 className="text-base font-bold text-gray-900">{t('detail.purchaseTitle')}</h1>
          <p className="text-[11px] text-gray-400">{purchase.ref_number}</p>
        </div>
        {!editing && (
          <>
            <button onClick={startEdit}
              className="text-xs font-semibold px-3 py-1.5 rounded-xl bg-gray-50 text-gray-600 active:bg-gray-100 transition-colors flex-shrink-0">
              {t('common.edit')}
            </button>
            <button onClick={handleDelete} disabled={deleting}
              className="flex items-center gap-1.5 text-sm text-red-500 font-semibold px-3 py-1.5 rounded-xl bg-red-50 active:bg-red-100 disabled:opacity-50 transition-colors flex-shrink-0">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
              </svg>
              {deleting ? t('common.saving') : t('detail.deletePurchase')}
            </button>
          </>
        )}
      </div>

      <div className="px-4 space-y-3">
        {/* Hero */}
        <div className="bg-red-500 rounded-3xl p-6 shadow-[0_8px_32px_rgba(239,68,68,0.25)]">
          <p className="text-white/70 text-xs font-semibold mb-1">{t('detail.purchaseTotal')}</p>
          <p className="text-4xl font-bold text-white tracking-tight">{formatMoneyFull(purchase.total_amount)}</p>
          <div className="flex items-center gap-2 mt-3 pt-3 border-t border-white/20">
            <div className="flex-1">
              <p className="text-white/60 text-xs">{formatDateTime(purchase.created_at)}</p>
              {purchase.supplier && <p className="text-white/80 text-xs mt-0.5">{purchase.supplier}</p>}
            </div>
            {purchase.slip_url && <span className="text-[11px] bg-white/20 text-white px-2.5 py-1 rounded-full">{t('purchases.hasSlip')}</span>}
          </div>
        </div>

        {/* Items — cost per unit becomes editable in edit mode */}
        {items.length > 0 && (
          <div className="bg-white rounded-3xl shadow-[0_2px_16px_rgba(0,0,0,0.07)] overflow-hidden">
            <p className="text-xs font-bold text-gray-400 px-4 pt-4 pb-3">{t('detail.itemsList')}</p>
            {items.map((item, i) => (
              <div key={item.id} className={`flex items-center gap-3 px-4 py-3 ${i > 0 ? 'border-t border-gray-50' : ''}`}>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900">{item.product?.name ?? t('detail.productFallback')}</p>
                  {editing
                    ? <p className="text-[10px] text-gray-400 mt-0.5">{t('detail.editQtyHint')}</p>
                    : <p className="text-xs text-gray-400">× {item.quantity}</p>}
                </div>
                {editing ? (
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    {/* quantity → adjusts stock · unit cost → adjusts cost & total */}
                    <input type="number" inputMode="numeric" aria-label={t('detail.editQty')}
                      className="w-14 bg-gray-50 rounded-xl px-2 py-2 text-sm text-center font-medium focus:outline-none focus:ring-2 focus:ring-[#1877F2]/30"
                      value={eQtys[item.id] ?? ''}
                      onChange={(e) => setEQtys((p) => ({ ...p, [item.id]: e.target.value }))} />
                    <span className="text-gray-300 text-xs">×</span>
                    <input type="number" inputMode="decimal" aria-label={t('detail.editUnitCost')}
                      className="w-20 bg-gray-50 rounded-xl px-2 py-2 text-sm text-right font-medium focus:outline-none focus:ring-2 focus:ring-[#1877F2]/30"
                      value={eCosts[item.id] ?? ''}
                      onChange={(e) => setECosts((p) => ({ ...p, [item.id]: e.target.value }))} />
                  </div>
                ) : (
                  <div className="text-right">
                    <p className="text-sm font-bold text-gray-900">{formatMoneyFull(item.total_cost)}</p>
                    <p className="text-xs text-gray-400">{formatMoneyFull(item.unit_cost)} × {item.quantity}</p>
                  </div>
                )}
              </div>
            ))}
            <div className="flex justify-between px-4 py-3 border-t border-gray-100 bg-gray-50/50">
              <span className="text-sm font-semibold text-gray-700">{editing ? t('detail.newTotal') : t('common.total')}</span>
              <span className="text-sm font-bold text-red-500">{formatMoneyFull(editing ? editedTotal : purchase.total_amount)}</span>
            </div>
          </div>
        )}

        {/* Slip — view, or replace in edit mode */}
        {(purchase.slip_url || editing) && (
          <div className="bg-white rounded-3xl p-4 shadow-[0_2px_16px_rgba(0,0,0,0.07)]">
            <p className="text-xs font-bold text-gray-400 mb-3">{editing ? t('detail.editPurchaseSlip') : t('detail.slipTitle')}</p>
            {editing ? (
              <label className="flex flex-col items-center justify-center bg-gray-50 rounded-2xl h-28 cursor-pointer border-2 border-dashed border-gray-200 active:border-[#1877F2] transition-colors overflow-hidden">
                {eSlipFile
                  ? <p className="text-xs text-[#1877F2] font-medium px-3 truncate max-w-[80%]">{eSlipFile.name}</p>
                  : purchase.slip_url
                    ? <img src={purchase.slip_url} alt="slip" className="h-full w-full object-contain" />
                    : <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" /></svg>}
                <input type="file" accept="image/*" className="hidden" onChange={(e) => setESlipFile(e.target.files?.[0] ?? null)} />
              </label>
            ) : (
              <img src={purchase.slip_url!} alt="slip" className="w-full rounded-2xl object-contain" />
            )}
          </div>
        )}

        {editErr && <p className="text-xs text-red-500 text-center bg-red-50 rounded-2xl px-4 py-2.5">{editErr}</p>}

        {editing && (
          <div className="flex gap-2 pt-1">
            <button onClick={() => setEditing(false)} disabled={saving}
              className="flex-1 py-3 rounded-2xl bg-gray-50 text-gray-600 text-sm font-semibold active:bg-gray-100 disabled:opacity-50 transition-colors">
              {t('common.cancel')}
            </button>
            <button onClick={saveEdit} disabled={saving}
              className="flex-1 py-3 rounded-2xl bg-[#1877F2] text-white text-sm font-bold shadow-[0_4px_12px_rgba(24,119,242,0.35)] disabled:opacity-50 active:scale-[0.98] transition-all">
              {saving ? t('common.saving') : t('common.save')}
            </button>
          </div>
        )}

        {!editing && purchase.note && (
          <div className="bg-white rounded-3xl p-4 shadow-[0_2px_16px_rgba(0,0,0,0.07)]">
            <p className="text-xs font-bold text-gray-400 mb-1">{t('common.note')}</p>
            <p className="text-sm text-gray-700">{purchase.note}</p>
          </div>
        )}
      </div>
    </div>
  )
}
