'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { initLiff } from '@/lib/liff'

export default function Home() {
  const router = useRouter()
  const [slug, setSlug] = useState('')
  const [ready, setReady] = useState(false)

  useEffect(() => {
    initLiff()
      .then(() => {
        const saved = localStorage.getItem('khaai_last_shop')
        if (saved) router.replace(`/shop/${saved}`)
        else setReady(true)
      })
      .catch(() => setReady(true))
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const handleGo = () => {
    const clean = slug.trim().toLowerCase()
    if (!clean) return
    router.push(`/shop/${clean}`)
  }

  if (!ready) return (
    <div className="flex flex-col items-center justify-center min-h-dvh gap-3">
      <div className="w-12 h-12 rounded-3xl bg-[#06C755] animate-pulse shadow-[0_8px_24px_rgba(6,199,85,0.4)]" />
      <p className="text-sm text-gray-400 font-medium">กำลังโหลด...</p>
    </div>
  )

  return (
    <div className="flex flex-col min-h-dvh">
      {/* Hero */}
      <div className="bg-[#06C755] px-6 pt-20 pb-16 flex flex-col items-center text-center">
        <div className="w-16 h-16 rounded-3xl bg-white/20 flex items-center justify-center text-white text-2xl font-bold mb-5 shadow-[0_8px_24px_rgba(0,0,0,0.15)]">
          ขาย
        </div>
        <h1 className="text-white text-2xl font-bold">Khaai</h1>
        <p className="text-white/70 text-sm mt-2">ระบบจัดการร้านค้าผ่าน LINE</p>
      </div>

      {/* Card */}
      <div className="flex-1 px-6 -mt-6">
        <div className="bg-white rounded-3xl p-6 shadow-[0_8px_32px_rgba(0,0,0,0.10)]">
          <p className="text-xs font-bold text-gray-400 mb-3 text-center">เข้าสู่ร้านค้า</p>
          <div className="flex items-center gap-2 bg-gray-50 rounded-2xl px-4 py-3 mb-4">
            <span className="text-xs text-gray-300 whitespace-nowrap">/shop/</span>
            <input className="flex-1 bg-transparent text-sm focus:outline-none text-gray-700 font-medium placeholder:text-gray-300"
              placeholder="ชื่อย่อร้านค้า เช่น onestore"
              value={slug} onChange={(e) => setSlug(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleGo()}
              autoCapitalize="none" autoCorrect="off"
            />
          </div>
          <button onClick={handleGo} disabled={!slug.trim()}
            className="w-full bg-[#06C755] disabled:bg-gray-200 text-white disabled:text-gray-400 font-bold py-4 rounded-2xl text-sm transition-all shadow-[0_4px_16px_rgba(6,199,85,0.35)] disabled:shadow-none active:scale-[0.98]">
            เข้าสู่ร้านค้า
          </button>
          <p className="text-[10px] text-gray-300 text-center mt-3">ชื่อย่อร้านค้าได้รับจากเจ้าของร้าน</p>
        </div>

        <div className="mt-4 text-center">
          <p className="text-xs text-gray-400">ยังไม่มีร้าน?{' '}
            <a href="/register" className="text-[#06C755] font-semibold">สร้างร้านใหม่</a>
          </p>
        </div>
      </div>
    </div>
  )
}
