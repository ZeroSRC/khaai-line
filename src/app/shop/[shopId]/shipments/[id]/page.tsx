'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useShopStore } from '@/store/shopStore'
import { createSupabaseClient } from '@/lib/supabase'
import { formatDateTime } from '@/lib/format'
import type { Shipment } from '@/lib/types'

const STATUS_MAP = {
  pending:   { label: 'รอส่ง',    color: 'bg-amber-50 text-amber-700',  dot: 'bg-amber-400' },
  shipped:   { label: 'กำลังส่ง', color: 'bg-blue-50 text-blue-700',    dot: 'bg-blue-400' },
  delivered: { label: 'ถึงแล้ว',  color: 'bg-green-50 text-green-700',  dot: 'bg-green-400' },
}

const BackBtn = ({ onClick }: { onClick: () => void }) => (
  <button onClick={onClick} className="w-9 h-9 rounded-2xl bg-gray-50 flex items-center justify-center text-gray-500 active:bg-gray-100 transition-colors">
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
  </button>
)

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
      .then(({ data }) => { if (data) setShipment(data as Shipment); setLoading(false) })
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

  if (loading) return <div className="flex items-center justify-center min-h-dvh"><div className="w-8 h-8 rounded-2xl bg-[#1877F2] animate-pulse" /></div>
  if (!shipment) return <div className="flex flex-col items-center justify-center min-h-dvh gap-3 p-8 text-center"><p className="font-semibold text-gray-800">ไม่พบพัสดุนี้</p><button onClick={() => router.back()} className="text-sm text-[#1877F2]">← กลับ</button></div>

  const statusInfo = STATUS_MAP[shipment.status as keyof typeof STATUS_MAP] ?? STATUS_MAP.pending

  return (
    <div className="pb-10">
      <div className="px-4 pt-12 pb-4 flex items-center gap-3">
        <BackBtn onClick={() => router.back()} />
        <div className="flex-1">
          <h1 className="text-base font-bold text-gray-900">รายละเอียดพัสดุ</h1>
          <p className="text-[11px] text-gray-400">{shipment.tracking_number ?? 'ยังไม่มีเลขพัสดุ'}</p>
        </div>
        <span className={`text-[11px] px-3 py-1 rounded-full font-semibold ${statusInfo.color}`}>{statusInfo.label}</span>
      </div>

      <div className="px-4 space-y-3">
        {/* Hero */}
        <div className="bg-orange-500 rounded-3xl p-6 shadow-[0_8px_32px_rgba(249,115,22,0.25)]">
          {shipment.tracking_number && (
            <p className="text-2xl font-bold text-white tracking-wider mb-1">{shipment.tracking_number}</p>
          )}
          <div className="flex items-center gap-4 mt-3 pt-3 border-t border-white/20">
            <div className="flex-1">
              <p className="text-white/60 text-xs">{shipment.carrier ?? 'Flash Express'}</p>
              <p className="text-white font-bold text-sm mt-0.5">ค่าส่ง ฿{shipment.shipping_cost.toLocaleString('th')}</p>
            </div>
            <span className={`text-[11px] bg-white/20 text-white px-2.5 py-1 rounded-full font-medium`}>{statusInfo.label}</span>
          </div>
        </div>

        {/* Timeline */}
        <div className="bg-white rounded-3xl p-5 shadow-[0_2px_16px_rgba(0,0,0,0.07)]">
          <p className="text-xs font-bold text-gray-400 mb-4">ประวัติสถานะ</p>
          <div className="space-y-4">
            {[
              { label: 'สร้างรายการ', time: shipment.created_at, dot: 'bg-gray-400', active: true },
              { label: 'ส่งพัสดุแล้ว', time: shipment.shipped_at, dot: 'bg-blue-400', active: !!shipment.shipped_at },
              { label: 'ถึงปลายทาง', time: shipment.delivered_at, dot: 'bg-green-400', active: !!shipment.delivered_at },
            ].map((step) => (
              <div key={step.label} className="flex items-start gap-3">
                <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${step.active ? step.dot : 'bg-gray-200'}`} />
                <div>
                  <p className={`text-sm font-semibold ${step.active ? 'text-gray-800' : 'text-gray-300'}`}>{step.label}</p>
                  {step.time
                    ? <p className="text-xs text-gray-400">{formatDateTime(step.time)}</p>
                    : <p className="text-xs text-gray-300">รอดำเนินการ</p>
                  }
                </div>
              </div>
            ))}
          </div>
        </div>

        {(shipment as any).note && (
          <div className="bg-white rounded-3xl p-4 shadow-[0_2px_16px_rgba(0,0,0,0.07)]">
            <p className="text-xs font-bold text-gray-400 mb-1">หมายเหตุ</p>
            <p className="text-sm text-gray-700">{(shipment as any).note}</p>
          </div>
        )}

        {/* Actions */}
        {shipment.status === 'pending' && (
          <button onClick={() => updateStatus('shipped')} disabled={updating}
            className="w-full py-4 rounded-2xl bg-blue-500 text-white text-sm font-bold shadow-[0_4px_16px_rgba(59,130,246,0.35)] disabled:opacity-50 active:scale-[0.98] transition-all">
            {updating ? 'กำลังอัปเดต...' : 'อัปเดตเป็น กำลังส่ง'}
          </button>
        )}
        {shipment.status === 'shipped' && (
          <button onClick={() => updateStatus('delivered')} disabled={updating}
            className="w-full py-4 rounded-2xl bg-[#1877F2] text-white text-sm font-bold shadow-[0_4px_16px_rgba(24,119,242,0.35)] disabled:opacity-50 active:scale-[0.98] transition-all">
            {updating ? 'กำลังอัปเดต...' : 'ยืนยันถึงแล้ว (เริ่มนับประกัน)'}
          </button>
        )}
      </div>
    </div>
  )
}
