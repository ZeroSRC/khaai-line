'use client'

import { useParams, usePathname } from 'next/navigation'
import { useShopInit } from '@/hooks/useShop'
import { BottomNav } from '@/components/BottomNav'
import { LoadingScreen } from '@/components/LoadingScreen'

export default function ShopLayout({ children }: { children: React.ReactNode }) {
  const { shopId } = useParams<{ shopId: string }>()
  const pathname = usePathname()
  const { loading, error } = useShopInit(shopId)

  // /join is how a non-member gets in — useShopInit's own membership check above always
  // fails for them (chicken-and-egg, same class of bug fix-invite-join.sql fixed for the
  // join page's own query). The join page resolves the shop itself via a security-definer
  // RPC and doesn't need this layout's guard, so let it render unconditionally.
  if (pathname?.endsWith('/join')) return <>{children}</>

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
