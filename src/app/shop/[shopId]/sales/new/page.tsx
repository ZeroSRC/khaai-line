'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useShopStore } from '@/store/shopStore'
import { createSupabaseClient } from '@/lib/supabase'
import { formatMoneyFull } from '@/lib/format'
import { useT } from '@/lib/i18n'
import dayjs from 'dayjs'
import type { Product } from '@/lib/types'

interface CartItem { product: Product; quantity: number; unit_price: number }

/** Selected date at the current time-of-day, so "today" keeps the real timestamp
 *  and back-dated records land on the chosen day. */
function toTimestamp(date: string) {
  const n = dayjs()
  return dayjs(date).hour(n.hour()).minute(n.minute()).second(n.second()).toISOString()
}

const BackBtn = ({ onClick }: { onClick: () => void }) => (
  <button onClick={onClick} className="w-9 h-9 rounded-2xl bg-gray-50 flex items-center justify-center text-gray-500 active:bg-gray-100 transition-colors">
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
  </button>
)

export default function NewSalePage() {
  const { shopId } = useParams<{ shopId: string }>()
  const router = useRouter()
  const { shop, lineUid, jwt } = useShopStore()
  const t = useT()
  const [products, setProducts] = useState<Product[]>([])
  const [cart, setCart] = useState<CartItem[]>([])
  const [slipFile, setSlipFile] = useState<File | null>(null)
  const [slipType, setSlipType] = useState<'transfer' | 'cash' | ''>('')
  const [note, setNote] = useState('')
  const [date, setDate] = useState(dayjs().format('YYYY-MM-DD'))
  const [saving, setSaving] = useState(false)
  const [search, setSearch] = useState('')
  const [showPicker, setShowPicker] = useState(false)

  useEffect(() => {
    if (!shop || !lineUid) return
    createSupabaseClient(jwt ?? undefined)
      .from('products').select('*').eq('shop_id', shop.id).eq('is_active', true).gt('stock', 0)
      .then(({ data }) => setProducts((data ?? []) as Product[]))
  }, [shop, lineUid])

  const addToCart = (product: Product) => {
    setCart((prev) => {
      const existing = prev.find((i) => i.product.id === product.id)
      if (existing) return prev.map((i) => i.product.id === product.id ? { ...i, quantity: i.quantity + 1 } : i)
      return [...prev, { product, quantity: 1, unit_price: product.sell_price }]
    })
    setSearch(''); setShowPicker(false)
  }
  const updateQty = (id: string, qty: number) => {
    if (qty <= 0) setCart((p) => p.filter((i) => i.product.id !== id))
    else setCart((p) => p.map((i) => i.product.id === id ? { ...i, quantity: qty } : i))
  }
  const updatePrice = (id: string, price: number) =>
    setCart((p) => p.map((i) => i.product.id === id ? { ...i, unit_price: price } : i))

  const total = cart.reduce((s, i) => s + i.quantity * i.unit_price, 0)
  const vatAmount = shop?.vat_enabled ? total * (Number(shop.vat_rate) / 100) : 0
  const grand = total + vatAmount

  const filtered = products.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase()) || (p.sku?.toLowerCase().includes(search.toLowerCase()))
  )

  const handleSave = async () => {
    if (!shop || !lineUid || cart.length === 0) return
    setSaving(true)
    const sb = createSupabaseClient(jwt ?? undefined)
    let slipUrl: string | null = null
    if (slipFile) {
      const ext = slipFile.name.split('.').pop()
      const path = `${shop.id}/slips/${Date.now()}.${ext}`
      const { data: up } = await sb.storage.from('slips').upload(path, slipFile)
      if (up) slipUrl = sb.storage.from('slips').getPublicUrl(path).data.publicUrl
    }
    const refNumber = `SO-${date.replace(/-/g, '')}-${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`
    const { data: sale, error } = await sb.from('sales').insert({
      shop_id: shop.id, ref_number: refNumber, total_amount: grand,
      vat_amount: vatAmount, slip_url: slipUrl, slip_type: slipType || null,
      note: note || null, created_by: lineUid, created_at: toTimestamp(date),
    }).select().single()
    if (error || !sale) { setSaving(false); return }
    await sb.from('sale_items').insert(cart.map((i) => ({
      shop_id: shop.id, sale_id: sale.id, product_id: i.product.id,
      quantity: i.quantity, unit_price: i.unit_price, total_price: i.quantity * i.unit_price,
    })))
    router.push(`/shop/${shopId}/sales`)
  }

  return (
    <div className="pb-52">
      <div className="px-4 pt-12 pb-4 flex items-center gap-3">
        <BackBtn onClick={() => router.back()} />
        <h1 className="text-lg font-bold text-gray-900">{t('sales.newTitle')}</h1>
      </div>

      <div className="px-4 space-y-3">
        {/* Product picker */}
        <div className="bg-white rounded-3xl p-4 shadow-[0_2px_16px_rgba(0,0,0,0.07)]">
          <div className="flex items-center gap-2 bg-gray-50 rounded-2xl px-4 py-3">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <input className="flex-1 bg-transparent text-sm focus:outline-none placeholder:text-gray-400"
              placeholder={t('sales.searchProduct')}
              value={search}
              onFocus={() => setShowPicker(true)}
              onChange={(e) => { setSearch(e.target.value); setShowPicker(true) }}
            />
            {search && <button onClick={() => { setSearch(''); setShowPicker(false) }} className="text-gray-400 text-lg leading-none">×</button>}
          </div>

          {showPicker && (
            <div className="mt-3 space-y-1.5 max-h-52 overflow-y-auto no-scrollbar">
              {filtered.length === 0
                ? <p className="text-center text-sm text-gray-400 py-4">{t('sales.notFound')}</p>
                : filtered.map((p) => (
                  <button key={p.id} onClick={() => addToCart(p)}
                    className="w-full flex items-center justify-between px-3 py-2.5 rounded-2xl bg-gray-50 active:bg-[#1877F2]/10 transition-colors text-left">
                    <div>
                      <p className="text-sm font-semibold text-gray-900">{p.name}</p>
                      <p className="text-xs text-gray-400">{t('sales.stockPcs', { n: p.stock })}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-[#1877F2]">{formatMoneyFull(p.sell_price)}</p>
                    </div>
                  </button>
                ))
              }
            </div>
          )}
        </div>

        {/* Cart */}
        {cart.length > 0 && (
          <div className="bg-white rounded-3xl shadow-[0_2px_16px_rgba(0,0,0,0.07)] overflow-hidden">
            <p className="text-xs font-bold text-gray-400 px-4 pt-4 pb-3">{t('sales.soldItems')}</p>
            {cart.map((item, i) => (
              <div key={item.product.id} className={`px-4 py-3 ${i > 0 ? 'border-t border-gray-50' : ''}`}>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-semibold text-gray-900 truncate flex-1 mr-2">{item.product.name}</p>
                  <button onClick={() => updateQty(item.product.id, 0)} className="w-6 h-6 rounded-full bg-red-50 flex items-center justify-center flex-shrink-0">
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                  </button>
                </div>
                <div className="flex gap-2">
                  <div className="flex items-center bg-gray-50 rounded-2xl overflow-hidden flex-1">
                    <button onClick={() => updateQty(item.product.id, item.quantity - 1)} className="w-10 h-10 flex items-center justify-center text-gray-400 text-lg active:bg-gray-100 transition-colors">−</button>
                    <span className="flex-1 text-center text-sm font-bold">{item.quantity}</span>
                    <button onClick={() => updateQty(item.product.id, item.quantity + 1)} className="w-10 h-10 flex items-center justify-center text-[#1877F2] text-lg active:bg-gray-100 transition-colors">+</button>
                  </div>
                  <div className="flex items-center bg-gray-50 rounded-2xl px-3 flex-1">
                    <span className="text-xs text-gray-400 mr-1">฿</span>
                    <input className="flex-1 text-sm bg-transparent focus:outline-none font-semibold w-0"
                      type="number" inputMode="decimal" value={item.unit_price}
                      onChange={(e) => updatePrice(item.product.id, parseFloat(e.target.value) || 0)}
                    />
                  </div>
                </div>
                <p className="text-xs text-right text-gray-400 mt-1.5">{t('sales.lineTotal', { v: formatMoneyFull(item.quantity * item.unit_price) })}</p>
              </div>
            ))}
            <div className="px-4 py-3 border-t border-gray-100 bg-gray-50/50">
              {vatAmount > 0 && (
                <div className="flex justify-between text-xs text-gray-400 mb-1.5">
                  <span>VAT {shop?.vat_rate}%</span><span>{formatMoneyFull(vatAmount)}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-sm font-bold text-gray-700">{t('common.total')}</span>
                <span className="text-base font-bold text-[#1877F2]">{formatMoneyFull(grand)}</span>
              </div>
            </div>
          </div>
        )}

        {/* Payment */}
        <div className="bg-white rounded-3xl p-4 shadow-[0_2px_16px_rgba(0,0,0,0.07)]">
          <p className="text-xs font-bold text-gray-400 mb-3">{t('sales.payment')}</p>
          <div className="flex gap-2 mb-3">
            {(['transfer', 'cash'] as const).map((type) => (
              <button key={type} onClick={() => setSlipType(type)}
                className={`flex-1 py-3 rounded-2xl text-sm font-semibold transition-colors ${slipType === type ? 'bg-[#1877F2] text-white shadow-[0_4px_12px_rgba(24,119,242,0.35)]' : 'bg-gray-50 text-gray-500'}`}>
                {type === 'transfer' ? t('sales.transfer') : t('sales.cash')}
              </button>
            ))}
          </div>
          {slipType === 'transfer' && (
            <label className="flex flex-col items-center justify-center bg-gray-50 rounded-2xl h-24 cursor-pointer border-2 border-dashed border-gray-200 active:border-[#1877F2] transition-colors">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={slipFile ? '#1877F2' : '#9ca3af'} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
              <p className="text-xs text-gray-400 mt-1">{slipFile ? slipFile.name : t('sales.uploadSlip')}</p>
              <input type="file" accept="image/*" className="hidden" onChange={(e) => setSlipFile(e.target.files?.[0] ?? null)} />
            </label>
          )}
        </div>

        {/* Date */}
        <div className="bg-white rounded-3xl p-4 shadow-[0_2px_16px_rgba(0,0,0,0.07)]">
          <p className="text-xs font-bold text-gray-400 mb-2">{t('common.txnDate')}</p>
          <input type="date" max={dayjs().format('YYYY-MM-DD')}
            className="w-full bg-gray-50 border-0 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#1877F2]/30"
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
        <button onClick={handleSave} disabled={cart.length === 0 || saving}
          className="w-full bg-[#1877F2] disabled:bg-gray-200 text-white disabled:text-gray-400 font-bold py-4 rounded-2xl text-base transition-all shadow-[0_4px_16px_rgba(24,119,242,0.35)] disabled:shadow-none active:scale-[0.98]">
          {saving ? t('common.saving') : `${t('sales.saveBtn')}${cart.length > 0 ? ` · ${formatMoneyFull(grand)}` : ''}`}
        </button>
      </div>
    </div>
  )
}
