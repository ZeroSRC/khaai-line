'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { initLiff } from '@/lib/liff'
import { createSupabaseClient } from '@/lib/supabase'

type Step = 'loading' | 'form' | 'saving' | 'done' | 'error'

export default function RegisterPage() {
  const router = useRouter()
  const [step, setStep] = useState<Step>('loading')
  const [lineUid, setLineUid] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [slugError, setSlugError] = useState('')
  const [errorMsg, setErrorMsg] = useState('')

  useEffect(() => {
    initLiff().then(async (liff) => {
      if (!liff.isLoggedIn()) {
        liff.login({ redirectUri: window.location.href })
        return
      }
      const profile = await liff.getProfile()
      setLineUid(profile.userId)
      setDisplayName(profile.displayName)
      setStep('form')
    }).catch(() => setStep('error'))
  }, [])

  const handleSlugChange = (val: string) => {
    const clean = val.toLowerCase().replace(/[^a-z0-9-]/g, '')
    setSlug(clean)
    setSlugError('')
  }

  const handleSubmit = async () => {
    if (!name.trim()) return
    if (!slug.trim()) return

    if (!/^[a-z0-9][a-z0-9-]{1,30}[a-z0-9]$/.test(slug)) {
      setSlugError('ชื่อย่อต้องเป็นตัวเล็ก a-z, 0-9, - และมีความยาว 3-32 ตัวอักษร')
      return
    }

    setStep('saving')
    const sb = createSupabaseClient(lineUid)

    // Check slug availability
    const { data: existing } = await sb.from('shops').select('id').eq('slug', slug).maybeSingle()
    if (existing) {
      setSlugError('ชื่อย่อนี้ถูกใช้งานแล้ว กรุณาเลือกชื่อใหม่')
      setStep('form')
      return
    }

    // Create shop
    const { data: shop, error: shopErr } = await sb.from('shops').insert({
      slug,
      name: name.trim(),
      owner_line_uid: lineUid,
      plan: 'free',
      default_warranty_days: 0,
      vat_enabled: false,
      vat_rate: 7.00,
    }).select().single()

    if (shopErr || !shop) {
      setErrorMsg('สร้างร้านไม่สำเร็จ: ' + (shopErr?.message ?? 'unknown'))
      setStep('error')
      return
    }

    // Add owner as member
    await sb.from('shop_members').insert({
      shop_id: shop.id,
      line_uid: lineUid,
      display_name: displayName,
      role: 'owner',
    })

    router.push(`/shop/${slug}`)
  }

  if (step === 'loading') {
    return (
      <div className="flex flex-col items-center justify-center min-h-dvh gap-3">
        <div className="w-10 h-10 rounded-xl bg-[#06C755] animate-pulse" />
        <p className="text-sm text-gray-400">กำลังเชื่อมต่อ LINE...</p>
      </div>
    )
  }

  if (step === 'error') {
    return (
      <div className="flex flex-col items-center justify-center min-h-dvh gap-3 p-8 text-center">
        <div className="text-4xl">⚠️</div>
        <p className="font-semibold text-gray-800">{errorMsg || 'เกิดข้อผิดพลาด'}</p>
        <button onClick={() => window.location.reload()}
          className="mt-2 text-sm text-[#06C755] underline">ลองใหม่</button>
      </div>
    )
  }

  return (
    <div className="min-h-dvh flex flex-col">
      {/* Header */}
      <div className="bg-[#06C755] px-4 pt-12 pb-6 text-center">
        <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center text-white text-2xl font-bold mx-auto mb-3">
          ขาย
        </div>
        <h1 className="text-white text-xl font-bold">สร้างร้านค้าใหม่</h1>
        <p className="text-white/70 text-sm mt-1">สวัสดี, {displayName}</p>
      </div>

      <div className="flex-1 px-4 pt-6 space-y-4">
        {/* Shop name */}
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <p className="text-xs font-semibold text-gray-400 mb-2">ชื่อร้านค้า</p>
          <input
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#06C755] transition-colors"
            placeholder="เช่น One Store, ร้านค้าออนไลน์"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>

        {/* Slug */}
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <p className="text-xs font-semibold text-gray-400 mb-1">ชื่อย่อร้าน (URL)</p>
          <p className="text-[10px] text-gray-400 mb-2">ใช้เป็น link เข้าร้าน — ตัวเล็ก a-z, 0-9, - เท่านั้น</p>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-300 whitespace-nowrap">/shop/</span>
            <input
              className="flex-1 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#06C755] transition-colors"
              placeholder="onestore"
              value={slug}
              onChange={(e) => handleSlugChange(e.target.value)}
              autoCapitalize="none"
              autoCorrect="off"
            />
          </div>
          {slugError && <p className="text-xs text-red-500 mt-2">{slugError}</p>}
          {slug && !slugError && (
            <p className="text-xs text-gray-400 mt-2">
              URL: <span className="text-[#06C755] font-medium">khaai-qsop.vercel.app/shop/{slug}</span>
            </p>
          )}
        </div>

        <button
          onClick={handleSubmit}
          disabled={!name.trim() || !slug.trim() || step === 'saving'}
          className="w-full bg-[#06C755] disabled:bg-gray-200 text-white disabled:text-gray-400 font-bold py-4 rounded-2xl text-base transition-colors">
          {step === 'saving' ? 'กำลังสร้างร้าน...' : 'สร้างร้านค้า'}
        </button>
      </div>
    </div>
  )
}
