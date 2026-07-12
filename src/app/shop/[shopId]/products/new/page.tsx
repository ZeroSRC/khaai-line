'use client'

import { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useShopStore } from '@/store/shopStore'
import { createSupabaseClient } from '@/lib/supabase'
import { useT } from '@/lib/i18n'

const BackBtn = ({ onClick }: { onClick: () => void }) => (
  <button onClick={onClick} className="w-9 h-9 rounded-2xl bg-gray-50 flex items-center justify-center text-gray-500 active:bg-gray-100 transition-colors">
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
  </button>
)

const Field = ({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) => (
  <div>
    <p className="text-xs text-gray-400 font-medium mb-1.5">{label}{required && <span className="text-red-400 ml-0.5">*</span>}</p>
    {children}
  </div>
)

const inp = 'w-full bg-gray-50 border-0 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#1877F2]/30'

export default function NewProductPage() {
  const { shopId } = useParams<{ shopId: string }>()
  const router = useRouter()
  const { shop, lineUid, jwt } = useShopStore()
  const t = useT()
  const [name, setName] = useState('')
  const [sku, setSku] = useState('')
  const [sellPrice, setSellPrice] = useState('')
  const [costPrice, setCostPrice] = useState('')
  const [stock, setStock] = useState('0')
  const [warrantyDays, setWarrantyDays] = useState('0')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const profit = sellPrice && costPrice ? parseFloat(sellPrice) - parseFloat(costPrice) : null

  const handleSave = async () => {
    if (!shop || !lineUid || !name.trim()) return
    setSaving(true); setError('')
    const { error: err } = await createSupabaseClient(jwt ?? undefined)
      .from('products').insert({
        shop_id: shop.id, name: name.trim(), sku: sku.trim() || null,
        sell_price: parseFloat(sellPrice) || 0, cost_price: parseFloat(costPrice) || 0,
        stock: parseInt(stock) || 0, warranty_days: parseInt(warrantyDays) || 0, is_active: true,
      })
    if (err) { setError(t('products.saveFailed') + err.message); setSaving(false) }
    else router.push(`/shop/${shopId}/products`)
  }

  return (
    <div className="pb-52">
      <div className="px-4 pt-8 pb-4 flex items-center gap-3">
        <BackBtn onClick={() => router.back()} />
        <h1 className="text-lg font-bold text-gray-900">{t('products.newTitle')}</h1>
      </div>

      <div className="px-4 space-y-3">
        {/* Info */}
        <div className="bg-white rounded-3xl p-4 shadow-[0_2px_16px_rgba(0,0,0,0.07)] space-y-3">
          <p className="text-xs font-bold text-gray-400">{t('products.info')}</p>
          <Field label={t('products.name')} required>
            <input className={inp} placeholder={t('products.namePlaceholder')} value={name} onChange={(e) => setName(e.target.value)} autoFocus />
          </Field>
          <Field label={t('products.sku')}>
            <input className={inp} placeholder={t('products.skuPlaceholder')} value={sku} onChange={(e) => setSku(e.target.value)} />
          </Field>
        </div>

        {/* Prices */}
        <div className="bg-white rounded-3xl p-4 shadow-[0_2px_16px_rgba(0,0,0,0.07)] space-y-3">
          <p className="text-xs font-bold text-gray-400">{t('products.price')}</p>
          <div className="grid grid-cols-2 gap-3">
            <Field label={t('products.sellPrice')}>
              <input className={inp} placeholder="0" type="number" inputMode="decimal" value={sellPrice} onChange={(e) => setSellPrice(e.target.value)} />
            </Field>
            <Field label={t('products.costPrice')}>
              <input className={inp} placeholder="0" type="number" inputMode="decimal" value={costPrice} onChange={(e) => setCostPrice(e.target.value)} />
            </Field>
          </div>
          {profit !== null && (
            <div className="flex items-center justify-between bg-gray-50 rounded-2xl px-4 py-3">
              <span className="text-xs text-gray-500">{t('products.profitPer')}</span>
              <span className={`text-sm font-bold ${profit >= 0 ? 'text-[#1877F2]' : 'text-red-500'}`}>
                {profit >= 0 ? '+' : ''}{profit.toLocaleString('th')} {t('common.baht')}
              </span>
            </div>
          )}
        </div>

        {/* Stock & warranty */}
        <div className="bg-white rounded-3xl p-4 shadow-[0_2px_16px_rgba(0,0,0,0.07)] space-y-3">
          <p className="text-xs font-bold text-gray-400">{t('products.stockWarranty')}</p>
          <div className="grid grid-cols-2 gap-3">
            <Field label={t('products.stock')}>
              <input className={inp} placeholder="0" type="number" inputMode="numeric" value={stock} onChange={(e) => setStock(e.target.value)} />
            </Field>
            <Field label={t('products.warranty')}>
              <input className={inp} placeholder="0" type="number" inputMode="numeric" value={warrantyDays} onChange={(e) => setWarrantyDays(e.target.value)} />
            </Field>
          </div>
        </div>

        {error && <p className="text-sm text-red-500 text-center bg-red-50 rounded-2xl px-4 py-3">{error}</p>}
      </div>

      <div className="fixed bottom-24 left-0 right-0 max-w-[430px] mx-auto px-4 z-40">
        <button onClick={handleSave} disabled={!name.trim() || saving}
          className="w-full bg-[#1877F2] disabled:bg-gray-200 text-white disabled:text-gray-400 font-bold py-4 rounded-2xl text-base transition-all shadow-[0_4px_16px_rgba(24,119,242,0.35)] disabled:shadow-none active:scale-[0.98]">
          {saving ? t('common.saving') : t('products.addBtn')}
        </button>
      </div>
    </div>
  )
}
