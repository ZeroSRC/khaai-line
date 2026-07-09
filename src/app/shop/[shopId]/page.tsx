'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { useShopStore } from '@/store/shopStore'
import { createSupabaseClient } from '@/lib/supabase'
import { formatMoneyFull } from '@/lib/format'
import dayjs from 'dayjs'

interface DashboardStats {
  today_sales: number; today_orders: number; month_sales: number
  month_expenses: number; low_stock: number; pending_shipments: number
}

export default function DashboardPage() {
  const { shopId } = useParams<{ shopId: string }>()
  const router = useRouter()
  const { shop, lineDisplayName, linePictureUrl, lineUid, jwt, clear } = useShopStore()
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [showProfile, setShowProfile] = useState(false)

  useEffect(() => {
    if (!shop || !lineUid) return
    const sb = createSupabaseClient(jwt ?? undefined)
    const today = dayjs().format('YYYY-MM-DD')
    const monthStart = dayjs().startOf('month').toISOString()
    Promise.all([
      sb.from('sales').select('total_amount').eq('shop_id', shop.id).gte('created_at', today),
      sb.from('sales').select('total_amount').eq('shop_id', shop.id).gte('created_at', monthStart),
      sb.from('expenses').select('amount').eq('shop_id', shop.id).gte('expense_date', dayjs().startOf('month').format('YYYY-MM-DD')),
      sb.from('products').select('id').eq('shop_id', shop.id).lt('stock', 3).eq('is_active', true),
      sb.from('shipments').select('id').eq('shop_id', shop.id).eq('status', 'shipped'),
    ]).then(([t, m, e, l, s]) => setStats({
      today_sales: (t.data ?? []).reduce((a, r) => a + Number(r.total_amount), 0),
      today_orders: t.data?.length ?? 0,
      month_sales: (m.data ?? []).reduce((a, r) => a + Number(r.total_amount), 0),
      month_expenses: (e.data ?? []).reduce((a, r) => a + Number(r.amount), 0),
      low_stock: l.data?.length ?? 0,
      pending_shipments: s.data?.length ?? 0,
    }))
  }, [shop, lineUid])

  if (!shop) return null
  const base = `/shop/${shopId}`

  return (
    <div>
      {/* Profile sheet */}
      {showProfile && (
        <>
          <div className="fixed inset-0 bg-black/30 z-40 backdrop-blur-sm" onClick={() => setShowProfile(false)} />
          <div className="fixed bottom-0 left-0 right-0 max-w-[430px] mx-auto z-50 bg-white rounded-t-[32px] p-6 pb-10">
            <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-6" />
            <div className="flex flex-col items-center gap-3 mb-6">
              {linePictureUrl
                ? <img src={linePictureUrl} className="w-16 h-16 rounded-full ring-4 ring-gray-100" alt="" />
                : <div className="w-16 h-16 rounded-full bg-[#06C755]/15 flex items-center justify-center text-2xl font-bold text-[#06C755]">{lineDisplayName?.[0] ?? '?'}</div>
              }
              <div className="text-center">
                <p className="font-bold text-gray-900">{lineDisplayName}</p>
                <p className="text-xs text-gray-400 mt-0.5">{lineUid}</p>
              </div>
            </div>
            <button onClick={() => { localStorage.removeItem('khaai_last_shop'); clear(); router.push('/') }}
              className="w-full flex items-center gap-3 bg-gray-50 rounded-2xl px-4 py-3.5 active:bg-gray-100 transition-colors">
              <div className="w-9 h-9 rounded-xl bg-white shadow-sm flex items-center justify-center">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 1l4 4-4 4"/><path d="M3 11V9a4 4 0 014-4h14M7 23l-4-4 4-4"/><path d="M21 13v2a4 4 0 01-4 4H3"/></svg>
              </div>
              <div className="text-left">
                <p className="text-sm font-semibold text-gray-900">เปลี่ยนร้านค้า</p>
                <p className="text-xs text-gray-400">กลับหน้าเลือกร้าน</p>
              </div>
            </button>
          </div>
        </>
      )}

      {/* Green header */}
      <div className="bg-[#06C755] px-4 pt-12 pb-10">
        <div className="flex items-center gap-3 mb-5">
          <button onClick={() => setShowProfile(true)} className="active:scale-95 transition-transform">
            {linePictureUrl
              ? <img src={linePictureUrl} className="w-10 h-10 rounded-full ring-2 ring-white/40" alt="" />
              : <div className="w-10 h-10 rounded-full bg-white/25 flex items-center justify-center text-white font-bold text-sm">{lineDisplayName?.[0] ?? '?'}</div>
            }
          </button>
          <div className="flex-1">
            <p className="text-white/60 text-[11px]">สวัสดี,</p>
            <p className="text-white font-bold text-sm leading-tight">{lineDisplayName}</p>
          </div>
          <Link href={`${base}/settings/members`}
            className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center active:bg-white/30 transition-colors">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/>
            </svg>
          </Link>
        </div>
        <h1 className="text-white text-2xl font-bold leading-tight">{shop.name}</h1>
        <p className="text-white/50 text-xs mt-0.5">{dayjs().format('dddd D MMMM YYYY')}</p>
      </div>

      <div className="px-4 -mt-6 space-y-3 pb-4">
        {/* Today card — float over header */}
        <div className="bg-white rounded-3xl p-5 shadow-[0_8px_32px_rgba(0,0,0,0.12)]">
          <p className="text-xs text-gray-400 font-medium mb-1">ยอดขายวันนี้</p>
          <p className="text-3xl font-bold text-gray-900 tracking-tight">{stats ? formatMoneyFull(stats.today_sales) : '—'}</p>
          <p className="text-xs text-gray-400 mt-1.5">{stats?.today_orders ?? 0} ออเดอร์วันนี้</p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white rounded-3xl p-4 shadow-[0_2px_12px_rgba(0,0,0,0.07)]">
            <p className="text-[10px] text-gray-400 font-medium mb-1.5">ยอดขายเดือนนี้</p>
            <p className="text-sm font-bold text-[#06C755]">{stats ? formatMoneyFull(stats.month_sales) : '—'}</p>
          </div>
          <div className="bg-white rounded-3xl p-4 shadow-[0_2px_12px_rgba(0,0,0,0.07)]">
            <p className="text-[10px] text-gray-400 font-medium mb-1.5">ค่าใช้จ่าย</p>
            <p className="text-sm font-bold text-red-500">{stats ? formatMoneyFull(stats.month_expenses) : '—'}</p>
          </div>
        </div>

        {/* Alerts */}
        {(stats?.low_stock ?? 0) > 0 && (
          <Link href={`${base}/products?filter=low_stock`}
            className="flex items-center gap-3 bg-amber-50 rounded-3xl p-4 active:bg-amber-100 transition-colors">
            <div className="w-10 h-10 rounded-2xl bg-amber-100 flex items-center justify-center flex-shrink-0">
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-amber-800">สต็อกใกล้หมด</p>
              <p className="text-xs text-amber-500 mt-0.5">{stats?.low_stock} รายการต่ำกว่า 3 ชิ้น</p>
            </div>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
          </Link>
        )}
        {(stats?.pending_shipments ?? 0) > 0 && (
          <Link href={`${base}/shipments`}
            className="flex items-center gap-3 bg-blue-50 rounded-3xl p-4 active:bg-blue-100 transition-colors">
            <div className="w-10 h-10 rounded-2xl bg-blue-100 flex items-center justify-center flex-shrink-0">
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 3h15v13H1zM16 8h4l3 3v5h-7V8z"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-blue-800">รอการส่งพัสดุ</p>
              <p className="text-xs text-blue-400 mt-0.5">{stats?.pending_shipments} ออเดอร์รอยืนยัน</p>
            </div>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
          </Link>
        )}

        {/* Quick actions */}
        <p className="text-xs font-bold text-gray-300 tracking-widest uppercase pt-1">เมนูด่วน</p>
        <div className="grid grid-cols-4 gap-2">
          {[
            { color: 'bg-[#06C755]/10 text-[#06C755]', label: 'บันทึกขาย', href: `${base}/sales/new`, icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20M6 15h4M14 15h4"/></svg> },
            { color: 'bg-blue-50 text-blue-500', label: 'บันทึกซื้อ', href: `${base}/purchases/new`, icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 002 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg> },
            { color: 'bg-orange-50 text-orange-500', label: 'ส่งพัสดุ', href: `${base}/shipments/new`, icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M1 3h15v13H1zM16 8h4l3 3v5h-7V8z"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg> },
            { color: 'bg-red-50 text-red-500', label: 'ค่าใช้จ่าย', href: `${base}/expenses/new`, icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg> },
          ].map((item) => (
            <Link key={item.href} href={item.href}
              className="bg-white rounded-3xl p-3 flex flex-col items-center gap-2 shadow-[0_2px_12px_rgba(0,0,0,0.07)] active:scale-95 transition-transform">
              <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${item.color}`}>{item.icon}</div>
              <span className="text-[10px] font-semibold text-gray-500 text-center leading-tight">{item.label}</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
