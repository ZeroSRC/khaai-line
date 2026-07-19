'use client'

import { useParams, usePathname } from 'next/navigation'
import { useShopInit } from '@/hooks/useShop'
import { useShopStore } from '@/store/shopStore'
import { BottomNav } from '@/components/BottomNav'
import { LoadingScreen } from '@/components/LoadingScreen'

export default function ShopLayout({ children }: { children: React.ReactNode }) {
  const { shopId } = useParams<{ shopId: string }>()
  const pathname = usePathname()
  const clearShop = useShopStore((s) => s.clear)
  // /join is how a non-member gets in — useShopInit's membership check always fails for
  // them (chicken-and-egg, same class of bug fix-invite-join.sql fixed for the join page's
  // own query). skip makes the hook not run at all there (not just hide its result — a
  // stale failed run used to survive the post-join redirect and show "ไม่พบร้านค้านี้")
  // and re-run fresh once the redirect lands on the dashboard.
  const isJoin = pathname?.endsWith('/join') ?? false
  const { loading, error } = useShopInit(shopId, { skip: isJoin })

  if (isJoin) return <>{children}</>

  if (loading) return <LoadingScreen />

  if (error) {
    const backToHome = () => {
      localStorage.removeItem('khaai_last_shop')
      clearShop()
      window.location.href = '/'
    }
    return (
      <div className="flex flex-col items-center justify-center min-h-dvh gap-3 p-8 text-center">
        <div className="text-4xl">⚠️</div>
        <p className="font-semibold">{error}</p>
        <p className="text-sm text-gray-400">กรุณาติดต่อเจ้าของร้านเพื่อขอสิทธิ์</p>
        <button onClick={backToHome} className="mt-2 text-sm text-[#1877F2] font-semibold">กลับหน้าแรกเพื่อเข้าสู่ระบบใหม่</button>
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
