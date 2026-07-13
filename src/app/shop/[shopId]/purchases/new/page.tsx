'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { useShopStore } from '@/store/shopStore'
import { createSupabaseClient } from '@/lib/supabase'
import { formatMoneyFull } from '@/lib/format'
import { useT } from '@/lib/i18n'
import { DateField } from '@/components/DateField'
import dayjs from 'dayjs'
import type { Product } from '@/lib/types'

interface PurchaseItem { product: Product; quantity: number; cost_price: number }

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

const SUPPLIER_OPTIONS = ['Facebook', 'Shopee', 'Lazada', 'LINE', 'AliExpress', 'อื่นๆ']

// Simple brand-coloured badges (not the exact trademarks) so each source is recognisable at a glance.
const badge = 'w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0 text-white'
const SUPPLIER_LOGOS: Record<string, JSX.Element> = {
  Facebook: <span className={`${badge} bg-[#1877F2] text-[13px] font-black leading-none`}>f</span>,
  Shopee: (
    <span className={`${badge} bg-[#EE4D2D]`}>
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 01-8 0"/>
      </svg>
    </span>
  ),
  Lazada: (
    <span className={`${badge} bg-[#1A0DAB]`}>
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 01-8 0"/>
      </svg>
    </span>
  ),
  LINE: (
    <span className={`${badge} bg-[#06C755]`}>
      <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 3C6.48 3 2 6.7 2 11.26c0 4.09 3.6 7.51 8.46 8.15.33.07.78.22.9.5.1.26.06.63.03.9l-.13.85c-.04.25-.2 1 .88.55 1.07-.46 5.78-3.4 7.89-5.83C21.6 14.62 22 13 22 11.26 22 6.7 17.52 3 12 3z"/>
      </svg>
    </span>
  ),
  AliExpress: <span className={`${badge} bg-[#E62E04] text-[12px] font-black leading-none`}>A</span>,
  'อื่นๆ': <span className={`${badge} bg-gray-300 text-gray-600 text-[13px] font-black leading-none`}>···</span>,
}

export default function NewPurchasePage() {
  const { shopId } = useParams<{ shopId: string }>()
  const router = useRouter()
  const { shop, lineUid, jwt } = useShopStore()
  const t = useT()
  const [products, setProducts] = useState<Product[]>([])
  const [cart, setCart] = useState<PurchaseItem[]>([])
  const [supplierPreset, setSupplierPreset] = useState('')
  const [supplierCustom, setSupplierCustom] = useState('')
  const [note, setNote] = useState('')
  const [date, setDate] = useState(dayjs().format('YYYY-MM-DD'))
  const [search, setSearch] = useState('')
  const [showPicker, setShowPicker] = useState(false)
  const [slipFile, setSlipFile] = useState<File | null>(null)
  const [saving, setSaving] = useState(false)

  const supplier = supplierPreset === 'อื่นๆ' ? supplierCustom : supplierPreset

  useEffect(() => {
    if (!shop || !lineUid) return
    createSupabaseClient(jwt ?? undefined)
      .from('products').select('*').eq('shop_id', shop.id).eq('is_active', true).order('name')
      .then(({ data }) => setProducts((data ?? []) as Product[]))
  }, [shop, lineUid])

  const addToCart = (product: Product) => {
    setCart((prev) => {
      const existing = prev.find((i) => i.product.id === product.id)
      if (existing) return prev.map((i) => i.product.id === product.id ? { ...i, quantity: i.quantity + 1 } : i)
      return [...prev, { product, quantity: 1, cost_price: product.cost_price }]
    })
    setSearch(''); setShowPicker(false)
  }
  const updateQty = (id: string, qty: number) => {
    if (qty <= 0) setCart((p) => p.filter((i) => i.product.id !== id))
    else setCart((p) => p.map((i) => i.product.id === id ? { ...i, quantity: qty } : i))
  }
  const updateCost = (id: string, cost: number) =>
    setCart((p) => p.map((i) => i.product.id === id ? { ...i, cost_price: cost } : i))

  const total = cart.reduce((s, i) => s + i.quantity * i.cost_price, 0)
  const filtered = products.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase()) || (p.sku?.toLowerCase().includes(search.toLowerCase()))
  )

  const handleSave = async () => {
    if (!shop || !lineUid || cart.length === 0) return
    setSaving(true)
    const sb = createSupabaseClient(jwt ?? undefined)
    const refNumber = `PO-${date.replace(/-/g, '')}-${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`
    let slipUrl: string | null = null
    if (slipFile) {
      const ext = slipFile.name.split('.').pop()
      const path = `${shop.id}/purchase-slips/${Date.now()}.${ext}`
      const { data: up } = await sb.storage.from('slips').upload(path, slipFile)
      if (up) slipUrl = sb.storage.from('slips').getPublicUrl(path).data.publicUrl
    }
    const { data: purchase, error } = await sb.from('purchases').insert({
      shop_id: shop.id, supplier: supplier.trim() || null,
      ref_number: refNumber, total_amount: total, slip_url: slipUrl, note: note.trim() || null,
      created_at: toTimestamp(date),
    }).select().single()
    if (error || !purchase) { setSaving(false); return }
    await sb.from('purchase_items').insert(cart.map((i) => ({
      shop_id: shop.id, purchase_id: purchase.id, product_id: i.product.id,
      quantity: i.quantity, unit_cost: i.cost_price, total_cost: i.quantity * i.cost_price,
    })))
    router.push(`/shop/${shopId}/purchases`)
  }

  return (
    <div className="pb-52">
      <div className="px-4 pt-8 pb-4 flex items-center gap-3">
        <BackBtn onClick={() => router.back()} />
        <h1 className="text-lg font-bold text-gray-900">{t('purchases.newTitle')}</h1>
      </div>

      <div className="px-4 space-y-3">
        {/* Supplier */}
        <div className="bg-white rounded-3xl p-4 shadow-[0_2px_16px_rgba(0,0,0,0.07)]">
          <p className="text-xs font-bold text-gray-400 mb-3">{t('purchases.supplier')}</p>
          <div className="grid grid-cols-3 gap-2">
            {SUPPLIER_OPTIONS.map((opt) => (
              <button key={opt}
                onClick={() => { setSupplierPreset(opt); if (opt !== 'อื่นๆ') setSupplierCustom('') }}
                className={`flex items-center justify-center gap-1.5 px-2 py-2.5 rounded-2xl text-xs font-semibold transition-colors ${supplierPreset === opt ? 'bg-[#1877F2] text-white shadow-[0_4px_12px_rgba(24,119,242,0.3)]' : 'bg-gray-50 text-gray-600'}`}>
                {SUPPLIER_LOGOS[opt]}
                <span className="truncate">{opt === 'อื่นๆ' ? t('expenses.catOther') : opt}</span>
              </button>
            ))}
          </div>
          {supplierPreset === 'อื่นๆ' && (
            <input className="w-full mt-3 bg-gray-50 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#1877F2]/30 border-0"
              placeholder={t('purchases.supplierPlaceholder')} value={supplierCustom} onChange={(e) => setSupplierCustom(e.target.value)} autoFocus />
          )}
        </div>

        {/* Product picker */}
        <div className="bg-white rounded-3xl p-4 shadow-[0_2px_16px_rgba(0,0,0,0.07)]">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-bold text-gray-400">{t('purchases.pickProduct')}</p>
            <Link href={`/shop/${shopId}/products/new`} className="text-xs text-[#1877F2] font-semibold">{t('purchases.addNewProduct')}</Link>
          </div>
          <div className="flex items-center gap-2 bg-gray-50 rounded-2xl px-4 py-3">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <input className="flex-1 bg-transparent text-sm focus:outline-none placeholder:text-gray-400"
              placeholder={t('purchases.searchName')}
              value={search} onFocus={() => setShowPicker(true)}
              onChange={(e) => { setSearch(e.target.value); setShowPicker(true) }}
            />
          </div>

          {showPicker && (
            <div className="mt-3 space-y-1.5 max-h-52 overflow-y-auto no-scrollbar">
              {filtered.length === 0 && search ? (
                <div className="py-4 text-center">
                  <p className="text-sm text-gray-400">{t('purchases.notFoundName')} &ldquo;{search}&rdquo;</p>
                  <Link href={`/shop/${shopId}/products/new`} className="mt-1 inline-block text-sm font-semibold text-[#1877F2]">{t('purchases.addProductFirst')}</Link>
                </div>
              ) : filtered.length === 0 ? (
                <p className="text-center text-sm text-gray-400 py-4">{t('purchases.noProducts')}</p>
              ) : filtered.map((p) => (
                <button key={p.id} onClick={() => addToCart(p)}
                  className="w-full flex items-center justify-between px-3 py-2.5 rounded-2xl bg-gray-50 active:bg-indigo-50 transition-colors text-left">
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{p.name}</p>
                    <p className="text-xs text-gray-400">{t('sales.stockPcs', { n: p.stock })} · {t('products.cost', { v: formatMoneyFull(p.cost_price) })}</p>
                  </div>
                  <div className="w-7 h-7 rounded-full bg-indigo-500 flex items-center justify-center flex-shrink-0 text-white text-lg leading-none">+</div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Cart */}
        {cart.length > 0 && (
          <div className="bg-white rounded-3xl shadow-[0_2px_16px_rgba(0,0,0,0.07)] overflow-hidden">
            <p className="text-xs font-bold text-gray-400 px-4 pt-4 pb-3">{t('purchases.boughtItems')}</p>
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
                    <button onClick={() => updateQty(item.product.id, item.quantity - 1)} className="w-10 h-10 flex items-center justify-center text-gray-400 text-lg">−</button>
                    <span className="flex-1 text-center text-sm font-bold">{item.quantity}</span>
                    <button onClick={() => updateQty(item.product.id, item.quantity + 1)} className="w-10 h-10 flex items-center justify-center text-indigo-500 text-lg">+</button>
                  </div>
                  <div className="flex items-center bg-gray-50 rounded-2xl px-3 flex-1">
                    <input className="flex-1 text-sm bg-transparent focus:outline-none font-semibold w-0"
                      type="number" inputMode="decimal" value={item.cost_price}
                      onChange={(e) => updateCost(item.product.id, parseFloat(e.target.value) || 0)}
                    />
                    <span className="text-xs text-gray-400 ml-1 flex-shrink-0">{t('common.baht')}</span>
                  </div>
                </div>
              </div>
            ))}
            <div className="flex justify-between px-4 py-3 border-t border-gray-100 bg-gray-50/50">
              <span className="text-sm font-bold text-gray-700">{t('common.total')}</span>
              <span className="text-sm font-bold text-red-500">{formatMoneyFull(total)}</span>
            </div>
          </div>
        )}

        {/* Slip */}
        <div className="bg-white rounded-3xl p-4 shadow-[0_2px_16px_rgba(0,0,0,0.07)]">
          <p className="text-xs font-bold text-gray-400 mb-3">{t('purchases.slip')}</p>
          <label className="flex flex-col items-center justify-center bg-gray-50 rounded-2xl h-24 cursor-pointer border-2 border-dashed border-gray-200 active:border-[#1877F2] transition-colors">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={slipFile ? '#1877F2' : '#9ca3af'} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
            <p className="text-xs text-gray-400 mt-1">{slipFile ? slipFile.name : t('purchases.uploadSlip')}</p>
            <input type="file" accept="image/*" className="hidden" onChange={(e) => setSlipFile(e.target.files?.[0] ?? null)} />
          </label>
          {slipFile && <button onClick={() => setSlipFile(null)} className="mt-2 text-xs text-red-400 w-full text-center">{t('purchases.removeSlip')}</button>}
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
        <button onClick={handleSave} disabled={cart.length === 0 || saving}
          className="w-full bg-indigo-500 disabled:bg-gray-200 text-white disabled:text-gray-400 font-bold py-4 rounded-2xl text-base transition-all shadow-[0_4px_16px_rgba(79,70,229,0.35)] disabled:shadow-none active:scale-[0.98]">
          {saving ? t('common.saving') : `${t('purchases.saveBtn')}${cart.length > 0 ? ` · ${formatMoneyFull(total)}` : ''}`}
        </button>
      </div>
    </div>
  )
}
