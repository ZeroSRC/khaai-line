'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useShopStore } from '@/store/shopStore'
import { createSupabaseClient } from '@/lib/supabase'
import type { Product } from '@/lib/types'

export default function EditProductPage() {
  const { shopId, productId } = useParams<{ shopId: string; productId: string }>()
  const router = useRouter()
  const { shop, lineUid, jwt } = useShopStore()

  const [name, setName] = useState('')
  const [sku, setSku] = useState('')
  const [sellPrice, setSellPrice] = useState('')
  const [costPrice, setCostPrice] = useState('')
  const [stock, setStock] = useState('0')
  const [warrantyDays, setWarrantyDays] = useState('0')
  const [isActive, setIsActive] = useState(true)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!shop || !lineUid) return
    createSupabaseClient(jwt ?? undefined)
      .from('products')
      .select('*')
      .eq('id', productId)
      .single()
      .then(({ data }) => {
        if (!data) return
        const p = data as Product
        setName(p.name)
        setSku(p.sku ?? '')
        setSellPrice(String(p.sell_price))
        setCostPrice(String(p.cost_price))
        setStock(String(p.stock))
        setWarrantyDays(String(p.warranty_days))
        setIsActive(p.is_active)
        setLoading(false)
      })
  }, [shop, lineUid, productId])

  const handleSave = async () => {
    if (!shop || !lineUid || !name.trim()) return
    setSaving(true)
    setError('')

    const { error: err } = await createSupabaseClient(jwt ?? undefined)
      .from('products')
      .update({
        name: name.trim(),
        sku: sku.trim() || null,
        sell_price: parseFloat(sellPrice) || 0,
        cost_price: parseFloat(costPrice) || 0,
        stock: parseInt(stock) || 0,
        warranty_days: parseInt(warrantyDays) || 0,
        is_active: isActive,
      })
      .eq('id', productId)

    if (err) {
      setError('บันทึกไม่สำเร็จ: ' + err.message)
      setSaving(false)
    } else {
      router.push(`/shop/${shopId}/products`)
    }
  }

  const handleDelete = async () => {
    if (!shop || !lineUid) return
    if (!confirm('ลบสินค้านี้?')) return
    await createSupabaseClient(jwt ?? undefined).from('products').delete().eq('id', productId)
    router.push(`/shop/${shopId}/products`)
  }

  if (loading) return (
    <div className="flex items-center justify-center min-h-dvh">
      <div className="w-8 h-8 rounded-lg bg-[#06C755] animate-pulse" />
    </div>
  )

  return (
    <div className="pb-32">
      <div className="bg-white px-4 pt-12 pb-4 border-b border-gray-100 sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()} className="text-gray-400 text-xl">←</button>
          <h1 className="text-lg font-bold flex-1">แก้ไขสินค้า</h1>
          <button onClick={handleDelete} className="text-red-400 text-sm font-medium">ลบ</button>
        </div>
      </div>

      <div className="px-4 pt-4 space-y-4">
        <div className="bg-white rounded-2xl p-4 shadow-sm space-y-3">
          <p className="text-xs font-semibold text-gray-400">ข้อมูลสินค้า</p>
          <div>
            <p className="text-xs text-gray-400 mb-1">ชื่อสินค้า <span className="text-red-400">*</span></p>
            <input
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#06C755]"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div>
            <p className="text-xs text-gray-400 mb-1">SKU / รหัสสินค้า</p>
            <input
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#06C755]"
              placeholder="เช่น SKU-001"
              value={sku}
              onChange={(e) => setSku(e.target.value)}
            />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-700">แสดงสินค้า</span>
            <button
              onClick={() => setIsActive(!isActive)}
              className={`w-12 h-6 rounded-full transition-colors ${isActive ? 'bg-[#06C755]' : 'bg-gray-200'}`}>
              <span className={`block w-5 h-5 bg-white rounded-full shadow transition-transform mx-0.5 ${isActive ? 'translate-x-6' : 'translate-x-0'}`} />
            </button>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 shadow-sm space-y-3">
          <p className="text-xs font-semibold text-gray-400">ราคา</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-xs text-gray-400 mb-1">ราคาขาย (฿)</p>
              <input
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#06C755]"
                type="number" inputMode="decimal"
                value={sellPrice}
                onChange={(e) => setSellPrice(e.target.value)}
              />
            </div>
            <div>
              <p className="text-xs text-gray-400 mb-1">ราคาทุน (฿)</p>
              <input
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#06C755]"
                type="number" inputMode="decimal"
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
                type="number" inputMode="numeric"
                value={stock}
                onChange={(e) => setStock(e.target.value)}
              />
            </div>
            <div>
              <p className="text-xs text-gray-400 mb-1">ประกัน (วัน)</p>
              <input
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#06C755]"
                type="number" inputMode="numeric"
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
          {saving ? 'กำลังบันทึก...' : 'บันทึกการแก้ไข'}
        </button>
      </div>
    </div>
  )
}
