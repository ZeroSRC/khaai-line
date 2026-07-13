'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { initLiff } from '@/lib/liff'
import { LoadingScreen } from '@/components/LoadingScreen'
import { HeaderDecor } from '@/components/HeaderDecor'

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

  if (!ready) return <LoadingScreen />

  const canGo = slug.trim().length > 0

  return (
    <div className="relative min-h-dvh">
      {/* `fixed` lets the gradient escape body's 430px LIFF column and cover the whole
          viewport — otherwise it renders as a blue strip with grey gutters on desktop. */}
      <div className="fixed inset-0 overflow-hidden bg-gradient-to-br from-[#3D8DFF] via-[#1877F2] to-[#0A3A93]">
        <HeaderDecor />
      </div>

      <div className="relative min-h-dvh flex flex-col items-center justify-center px-6 py-10">
        {/* Mascot + breathing halo */}
        <div className="relative mb-6 fade-up" style={{ animationDelay: '0.05s' }}>
          <div className="halo-pulse absolute inset-0 -m-4 rounded-full bg-white/30 blur-2xl" />
          <div className="mascot-float relative w-28 h-28 rounded-[32px] overflow-hidden shadow-[0_16px_40px_rgba(3,29,74,0.45)] ring-4 ring-white/50">
            <img src="/mascot.png" alt="Khaai" className="w-full h-full object-cover" />
          </div>
        </div>

        <h1 className="text-white text-4xl font-bold tracking-tight fade-up" style={{ animationDelay: '0.12s' }}>
          Khaai
        </h1>
        <p className="text-white/75 text-sm mt-2 mb-8 fade-up" style={{ animationDelay: '0.18s' }}>
          ระบบจัดการร้านค้าผ่าน LINE
        </p>

        {/* Card */}
        <div className="w-full bg-white rounded-[28px] p-6 shadow-[0_20px_50px_rgba(3,29,74,0.28)] fade-up"
          style={{ animationDelay: '0.26s' }}>
          <p className="text-xs font-bold text-gray-400 mb-3 text-center">เข้าสู่ร้านค้า</p>

          {/* Matches the product-search field: px-4 py-3 + text-sm = 44px.
              focus ring (not a border) so the field can't change height when focused. */}
          <label className="flex items-center gap-2 bg-gray-50 rounded-2xl px-4 py-3 mb-3 transition-colors focus-within:bg-white focus-within:ring-2 focus-within:ring-[#1877F2]/40">
            <span className="text-xs text-gray-300 whitespace-nowrap select-none">/shop/</span>
            <input className="flex-1 min-w-0 bg-transparent text-sm focus:outline-none text-gray-700 font-medium placeholder:text-gray-300"
              placeholder="ชื่อย่อร้านค้า เช่น onestore"
              value={slug} onChange={(e) => setSlug(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleGo()}
              autoCapitalize="none" autoCorrect="off" spellCheck={false}
            />
          </label>

          <button onClick={handleGo} disabled={!canGo}
            className="w-full flex items-center justify-center gap-2 bg-gradient-to-br from-[#5AA4FF] to-[#1877F2] disabled:bg-none disabled:bg-gray-100 text-white disabled:text-gray-300 font-bold py-3 rounded-2xl text-sm transition-all shadow-[0_8px_20px_rgba(24,119,242,0.4)] disabled:shadow-none active:scale-[0.98]">
            เข้าสู่ร้านค้า
            {/* The arrow only shows once the button can actually do something */}
            {canGo && (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12h14M13 6l6 6-6 6"/>
              </svg>
            )}
          </button>

          <p className="text-[11px] text-gray-400 text-center mt-3.5">ชื่อย่อร้านค้าได้รับจากเจ้าของร้าน</p>
        </div>

        <p className="text-white/50 text-[11px] mt-8 fade-up" style={{ animationDelay: '0.34s' }}>
          ยังไม่มีร้าน? สร้างร้านได้ที่เว็บไซต์ Khaai
        </p>
      </div>
    </div>
  )
}
