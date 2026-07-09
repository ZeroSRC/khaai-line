'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'

import { useShopStore } from '@/store/shopStore'
import { createSupabaseClient } from '@/lib/supabase'
import { formatDateTime } from '@/lib/format'
import type { Shipment } from '@/lib/types'

const STATUS_MAP = {
  pending:   { label: 'รอส่ง',    color: 'bg-amber-100 text-amber-700' },
  shipped:   { label: 'กำลังส่ง', color: 'bg-blue-100 text-blue-700' },
  delivered: { label: 'ถึงแล้ว',  color: 'bg-green-100 text-green-700' },
}

export default function ShipmentsPage() {
  const { shopId } = useParams<{ shopId: string }>()
  const { shop, lineUid, jwt } = useShopStore()
  const [shipments, setShipments] = useState<Shipment[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [syncing, setSyncing] = useState(false)
  const [syncResult, setSyncResult] = useState<string | null>(null)

  useEffect(() => {
    if (!shop || !lineUid) return
    createSupabaseClient(jwt ?? undefined)
      .from('shipments')
      .select('*')
      .eq('shop_id', shop.id)
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        setShipments((data ?? []) as Shipment[])
        setLoading(false)
      })
  }, [shop, lineUid])

  const filtered = statusFilter === 'all' ? shipments : shipments.filter((s) => s.status === statusFilter)

  const markDelivered = async (id: string) => {
    if (!lineUid) return
    const sb = createSupabaseClient(jwt ?? undefined)
    const now = new Date().toISOString()
    await sb.from('shipments').update({ status: 'delivered', delivered_at: now }).eq('id', id)
    setShipments((prev) => prev.map((s) => s.id === id ? { ...s, status: 'delivered', delivered_at: now } : s))
  }

  // อัพเดตสถานะ Flash Express ทีเดียวทุกพัสดุที่ยังไม่ถึง
  const syncFlash = async () => {
    if (!lineUid || syncing) return
    setSyncing(true)
    setSyncResult(null)

    // เฉพาะ Flash ที่ยังไม่ delivered และมีเลข tracking
    const pending = shipments.filter(
      (s) => s.status !== 'delivered' &&
             s.tracking_number &&
             (!s.carrier || s.carrier.toLowerCase().includes('flash'))
    )

    if (pending.length === 0) {
      setSyncResult('ไม่มีพัสดุ Flash ที่รอติดตาม')
      setSyncing(false)
      return
    }

    try {
      const res = await fetch('/api/flash-track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ trackingNumbers: pending.map((s) => s.tracking_number!) }),
      })
      const { results } = await res.json()

      const sb = createSupabaseClient(jwt ?? undefined)
      const now = new Date().toISOString()
      let updated = 0

      for (const s of pending) {
        if (results[s.tracking_number!]?.delivered) {
          await sb.from('shipments').update({ status: 'delivered', delivered_at: now }).eq('id', s.id)
          updated++
        }
      }

      // รีโหลด local state
      if (updated > 0) {
        setShipments((prev) =>
          prev.map((s) => {
            if (pending.find((p) => p.id === s.id) && results[s.tracking_number!]?.delivered) {
              return { ...s, status: 'delivered', delivered_at: now }
            }
            return s
          })
        )
      }

      setSyncResult(
        updated > 0
          ? `อัพเดตแล้ว ${updated} พัสดุ 🎉`
          : `ตรวจ ${pending.length} พัสดุ — ยังไม่ถึงปลายทาง`
      )
    } catch {
      setSyncResult('เชื่อมต่อ Flash ไม่ได้ ลองใหม่อีกครั้ง')
    } finally {
      setSyncing(false)
      setTimeout(() => setSyncResult(null), 4000)
    }
  }

  // นับพัสดุ Flash ที่ยังรอ
  const pendingFlashCount = shipments.filter(
    (s) => s.status !== 'delivered' &&
           s.tracking_number &&
           (!s.carrier || s.carrier.toLowerCase().includes('flash'))
  ).length

  return (
    <div>
      <div className="bg-white px-4 pt-12 pb-3 border-b border-gray-100 sticky top-0 z-10">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-lg font-bold">พัสดุ</h1>
          <div className="flex items-center gap-2">
            {/* ปุ่ม sync Flash — disabled ถ้าไม่มีพัสดุ Flash รอ */}
            <button
              onClick={syncFlash}
              disabled={syncing || pendingFlashCount === 0}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition-colors disabled:opacity-40 disabled:cursor-not-allowed bg-orange-50 text-orange-600 border-orange-200 active:bg-orange-100">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                className={syncing ? 'animate-spin' : ''}>
                <path d="M21 12a9 9 0 11-6.219-8.56"/><path d="M21 3v9h-9"/>
              </svg>
              {syncing ? 'กำลังเช็ค...' : `Flash${pendingFlashCount > 0 ? ` (${pendingFlashCount})` : ''}`}
            </button>
            <Link href={`/shop/${shopId}/shipments/new`}
              className="bg-[#06C755] text-white text-sm font-semibold px-4 py-2 rounded-xl">
              + เพิ่ม
            </Link>
          </div>
        </div>

        {/* ผลลัพธ์ sync */}
        {syncResult && (
          <div className="mb-2 px-3 py-2 rounded-xl bg-blue-50 text-blue-700 text-xs font-medium text-center">
            {syncResult}
          </div>
        )}

        <div className="flex gap-2 overflow-x-auto no-scrollbar">
          {([['all', 'ทั้งหมด'], ['pending', 'รอส่ง'], ['shipped', 'กำลังส่ง'], ['delivered', 'ถึงแล้ว']] as const).map(([key, label]) => (
            <button key={key} onClick={() => setStatusFilter(key)}
              className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap border transition-colors ${
                statusFilter === key ? 'bg-[#06C755] text-white border-[#06C755]' : 'bg-white text-gray-500 border-gray-200'
              }`}>
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="px-4 pt-3 space-y-3 pb-6">
        {loading && [1,2,3].map(i => <div key={i} className="h-24 bg-gray-100 rounded-2xl animate-pulse" />)}

        {!loading && filtered.length === 0 && (
          <div className="text-center py-16 text-gray-400">
            <div className="text-4xl mb-3">🚚</div>
            <p className="font-medium">ไม่มีพัสดุ</p>
          </div>
        )}

        {filtered.map((s) => {
          const statusInfo = STATUS_MAP[s.status as keyof typeof STATUS_MAP]
          const isFlash = !s.carrier || s.carrier.toLowerCase().includes('flash')
          return (
            <Link key={s.id} href={`/shop/${shopId}/shipments/${s.id}`} className="block bg-white rounded-2xl p-4 shadow-sm border border-gray-50 active:bg-gray-50">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold">{s.tracking_number ?? 'ยังไม่ใส่เลขพัสดุ'}</span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${statusInfo.color}`}>{statusInfo.label}</span>
                    {isFlash && s.status !== 'delivered' && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full font-medium bg-orange-100 text-orange-600">Flash</span>
                    )}
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5">{s.carrier ?? 'Flash Express'} · ค่าส่ง ฿{s.shipping_cost}</p>
                  <p className="text-xs text-gray-300">{formatDateTime(s.created_at)}</p>
                </div>
              </div>
              {s.status === 'shipped' && (
                <button onClick={(e) => { e.preventDefault(); markDelivered(s.id) }}
                  className="w-full py-2 rounded-xl bg-green-50 text-green-700 text-xs font-semibold border border-green-200 mt-2">
                  ✅ ยืนยันถึงแล้ว (เริ่มนับประกัน)
                </button>
              )}
            </Link>
          )
        })}
      </div>
    </div>
  )
}
