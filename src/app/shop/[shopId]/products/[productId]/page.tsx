'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useShopStore } from '@/store/shopStore'
import { createSupabaseClient } from '@/lib/supabase'
import { uploadProductImage, MAX_IMAGE_BYTES } from '@/lib/storage'
import { ProductImagePicker } from '@/components/ProductImagePicker'
import { confirmDialog } from '@/lib/confirm'
import { useT } from '@/lib/i18n'
import type { Product } from '@/lib/types'

const BackBtn = ({ onClick }: { onClick: () => void }) => (
  <button onClick={onClick} className="w-9 h-9 rounded-2xl bg-gray-50 flex items-center justify-center text-gray-500 active:bg-gray-100 transition-colors">
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
  </button>
)
const inp = 'w-full bg-gray-50 border-0 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#1877F2]/30'
const Field = ({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) => (
  <div><p className="text-xs text-gray-400 font-medium mb-1.5">{label}{required && <span className="text-red-400 ml-0.5">*</span>}</p>{children}</div>
)

export default function EditProductPage() {
  const { shopId, productId } = useParams<{ shopId: string; productId: string }>()
  const router = useRouter()
  const { shop, lineUid, jwt } = useShopStore()
  const t = useT()
  const [name, setName] = useState('')
  const [sku, setSku] = useState('')
  const [sellPrice, setSellPrice] = useState('')
  const [costPrice, setCostPrice] = useState('')
  const [stock, setStock] = useState('0')
  const [warrantyDays, setWarrantyDays] = useState('0')
  const [isActive, setIsActive] = useState(true)
  const [imageUrl, setImageUrl] = useState<string | null>(null)   // saved image (null = removed)
  const [imageFile, setImageFile] = useState<File | null>(null)   // newly picked, not uploaded yet
  const [imageError, setImageError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!shop || !lineUid) return
    createSupabaseClient(jwt ?? undefined)
      .from('products').select('*').eq('id', productId).single()
      .then(({ data }) => {
        if (!data) return
        const p = data as Product
        setName(p.name); setSku(p.sku ?? ''); setSellPrice(String(p.sell_price))
        setCostPrice(String(p.cost_price)); setStock(String(p.stock))
        setWarrantyDays(String(p.warranty_days)); setIsActive(p.is_active)
        setImageUrl(p.image_url)
        setLoading(false)
      })
  }, [shop, lineUid, productId])

  const pickImage = (f: File) => {
    if (f.size > MAX_IMAGE_BYTES) { setImageError(t('products.imageTooBig')); return }
    setImageError(null)
    setImageFile(f)
  }

  const handleSave = async () => {
    if (!shop || !lineUid || !name.trim()) return
    setSaving(true); setError('')
    const sb = createSupabaseClient(jwt ?? undefined)

    // A newly picked file wins; otherwise keep whatever imageUrl currently holds
    // (null when the user removed the existing photo).
    let finalImageUrl = imageUrl
    if (imageFile) {
      try {
        finalImageUrl = await uploadProductImage(sb, shop.id, imageFile)
      } catch (e) {
        setError(t('products.saveFailed') + (e as Error).message)
        setSaving(false)
        return
      }
    }

    const { error: err } = await sb.from('products').update({
      name: name.trim(), sku: sku.trim() || null, image_url: finalImageUrl,
      sell_price: parseFloat(sellPrice) || 0, cost_price: parseFloat(costPrice) || 0,
      stock: parseInt(stock) || 0, warranty_days: parseInt(warrantyDays) || 0, is_active: isActive,
      last_upd_by: lineUid,
    }).eq('id', productId)
    if (err) { setError(t('products.saveFailed') + err.message); setSaving(false) }
    else router.push(`/shop/${shopId}/products`)
  }

  const handleDelete = async () => {
    if (!shop || !lineUid) return
    const sb = createSupabaseClient(jwt ?? undefined)

    // Show the blast radius BEFORE deleting: how many sales/purchases include this product.
    const { data: saleItemRows } = await sb.from('sale_items').select('sale_id').eq('product_id', productId)
    const saleIds = Array.from(new Set((saleItemRows ?? []).map((r) => r.sale_id)))
    let shipCount = 0
    if (saleIds.length > 0) {
      const { count } = await sb.from('shipments').select('id', { count: 'exact', head: true }).in('sale_id', saleIds)
      shipCount = count ?? 0
    }

    const hasHistory = saleIds.length > 0 || shipCount > 0
    const ok = await confirmDialog({
      title: t('products.deleteConfirm'),
      text: hasHistory ? t('products.deleteCascade', { sales: saleIds.length, ships: shipCount }) : undefined,
      confirmText: t('products.deleteBtn'),
      cancelText: t('common.cancel'),
      danger: true,
    })
    if (!ok) return

    // One transaction on the server — RESTRICT FKs make a client-side cascade unsafe.
    const { error } = await sb.rpc('delete_product_cascade', { p_product_id: productId, p_by: lineUid })
    if (error) { setError(t('products.deleteFailed') + error.message); return }
    router.push(`/shop/${shopId}/products`)
  }

  const profit = sellPrice && costPrice ? parseFloat(sellPrice) - parseFloat(costPrice) : null

  if (loading) return <div className="flex items-center justify-center min-h-dvh"><div className="w-8 h-8 rounded-2xl bg-[#1877F2] animate-pulse" /></div>

  return (
    <div className="pb-52">
      <div className="px-4 pt-8 pb-4 flex items-center gap-3">
        <BackBtn onClick={() => router.back()} />
        <h1 className="text-lg font-bold text-gray-900 flex-1">{t('products.editTitle')}</h1>
        <button onClick={handleDelete}
          className="flex items-center gap-1.5 text-sm text-red-500 font-semibold px-3 py-1.5 rounded-xl bg-red-50 active:bg-red-100 transition-colors flex-shrink-0">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/>
          </svg>
          {t('products.deleteBtn')}
        </button>
      </div>

      <div className="px-4 space-y-3">
        <ProductImagePicker
          file={imageFile}
          existingUrl={imageUrl}
          onSelect={pickImage}
          onRemove={() => { setImageFile(null); setImageUrl(null); setImageError(null) }}
          error={imageError}
        />

        {/* Info */}
        <div className="bg-white rounded-3xl p-4 shadow-[0_2px_16px_rgba(0,0,0,0.07)] space-y-3">
          <p className="text-xs font-bold text-gray-400">{t('products.info')}</p>
          <Field label={t('products.name')} required>
            <input className={inp} value={name} onChange={(e) => setName(e.target.value)} />
          </Field>
          <Field label={t('products.sku')}>
            <input className={inp} placeholder="SKU-001" value={sku} onChange={(e) => setSku(e.target.value)} />
          </Field>
          <div className="flex items-center justify-between bg-gray-50 rounded-2xl px-4 py-3">
            <span className="text-sm text-gray-700">{t('products.show')}</span>
            <button onClick={() => setIsActive(!isActive)}
              className={`w-12 h-6 rounded-full transition-colors ${isActive ? 'bg-[#1877F2]' : 'bg-gray-200'}`}>
              <span className={`block w-5 h-5 bg-white rounded-full shadow transition-transform mx-0.5 ${isActive ? 'translate-x-6' : 'translate-x-0'}`} />
            </button>
          </div>
        </div>

        {/* Prices */}
        <div className="bg-white rounded-3xl p-4 shadow-[0_2px_16px_rgba(0,0,0,0.07)] space-y-3">
          <p className="text-xs font-bold text-gray-400">{t('products.price')}</p>
          <div className="grid grid-cols-2 gap-3">
            <Field label={t('products.sellPrice')}>
              <input className={inp} type="number" inputMode="decimal" value={sellPrice} onChange={(e) => setSellPrice(e.target.value)} />
            </Field>
            <Field label={t('products.costPrice')}>
              <input className={inp} type="number" inputMode="decimal" value={costPrice} onChange={(e) => setCostPrice(e.target.value)} />
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

        {/* Stock */}
        <div className="bg-white rounded-3xl p-4 shadow-[0_2px_16px_rgba(0,0,0,0.07)] space-y-3">
          <p className="text-xs font-bold text-gray-400">{t('products.stockWarranty')}</p>
          <div className="grid grid-cols-2 gap-3">
            <Field label={t('products.stock')}>
              <input className={inp} type="number" inputMode="numeric" value={stock} onChange={(e) => setStock(e.target.value)} />
            </Field>
            <Field label={t('products.warranty')}>
              <input className={inp} type="number" inputMode="numeric" value={warrantyDays} onChange={(e) => setWarrantyDays(e.target.value)} />
            </Field>
          </div>
        </div>

        {error && <p className="text-sm text-red-500 text-center bg-red-50 rounded-2xl px-4 py-3">{error}</p>}
      </div>

      <div className="fixed bottom-24 left-0 right-0 max-w-[430px] mx-auto px-4 z-40">
        <button onClick={handleSave} disabled={!name.trim() || saving}
          className="w-full bg-[#1877F2] disabled:bg-gray-200 text-white disabled:text-gray-400 font-bold py-4 rounded-2xl text-base transition-all shadow-[0_4px_16px_rgba(24,119,242,0.35)] disabled:shadow-none active:scale-[0.98]">
          {saving ? (imageFile ? t('products.uploading') : t('common.saving')) : t('products.saveEdit')}
        </button>
      </div>
    </div>
  )
}
