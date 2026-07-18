'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useShopStore } from '@/store/shopStore'
import { createSupabaseClient } from '@/lib/supabase'
import { confirmDialog, alertDialog } from '@/lib/confirm'
import { formatMoneyFull, formatDateTime } from '@/lib/format'
import { useT, type TKey } from '@/lib/i18n'
import { btnDelete } from '@/lib/buttons'
import type { Sale, SaleItem, DeliveryMethod } from '@/lib/types'

interface LinkedShipment {
  id: string; shipping_cost: number; carrier: string | null
  tracking_number: string | null; status: string
}

const BackBtn = ({ onClick }: { onClick: () => void }) => (
  <button onClick={onClick}
    className="w-9 h-9 rounded-2xl bg-gray-50 flex items-center justify-center text-gray-500 active:bg-gray-100 transition-colors">
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
  </button>
)

export default function SaleDetailPage() {
  const { shopId, saleId } = useParams<{ shopId: string; saleId: string }>()
  const router = useRouter()
  const { shop, lineUid, jwt } = useShopStore()
  const t = useT()
  const [sale, setSale] = useState<Sale | null>(null)
  const [items, setItems] = useState<SaleItem[]>([])
  const [shipment, setShipment] = useState<LinkedShipment | null>(null)
  const [loading, setLoading] = useState(true)
  const [updatingDelivery, setUpdatingDelivery] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const handleDelete = async () => {
    if (!sale || !lineUid) return
    // Warn about the two side effects the user asked for: stock returns, shipment removed.
    const ok = await confirmDialog({
      title: t('detail.deleteSaleTitle'),
      text: shipment ? t('detail.deleteSaleWithShip') : t('detail.deleteSale'),
      confirmText: t('detail.deleteSaleBtn'),
      cancelText: t('common.cancel'),
      danger: true,
    })
    if (!ok) return
    setDeleting(true)
    // Server-side cascade: stock is restored by the delete trigger, the shipment goes with it.
    const { error } = await createSupabaseClient(jwt ?? undefined).rpc('delete_sale_cascade', { p_sale_id: saleId, p_by: lineUid })
    if (error) { await alertDialog({ title: t('detail.deleteSaleFailed'), text: error.message, okText: t('common.back'), icon: 'error' }); setDeleting(false); return }
    router.push(`/shop/${shopId}/sales`)
  }

  const toggleDelivery = async () => {
    if (!sale || !lineUid) return
    const next: DeliveryMethod = sale.delivery_method === 'ship' ? 'pickup' : 'ship'
    setUpdatingDelivery(true)
    const { error } = await createSupabaseClient(jwt ?? undefined)
      .from('sales').update({ delivery_method: next, last_upd_by: lineUid }).eq('id', saleId)
    if (!error) setSale({ ...sale, delivery_method: next })
    setUpdatingDelivery(false)
  }

  useEffect(() => {
    if (!shop || !lineUid) return
    const sb = createSupabaseClient(jwt ?? undefined)
    Promise.all([
      sb.from('sales').select('*').eq('id', saleId).single(),
      sb.from('sale_items').select('*, product:products(name, sku, cost_price)').eq('sale_id', saleId),
      sb.from('shipments').select('id, shipping_cost, carrier, tracking_number, status').eq('sale_id', saleId).maybeSingle(),
    ]).then(([saleRes, itemsRes, shipmentRes]) => {
      if (saleRes.data) setSale(saleRes.data as Sale)
      setItems((itemsRes.data ?? []) as SaleItem[])
      if (shipmentRes.data) setShipment(shipmentRes.data as LinkedShipment)
      setLoading(false)
    })
  }, [shop, lineUid, saleId])

  if (loading) return <div className="flex items-center justify-center min-h-dvh"><div className="w-8 h-8 rounded-2xl bg-[#1877F2] animate-pulse" /></div>
  if (!sale) return <div className="flex flex-col items-center justify-center min-h-dvh gap-3 p-8 text-center"><p className="font-semibold text-gray-800">{t('detail.notFoundBill')}</p><button onClick={() => router.back()} className="text-sm text-[#1877F2]">{t('detail.backShort')}</button></div>

  // Uses products.cost_price (current), not the sale_items.unit_cost snapshot — by request,
  // this sale's profit moves whenever the product's cost is edited, even long after the sale.
  const totalCost = items.reduce((s, item) => s + Number((item as any).product?.cost_price ?? item.unit_cost ?? 0) * item.quantity, 0)
  const shippingCost = shipment ? Number(shipment.shipping_cost) : 0
  const netProfit = Number(sale.total_amount) - totalCost - shippingCost
  const slipTypeLabel = sale.slip_type === 'transfer' ? t('sales.transfer') : sale.slip_type === 'cash' ? t('sales.cash') : null

  const shipStatusMap: Record<string, { labelKey: TKey; color: string }> = {
    pending: { labelKey: 'shipments.statusPending', color: 'bg-amber-50 text-amber-700' },
    shipped: { labelKey: 'shipments.statusShipped', color: 'bg-blue-50 text-blue-700' },
    delivered: { labelKey: 'shipments.statusDelivered', color: 'bg-green-50 text-green-700' },
  }

  return (
    <div className="pb-10">
      <div className="px-4 pt-8 pb-4 flex items-center gap-3">
        <BackBtn onClick={() => router.back()} />
        <div className="flex-1">
          <h1 className="text-base font-bold text-gray-900">{t('detail.billTitle')}</h1>
          <p className="text-[11px] text-gray-400">{sale.ref_number}</p>
        </div>
        <button onClick={handleDelete} disabled={deleting} className={btnDelete}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
          </svg>
          {deleting ? t('common.saving') : t('detail.deleteSaleBtn')}
        </button>
      </div>

      <div className="px-4 space-y-3">
        {/* Hero */}
        <div className="bg-[#1877F2] rounded-3xl p-6 shadow-[0_8px_32px_rgba(24,119,242,0.25)]">
          <p className="text-white/70 text-xs font-semibold mb-1">{t('detail.totalAmount')}</p>
          <p className="text-4xl font-bold text-white tracking-tight">{formatMoneyFull(sale.total_amount)}</p>
          <div className="flex items-center gap-2 mt-3 pt-3 border-t border-white/20">
            <p className="text-white/60 text-xs flex-1">{formatDateTime(sale.created_at)}</p>
            {slipTypeLabel && <span className="text-[11px] bg-white/20 text-white px-2.5 py-1 rounded-full font-medium">{slipTypeLabel}</span>}
          </div>
        </div>

        {/* Profit */}
        <div className="bg-white rounded-3xl p-4 shadow-[0_2px_16px_rgba(0,0,0,0.07)]">
          <p className="text-xs font-bold text-gray-400 mb-3">{t('detail.profit')}</p>
          <div className="space-y-2">
            <div className="flex justify-between text-sm"><span className="text-gray-500">{t('reports.statSales')}</span><span className="font-medium text-gray-900">{formatMoneyFull(sale.total_amount)}</span></div>
            <div className="flex justify-between text-sm"><span className="text-gray-500">{t('reports.statPurchases')}</span><span className="font-medium text-red-500">−{formatMoneyFull(totalCost)}</span></div>
            {shipment && <div className="flex justify-between text-sm"><span className="text-gray-500">{t('detail.shipFee')} ({shipment.carrier ?? t('detail.carrierFallback')})</span><span className="font-medium text-red-500">−{formatMoneyFull(shippingCost)}</span></div>}
            <div className="flex justify-between pt-2 border-t border-gray-100">
              <span className="text-sm font-bold text-gray-700">{t('reports.netProfit')}</span>
              <span className={`text-sm font-bold ${netProfit >= 0 ? 'text-[#1877F2]' : 'text-red-500'}`}>{formatMoneyFull(netProfit)}</span>
            </div>
          </div>
        </div>

        {/* Shipment */}
        {shipment && (
          <div className="bg-white rounded-3xl p-4 shadow-[0_2px_16px_rgba(0,0,0,0.07)]">
            <p className="text-xs font-bold text-gray-400 mb-3">{t('shipments.info')}</p>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-orange-50 flex items-center justify-center flex-shrink-0">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#f97316" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M1 3h15v13H1zM16 8h4l3 3v5h-7V8z" /><circle cx="5.5" cy="18.5" r="2.5" /><circle cx="18.5" cy="18.5" r="2.5" /></svg>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate">{shipment.tracking_number ?? t('shipments.noTracking')}</p>
                <p className="text-xs text-gray-400">{shipment.carrier ?? t('detail.noCarrier')} · {t('detail.shipFee')} {formatMoneyFull(shippingCost)}</p>
              </div>
              <span className={`text-[10px] px-2 py-1 rounded-full font-semibold ${shipStatusMap[shipment.status]?.color ?? 'bg-gray-100 text-gray-600'}`}>
                {shipStatusMap[shipment.status] ? t(shipStatusMap[shipment.status].labelKey) : shipment.status}
              </span>
            </div>
          </div>
        )}

        {/* No parcel yet — let the user say whether one is even needed, so hand-over
            sales stop showing up in the "add parcel" picker forever. */}
        {!shipment && (
          <div className="bg-white rounded-3xl p-4 shadow-[0_2px_16px_rgba(0,0,0,0.07)]">
            <p className="text-xs font-bold text-gray-400 mb-3">{t('sales.delivery')}</p>
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0 ${sale.delivery_method === 'ship' ? 'bg-orange-50 text-orange-500' : 'bg-gray-100 text-gray-400'}`}>
                {sale.delivery_method === 'ship'
                  ? <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M1 3h15v13H1zM16 8h4l3 3v5h-7V8z" /><circle cx="5.5" cy="18.5" r="2.5" /><circle cx="18.5" cy="18.5" r="2.5" /></svg>
                  : <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
                }
              </div>
              <p className="flex-1 text-sm font-semibold text-gray-800">
                {sale.delivery_method === 'ship' ? t('sales.deliveryShip') : t('sales.deliveryPickup')}
              </p>
              <button onClick={toggleDelivery} disabled={updatingDelivery}
                className="text-xs font-semibold px-3 py-2 rounded-xl bg-gray-50 text-gray-600 active:bg-gray-100 disabled:opacity-50 transition-colors flex-shrink-0">
                {sale.delivery_method === 'ship' ? t('sales.markPickup') : t('sales.markShip')}
              </button>
            </div>
          </div>
        )}

        {/* Items */}
        <div className="bg-white rounded-3xl shadow-[0_2px_16px_rgba(0,0,0,0.07)] overflow-hidden">
          <p className="text-xs font-bold text-gray-400 px-4 pt-4 pb-3">{t('detail.itemsList')}</p>
          {items.map((item, i) => (
            <div key={item.id} className={`flex items-center gap-3 px-4 py-3 ${i > 0 ? 'border-t border-gray-50' : ''}`}>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900 truncate">{(item.product as any)?.name ?? t('detail.productFallback')}</p>
                {(item.product as any)?.sku && <p className="text-xs text-gray-400">{(item.product as any).sku}</p>}
              </div>
              <div className="text-right">
                <p className="text-sm font-bold text-gray-900">{formatMoneyFull(item.total_price)}</p>
                <p className="text-xs text-gray-400">{formatMoneyFull(item.unit_price)} × {item.quantity}</p>
              </div>
            </div>
          ))}
          <div className="flex justify-between px-4 py-3 border-t border-gray-100 bg-gray-50/50">
            <span className="text-sm font-semibold text-gray-700">{t('common.total')}</span>
            <span className="text-sm font-bold text-[#1877F2]">{formatMoneyFull(sale.total_amount)}</span>
          </div>
        </div>

        {sale.slip_url && (
          <div className="bg-white rounded-3xl p-4 shadow-[0_2px_16px_rgba(0,0,0,0.07)]">
            <p className="text-xs font-bold text-gray-400 mb-3">{t('detail.slipTitle')}</p>
            <img src={sale.slip_url} alt="slip" className="w-full h-full rounded-2xl object-cover" />
          </div>
        )}
        {sale.note && (
          <div className="bg-white rounded-3xl p-4 shadow-[0_2px_16px_rgba(0,0,0,0.07)]">
            <p className="text-xs font-bold text-gray-400 mb-1">{t('common.note')}</p>
            <p className="text-sm text-gray-700">{sale.note}</p>
          </div>
        )}
      </div>
    </div>
  )
}
