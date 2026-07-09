'use client'

import { useParams } from 'next/navigation'
import { useShopInit } from '@/hooks/useShop'
import { BottomNav } from '@/components/BottomNav'

export default function ShopLayout({ children }: { children: React.ReactNode }) {
  const { shopId } = useParams<{ shopId: string }>()
  const { loading, error } = useShopInit(shopId)

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-dvh gap-4 bg-white">
        <img
          src="/mascot.png"
          alt="Khaai"
          className="w-28 h-28 object-contain animate-pulse"
        />
        <p className="text-base font-bold text-gray-700">ขาย</p>
        <p className="text-xs text-gray-400 -mt-2">กำลังโหลด...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-dvh gap-3 p-8 text-center">
        <div className="text-4xl">⚠️</div>
        <p className="font-semibold">{error}</p>
        <p className="text-sm text-gray-400">กรุณาติดต่อเจ้าของร้านเพื่อขอสิทธิ์</p>
      </div>
    )
  }

  return (
    <div className="min-h-dvh pb-24 relative">
      {children}
      <BottomNav shopId={shopId} />
    </div>
  )
}
