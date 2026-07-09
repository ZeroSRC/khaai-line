'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useShopStore } from '@/store/shopStore'
import { createSupabaseClient } from '@/lib/supabase'
import { formatDateTime } from '@/lib/format'
import type { Shipment } from '@/lib/types'

const STATUS_MAP = {
  pending:   { label: 'รอส่ง',     color: 'bg-amber-100 text-amber-700',  dot: 'bg-amber-400' },
  shipped:   { label: 'กำลังส่ง',  color: 'bg-blue-100 text-blue-700',    dot: 'bg-blue-400' },
  delivered: { label: 'ถึงแล้ว',   color: 'bg-green-100 text-green-700',  dot: 'bg-green-400' },
}

export default function ShipmentDetailPage() {
  const { id } = useParams<{ shopId: string; id: string }>()
  const router = useRouter()
  const { shop, lineUid, jwt } = useShopStore()
  const [shipment, setShipment] = useState<Shipment | null>(null)
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)

  useEffect(() => {
    if (!shop || !lineUid) return
    createSupabaseClient(jwt ?? undefined)
      .from('shipments').select('*').eq('id', id).single()
      .then(({ data }) => {
        if (data) setShipment(data as Shipment)
        setLoading(false)
      })
  }, [shop, lineUid, id])

  const updateStatus = async (status: 'shipped' | 'delivered') => {
    if (!lineUid || !shipment) return
    setUpdating(true)
    const now = new Date().toISOString()
    const patch: Partial<Shipment> = { status }
    if (status === 'shipped') patch.shipped_at = now
    if (status === 'delivered') patch.delivered_at = now

    const { data } = await createSupabaseClient(jwt ?? undefined)
      .from('shipments').update(patch).eq('id', id).select().single()
    if (data) setShipment(data as Shipment)
    setUpdating(false)
  }

  if (loading) return (
    <div className="flex items-center justify-center min-h-dvh">
      <div className="w-8 h-8 rounded-lg bg-[#06C755] animate-pulse" />
    </div>
  )

  if (!shipment) return (
    <div className="flex flex-col items-center justify-center min-h-dvh gap-3 p-8 text-center">
      <p className="font-semibold">ไม่พบพัสดุนี้</p>
      <button onClick={() => router.back()} className="text-[#06C755] text-sm">← กลับ</button>
    </div>
  )

  const statusInfo = STATUS_MAP[shipment.status]

  return (
    <div className="pb-8">
      <div className="bg-white px-4 pt-12 pb-4 border-b border-gray-100 sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()} className="text-gray-400 text-xl">←</button>
          <div className="flex-1">
            <h1 className="text-lg font-bold">รายละเอียดพัสดุ</h1>
            <p className="text-xs text-gray-400">{shipment.tracking_number ?? 'ยังไม่มีเลขพัสดุ'}</p>
          </div>
          <span className={`text-xs px-3 py-1 rounded-full font-medium ${statusInfo.color}`}>
            {statusInfo.label}
          </span>
        </div>
      </div>

      <div className="px-4 pt-4 space-y-4">
        {/* Main info */}
        <div className="bg-white rounded-2xl p-5 shadow-sm space-y-4">
          {shipment.tracking_number && (
            <div>
              <p className="text-xs text-gray-400 mb-1">เลขพัสดุ</p>
              <p className="text-xl font-bold text-gray-900 tracking-wider">{shipment.tracking_number}</p>
            </div>
          )}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-gray-400 mb-1">ขนส่ง</p>
              <p className="text-sm font-semibold text-gray-800">{shipment.carrier ?? 'ไม่ระบุ'}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400 mb-1">ค่าส่ง</p>
              <p className="text-sm font-semibold text-gray-800">฿{shipment.shipping_cost.toLocaleString('th')}</p>
            </div>
          </div>
        </div>

        {/* Timeline */}
        <div className="bg-white rounded-2xl p-5 shadow-sm">
          <p className="text-xs font-semibold text-gray-400 mb-4">ประวัติสถานะ</p>
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-2 h-2 rounded-full bg-gray-400 mt-1.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-gray-700">สร้างรายการ</p>
                <p className="text-xs text-gray-400">{formatDateTime(shipment.created_at)}</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${shipment.shipped_at ? 'bg-blue-400' : 'bg-gray-200'}`} />
              <div>
                <p className={`text-sm font-medium ${shipment.shipped_at ? 'text-gray-700' : 'text-gray-300'}`}>ส่งพัสดุแล้ว</p>
                {shipment.shipped_at
                  ? <p className="text-xs text-gray-400">{formatDateTime(shipment.shipped_at)}</p>
                  : <p className="text-xs text-gray-300">รอดำเนินการ</p>
                }
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${shipment.delivered_at ? 'bg-green-400' : 'bg-gray-200'}`} />
              <div>
                <p className={`text-sm font-medium ${shipment.delivered_at ? 'text-gray-700' : 'text-gray-300'}`}>ถึงปลายทาง</p>
                {shipment.delivered_at
                  ? <p className="text-xs text-gray-400">{formatDateTime(shipment.delivered_at)}</p>
                  : <p className="text-xs text-gray-300">รอดำเนินการ</p>
                }
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        {shipment.status === 'pending' && (
          <button
            onClick={() => updateStatus('shipped')}
            disabled={updating}
            className="w-full py-3.5 rounded-2xl bg-blue-500 text-white text-sm font-semibold disabled:opacity-50">
            {updating ? 'กำลังอัปเดต...' : '🚚 อัปเดตเป็น กำลังส่ง'}
          </button>
        )}
        {shipment.status === 'shipped' && (
          <button
            onClick={() => updateStatus('delivered')}
            disabled={updating}
            className="w-full py-3.5 rounded-2xl bg-[#06C755] text-white text-sm font-semibold disabled:opacity-50">
            {updating ? 'กำลังอัปเดต...' : '✅ ยืนยันถึงแล้ว (เริ่มนับประกัน)'}
          </button>
        )}
      </div>
    </div>
  )
}
