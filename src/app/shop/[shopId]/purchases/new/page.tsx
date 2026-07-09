'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useShopStore } from '@/store/shopStore'
import { createSupabaseClient } from '@/lib/supabase'
import type { Product } from '@/lib/types'

interface PurchaseItem {
  product: Product
  quantity: number
  cost_price: number
}

export default function NewPurchasePage() {
  const { shopId } = useParams<{ shopId: string }>()
  const router = useRouter()
  const { shop, lineUid } = useShopStore()

  const [products, setProducts] = useState<Product[]>([])
  const [cart, setCart] = useState<PurchaseItem[]>([])
  const [supplier, setSupplier] = useState('')
  const [note, setNote] = useState('')
  const [search, setSearch] = useState('')
  const [slipFile, setSlipFile] = useState<File | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!shop || !lineUid) return
    createSupabaseClient(lineUid)
      .from('products')
      .select('*')
      .eq('shop_id', shop.id)
      .eq('is_active', true)
      .order('name')
      .then(({ data }) => setProducts((data ?? []) as Product[]))
  }, [shop, lineUid])

  const addToCart = (product: Product) => {
    setCart((prev) => {
      const existing = prev.find((i) => i.product.id === product.id)
      if (existing) return prev.map((i) => i.product.id === product.id ? { ...i, quantity: i.quantity + 1 } : i)
      return [...prev, { product, quantity: 1, cost_price: product.cost_price }]
    })
  }

  const updateQty = (productId: string, qty: number) => {
    if (qty <= 0) {
      setCart((prev) => prev.filter((i) => i.product.id !== productId))
    } else {
      setCart((prev) => prev.map((i) => i.product.id === productId ? { ...i, quantity: qty } : i))
    }
  }

  const updateCost = (productId: string, cost: number) => {
    setCart((prev) => prev.map((i) => i.product.id === productId ? { ...i, cost_price: cost } : i))
  }

  const total = cart.reduce((s, i) => s + i.quantity * i.cost_price, 0)

  const handleSave = async () => {
    if (!shop || !lineUid || cart.length === 0) return
    setSaving(true)
    const sb = createSupabaseClient(lineUid)

    const refNumber = `PO-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`

    let slipUrl: string | null = null
    if (slipFile) {
      const ext = slipFile.name.split('.').pop()
      const path = `${shop.id}/purchase-slips/${Date.now()}.${ext}`
      const { data: uploadData } = await sb.storage.from('slips').upload(path, slipFile)
      if (uploadData) {
        const { data: urlData } = sb.storage.from('slips').getPublicUrl(path)
        slipUrl = urlData.publicUrl
      }
    }

    const { data: purchase, error } = await sb.from('purchases').insert({
      shop_id: shop.id,
      supplier: supplier.trim() || null,
      ref_number: refNumber,
      total_amount: total,
      slip_url: slipUrl,
      note: note.trim() || null,
    }).select().single()

    if (error || !purchase) { setSaving(false); return }

    // trigger trg_add_stock_on_purchase จัดการ stock + cost_price อัตโนมัติ
    await sb.from('purchase_items').insert(
      cart.map((i) => ({
        shop_id: shop.id,
        purchase_id: purchase.id,
        product_id: i.product.id,
        quantity: i.quantity,
        unit_cost: i.cost_price,
        total_cost: i.quantity * i.cost_price,
      }))
    )

    router.push(`/shop/${shopId}/purchases`)
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
          <h1 className="text-lg font-bold">บันทึกการซื้อ</h1>
        </div>
      </div>

      <div className="px-4 pt-4 space-y-4">
        {/* Supplier */}
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <p className="text-xs font-semibold text-gray-400 mb-2">ข้อมูลการซื้อ</p>
          <input
            className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#06C755]"
            placeholder="ชื่อ Supplier / แหล่งซื้อ (ถ้ามี)"
            value={supplier}
            onChange={(e) => setSupplier(e.target.value)}
          />
        </div>

        {/* Product picker */}
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <p className="text-xs font-semibold text-gray-400 mb-3">เลือกสินค้าที่ซื้อมา</p>
          <input
            className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm mb-3 focus:outline-none focus:border-[#06C755]"
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
                  <p className="text-xs text-gray-400">สต็อก {p.stock} ชิ้น · ทุน ฿{p.cost_price}</p>
                </div>
                <span className="text-[#06C755] text-xl font-light">+</span>
              </button>
            ))}
          </div>
        </div>

        {/* Cart */}
        {cart.length > 0 && (
          <div className="bg-white rounded-2xl p-4 shadow-sm">
            <p className="text-xs font-semibold text-gray-400 mb-3">รายการที่ซื้อ</p>
            <div className="space-y-3">
              {cart.map((item) => (
                <div key={item.product.id}>
                  <p className="text-sm font-medium text-gray-900 mb-2">{item.product.name}</p>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-2 bg-gray-50 rounded-xl px-3 py-2 flex-1">
                      <button onClick={() => updateQty(item.product.id, item.quantity - 1)} className="text-gray-400 w-6 text-center">−</button>
                      <span className="flex-1 text-center text-sm font-semibold">{item.quantity}</span>
                      <button onClick={() => updateQty(item.product.id, item.quantity + 1)} className="text-gray-400 w-6 text-center">+</button>
                    </div>
                    <div className="flex items-center gap-1 bg-gray-50 rounded-xl px-3 py-2 flex-1">
                      <span className="text-xs text-gray-400">฿</span>
                      <input
                        className="flex-1 text-sm bg-transparent focus:outline-none w-0"
                        type="number" inputMode="decimal"
                        value={item.cost_price}
                        onChange={(e) => updateCost(item.product.id, parseFloat(e.target.value) || 0)}
                      />
                    </div>
                    <button onClick={() => updateQty(item.product.id, 0)} className="text-red-400 text-lg px-1">×</button>
                  </div>
                </div>
              ))}
            </div>
            <div className="border-t border-gray-100 mt-3 pt-3 flex justify-between">
              <span className="text-sm font-semibold text-gray-700">รวมทั้งหมด</span>
              <span className="text-sm font-bold text-gray-900">฿{total.toLocaleString('th')}</span>
            </div>
          </div>
        )}

        {/* Slip */}
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <p className="text-xs font-semibold text-gray-400 mb-3">สลิปการโอนเงิน</p>
          <label className="flex flex-col items-center justify-center border-2 border-dashed border-gray-200 rounded-xl h-24 cursor-pointer text-gray-400 text-sm gap-1 active:bg-gray-50 transition-colors">
            <span className="text-2xl">{slipFile ? '✅' : '📷'}</span>
            <span>{slipFile ? slipFile.name : 'อัปโหลดสลิปโอนเงิน (ถ้ามี)'}</span>
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => setSlipFile(e.target.files?.[0] ?? null)}
            />
          </label>
          {slipFile && (
            <button
              onClick={() => setSlipFile(null)}
              className="mt-2 text-xs text-red-400 w-full text-center">
              ลบสลิป
            </button>
          )}
        </div>

        {/* Note */}
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <p className="text-xs font-semibold text-gray-400 mb-2">หมายเหตุ</p>
          <textarea
            className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm resize-none focus:outline-none focus:border-[#06C755]"
            rows={2}
            placeholder="หมายเหตุเพิ่มเติม"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 max-w-[430px] mx-auto p-4 bg-white border-t border-gray-100">
        <button
          onClick={handleSave}
          disabled={cart.length === 0 || saving}
          className="w-full bg-[#06C755] disabled:bg-gray-200 text-white disabled:text-gray-400 font-bold py-4 rounded-2xl text-base transition-colors">
          {saving ? 'กำลังบันทึก...' : `บันทึกการซื้อ${cart.length > 0 ? ` ฿${total.toLocaleString('th')}` : ''}`}
        </button>
      </div>
    </div>
  )
}
