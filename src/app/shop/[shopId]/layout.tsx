'use client'

import { useParams } from 'next/navigation'
import { useShopInit } from '@/hooks/useShop'
import { BottomNav } from '@/components/BottomNav'
import { LoadingScreen } from '@/components/LoadingScreen'

export default function ShopLayout({ children }: { children: React.ReactNode }) {
  const { shopId } = useParams<{ shopId: string }>()
  const { loading, error } = useShopInit(shopId)

  if (loading) return <LoadingScreen />

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
