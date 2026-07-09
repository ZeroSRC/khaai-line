'use client'

import { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useShopStore } from '@/store/shopStore'
import { createSupabaseClient } from '@/lib/supabase'

export default function NewProductPage() {
  const { shopId } = useParams<{ shopId: string }>()
  const router = useRouter()
  const { shop, lineUid, jwt } = useShopStore()

  const [name, setName] = useState('')
  const [sku, setSku] = useState('')
  const [sellPrice, setSellPrice] = useState('')
  const [costPrice, setCostPrice] = useState('')
  const [stock, setStock] = useState('0')
  const [warrantyDays, setWarrantyDays] = useState('0')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const handleSave = async () => {
    if (!shop || !lineUid || !name.trim()) return
    setSaving(true)
    setError('')

    const { error: err } = await createSupabaseClient(jwt ?? undefined)
      .from('products')
      .insert({
        shop_id: shop.id,
        name: name.trim(),
        sku: sku.trim() || null,
        sell_price: parseFloat(sellPrice) || 0,
        cost_price: parseFloat(costPrice) || 0,
        stock: parseInt(stock) || 0,
        warranty_days: parseInt(warrantyDays) || 0,
        is_active: true,
      })

    if (err) {
      setError('บันทึกไม่สำเร็จ: ' + err.message)
      setSaving(false)
    } else {
      router.push(`/shop/${shopId}/products`)
    }
  }

  return (
    <div className="pb-32">
      <div className="bg-white px-4 pt-12 pb-4 border-b border-gray-100 sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()} className="text-gray-400 text-xl">←</button>
          <h1 className="text-lg font-bold">เพิ่มสินค้าใหม่</h1>
        </div>
      </div>

      <div className="px-4 pt-4 space-y-4">
        <div className="bg-white rounded-2xl p-4 shadow-sm space-y-3">
          <p className="text-xs font-semibold text-gray-400">ข้อมูลสินค้า</p>
          <div>
            <p className="text-xs text-gray-400 mb-1">ชื่อสินค้า <span className="text-red-400">*</span></p>
            <input
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#06C755]"
              placeholder="ชื่อสินค้า"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div>
            <p className="text-xs text-gray-400 mb-1">SKU / รหัสสินค้า</p>
            <input
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#06C755]"
              placeholder="เช่น SKU-001 (ถ้ามี)"
              value={sku}
              onChange={(e) => setSku(e.target.value)}
            />
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 shadow-sm space-y-3">
          <p className="text-xs font-semibold text-gray-400">ราคา</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-xs text-gray-400 mb-1">ราคาขาย (฿)</p>
              <input
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#06C755]"
                placeholder="0"
                type="number"
                inputMode="decimal"
                value={sellPrice}
                onChange={(e) => setSellPrice(e.target.value)}
              />
            </div>
            <div>
              <p className="text-xs text-gray-400 mb-1">ราคาทุน (฿)</p>
              <input
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#06C755]"
                placeholder="0"
                type="number"
                inputMode="decimal"
                value={costPrice}
                onChange={(e) => setCostPrice(e.target.value)}
              />
            </div>
          </div>
          {sellPrice && costPrice && (
            <p className="text-xs text-gray-400">
              กำไรต่อชิ้น:{' '}
              <span className={`font-semibold ${parseFloat(sellPrice) - parseFloat(costPrice) >= 0 ? 'text-[#06C755]' : 'text-red-500'}`}>
                ฿{(parseFloat(sellPrice) - parseFloat(costPrice)).toLocaleString('th')}
              </span>
            </p>
          )}
        </div>

        <div className="bg-white rounded-2xl p-4 shadow-sm space-y-3">
          <p className="text-xs font-semibold text-gray-400">สต็อก & ประกัน</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-xs text-gray-400 mb-1">จำนวนสต็อก</p>
              <input
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#06C755]"
                placeholder="0"
                type="number"
                inputMode="numeric"
                value={stock}
                onChange={(e) => setStock(e.target.value)}
              />
            </div>
            <div>
              <p className="text-xs text-gray-400 mb-1">ประกัน (วัน)</p>
              <input
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#06C755]"
                placeholder="0"
                type="number"
                inputMode="numeric"
                value={warrantyDays}
                onChange={(e) => setWarrantyDays(e.target.value)}
              />
            </div>
          </div>
        </div>

        {error && <p className="text-sm text-red-500 text-center">{error}</p>}
      </div>

      <div className="fixed bottom-0 left-0 right-0 max-w-[430px] mx-auto p-4 bg-white border-t border-gray-100">
        <button
          onClick={handleSave}
          disabled={!name.trim() || saving}
          className="w-full bg-[#06C755] disabled:bg-gray-200 text-white disabled:text-gray-400 font-bold py-4 rounded-2xl text-base transition-colors">
          {saving ? 'กำลังบันทึก...' : 'เพิ่มสินค้า'}
        </button>
      </div>
    </div>
  )
}
