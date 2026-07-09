'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useShopStore } from '@/store/shopStore'
import { createSupabaseClient } from '@/lib/supabase'
import { formatMoneyFull } from '@/lib/format'
import type { Product } from '@/lib/types'

interface CartItem {
  product: Product
  quantity: number
  unit_price: number
}

export default function NewSalePage() {
  const { shopId } = useParams<{ shopId: string }>()
  const router = useRouter()
  const { shop, lineUid, jwt } = useShopStore()
  const [products, setProducts] = useState<Product[]>([])
  const [cart, setCart] = useState<CartItem[]>([])
  const [slipFile, setSlipFile] = useState<File | null>(null)
  const [slipType, setSlipType] = useState<'transfer' | 'cash' | ''>('')
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)
  const [search, setSearch] = useState('')

  useEffect(() => {
    if (!shop || !lineUid) return
    createSupabaseClient(jwt ?? undefined)
      .from('products')
      .select('*')
      .eq('shop_id', shop.id)
      .eq('is_active', true)
      .gt('stock', 0)
      .then(({ data }) => setProducts((data ?? []) as Product[]))
  }, [shop, lineUid])

  const addToCart = (product: Product) => {
    setCart((prev) => {
      const existing = prev.find((i) => i.product.id === product.id)
      if (existing) return prev.map((i) => i.product.id === product.id ? { ...i, quantity: i.quantity + 1 } : i)
      return [...prev, { product, quantity: 1, unit_price: product.sell_price }]
    })
  }

  const updateQty = (productId: string, qty: number) => {
    if (qty <= 0) setCart((prev) => prev.filter((i) => i.product.id !== productId))
    else setCart((prev) => prev.map((i) => i.product.id === productId ? { ...i, quantity: qty } : i))
  }

  const updatePrice = (productId: string, price: number) =>
    setCart((prev) => prev.map((i) => i.product.id === productId ? { ...i, unit_price: price } : i))

  const removeFromCart = (productId: string) =>
    setCart((prev) => prev.filter((i) => i.product.id !== productId))

  const total = cart.reduce((s, i) => s + i.quantity * i.unit_price, 0)
  const vatAmount = shop?.vat_enabled ? total * (Number(shop.vat_rate) / 100) : 0

  const handleSave = async () => {
    if (!shop || !lineUid || cart.length === 0) return
    setSaving(true)
    const sb = createSupabaseClient(jwt ?? undefined)

    let slipUrl: string | null = null
    if (slipFile) {
      const ext = slipFile.name.split('.').pop()
      const path = `${shop.id}/slips/${Date.now()}.${ext}`
      const { data: uploadData } = await sb.storage.from('slips').upload(path, slipFile)
      if (uploadData) {
        const { data: urlData } = sb.storage.from('slips').getPublicUrl(path)
        slipUrl = urlData.publicUrl
      }
    }

    // Generate ref number
    const refNumber = `SO-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`

    const { data: sale, error: saleErr } = await sb.from('sales').insert({
      shop_id: shop.id,
      ref_number: refNumber,
      total_amount: total + vatAmount,
      vat_amount: vatAmount,
      slip_url: slipUrl,
      slip_type: slipType || null,
      note: note || null,
      created_by: lineUid,
    }).select().single()

    if (saleErr || !sale) { setSaving(false); return }

    await sb.from('sale_items').insert(
      cart.map((i) => ({
        shop_id: shop.id,
        sale_id: sale.id,
        product_id: i.product.id,
        quantity: i.quantity,
        unit_price: i.unit_price,
        total_price: i.quantity * i.unit_price,
      }))
    )

    router.push(`/shop/${shopId}/sales`)
  }

  const filtered = products.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    (p.sku?.toLowerCase().includes(search.toLowerCase()))
  )

  return (
    <div className="pb-32">
      <div className="bg-white px-4 pt-12 pb-4 border-b border-gray-100 sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()} className="text-gray-400 text-xl">←</button>
          <h1 className="text-lg font-bold">บันทึกการขาย</h1>
        </div>
      </div>

      <div className="px-4 pt-4 space-y-4">
        {/* Product search */}
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <p className="text-xs font-semibold text-gray-400 mb-3">เลือกสินค้า</p>
          <input
            className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm mb-3"
            placeholder="ค้นหาสินค้า..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {filtered.map((p) => (
              <button key={p.id} onClick={() => addToCart(p)}
                className="w-full flex items-center justify-between p-2.5 rounded-xl bg-gray-50 active:bg-green-50 transition-colors text-left">
                <div>
                  <p className="text-sm font-medium text-gray-900">{p.name}</p>
                  <p className="text-xs text-gray-400">สต็อก {p.stock} ชิ้น</p>
                </div>
                <p className="text-sm font-bold text-[#06C755]">{formatMoneyFull(p.sell_price)}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Cart */}
        {cart.length > 0 && (
          <div className="bg-white rounded-2xl p-4 shadow-sm">
            <p className="text-xs font-semibold text-gray-400 mb-3">รายการสั่งซื้อ</p>
            <div className="space-y-4">
              {cart.map((item) => (
                <div key={item.product.id}>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-medium text-gray-900">{item.product.name}</p>
                    <button onClick={() => removeFromCart(item.product.id)} className="text-red-400 text-lg px-1">×</button>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-2 bg-gray-50 rounded-xl px-3 py-2 flex-1">
                      <button onClick={() => updateQty(item.product.id, item.quantity - 1)} className="text-gray-400 w-6 text-center">−</button>
                      <span className="flex-1 text-center text-sm font-semibold">{item.quantity}</span>
                      <button onClick={() => updateQty(item.product.id, item.quantity + 1)} className="text-gray-400 w-6 text-center">+</button>
                    </div>
                    <div className="flex items-center gap-1 bg-gray-50 rounded-xl px-3 py-2 flex-1">
                      <span className="text-xs text-gray-400">฿</span>
                      <input
                        className="flex-1 text-sm bg-transparent focus:outline-none w-0 font-semibold"
                        type="number" inputMode="decimal"
                        value={item.unit_price}
                        onChange={(e) => updatePrice(item.product.id, parseFloat(e.target.value) || 0)}
                      />
                    </div>
                  </div>
                  <p className="text-xs text-right text-gray-400 mt-1">รวม {formatMoneyFull(item.quantity * item.unit_price)}</p>
                </div>
              ))}
            </div>
            <div className="border-t border-gray-100 mt-3 pt-3">
              {vatAmount > 0 && (
                <div className="flex justify-between text-sm text-gray-400 mb-1">
                  <span>VAT {shop?.vat_rate}%</span>
                  <span>{formatMoneyFull(vatAmount)}</span>
                </div>
              )}
              <div className="flex justify-between text-base font-bold">
                <span>รวมทั้งหมด</span>
                <span className="text-[#06C755]">{formatMoneyFull(total + vatAmount)}</span>
              </div>
            </div>
          </div>
        )}

        {/* Slip */}
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <p className="text-xs font-semibold text-gray-400 mb-3">การชำระเงิน</p>
          <div className="flex gap-2 mb-3">
            {(['transfer', 'cash'] as const).map((type) => (
              <button key={type}
                onClick={() => setSlipType(type)}
                className={`flex-1 py-2.5 rounded-xl text-sm font-medium border transition-colors ${
                  slipType === type
                    ? 'bg-[#06C755] text-white border-[#06C755]'
                    : 'bg-gray-50 text-gray-600 border-gray-200'
                }`}>
                {type === 'transfer' ? '💳 โอนเงิน' : '💵 เงินสด'}
              </button>
            ))}
          </div>
          {slipType === 'transfer' && (
            <label className="flex flex-col items-center justify-center border-2 border-dashed border-gray-200 rounded-xl h-24 cursor-pointer text-gray-400 text-sm gap-1">
              <span className="text-2xl">{slipFile ? '✅' : '📷'}</span>
              <span>{slipFile ? slipFile.name : 'อัปโหลดสลิป'}</span>
              <input type="file" accept="image/*" className="hidden" onChange={(e) => setSlipFile(e.target.files?.[0] ?? null)} />
            </label>
          )}
        </div>

        {/* Note */}
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <p className="text-xs font-semibold text-gray-400 mb-2">หมายเหตุ</p>
          <textarea
            className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm resize-none"
            rows={2}
            placeholder="หมายเหตุเพิ่มเติม (ถ้ามี)"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </div>
      </div>

      {/* Fixed save button */}
      <div className="fixed bottom-0 left-0 right-0 max-w-[430px] mx-auto p-4 bg-white border-t border-gray-100">
        <button
          onClick={handleSave}
          disabled={cart.length === 0 || saving}
          className="w-full bg-[#06C755] disabled:bg-gray-200 text-white disabled:text-gray-400 font-bold py-4 rounded-2xl text-base transition-colors">
          {saving ? 'กำลังบันทึก...' : `บันทึกขาย ${cart.length > 0 ? formatMoneyFull(total + vatAmount) : ''}`}
        </button>
      </div>
    </div>
  )
}
