'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { initLiff } from '@/lib/liff'
import { createSupabaseClient } from '@/lib/supabase'

type Step = 'loading' | 'form' | 'saving' | 'done' | 'error'

const inp = 'w-full bg-gray-50 border-0 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#1877F2]/30'

export default function RegisterPage() {
  const router = useRouter()
  const [step, setStep] = useState<Step>('loading')
  const [lineUid, setLineUid] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [jwt, setJwt] = useState('')
  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [slugError, setSlugError] = useState('')
  const [errorMsg, setErrorMsg] = useState('')

  useEffect(() => {
    initLiff().then(async (liff) => {
      if (!liff.isLoggedIn()) { liff.login({ redirectUri: window.location.href }); return }
      const profile = await liff.getProfile()
      setLineUid(profile.userId); setDisplayName(profile.displayName)
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
      const res = await fetch(`${supabaseUrl}/functions/v1/verify-line`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ line_access_token: liff.getAccessToken() }),
      })
      if (res.ok) { const { access_token } = await res.json(); setJwt(access_token) }
      setStep('form')
    }).catch(() => setStep('error'))
  }, [])

  const handleSlugChange = (val: string) => {
    setSlug(val.toLowerCase().replace(/[^a-z0-9-]/g, '')); setSlugError('')
  }

  const handleSubmit = async () => {
    if (!name.trim() || !slug.trim()) return
    if (!/^[a-z0-9][a-z0-9-]{1,30}[a-z0-9]$/.test(slug)) {
      setSlugError('ชื่อย่อต้องเป็น a-z, 0-9, - และยาว 3-32 ตัว'); return
    }
    setStep('saving')
    const sb = createSupabaseClient(jwt ?? undefined)
    const { data: existing } = await sb.from('shops').select('id').eq('slug', slug).maybeSingle()
    if (existing) { setSlugError('ชื่อย่อนี้ถูกใช้งานแล้ว'); setStep('form'); return }
    const { data: shop, error: shopErr } = await sb.from('shops').insert({
      slug, name: name.trim(), owner_line_uid: lineUid, plan: 'free',
      default_warranty_days: 0, vat_enabled: false, vat_rate: 7.00, last_upd_by: lineUid,
    }).select().single()
    if (shopErr || !shop) { setErrorMsg('สร้างร้านไม่สำเร็จ: ' + (shopErr?.message ?? 'unknown')); setStep('error'); return }
    await sb.from('shop_members').insert({ shop_id: shop.id, line_uid: lineUid, display_name: displayName, role: 'owner', last_upd_by: lineUid })
    router.push(`/shop/${slug}`)
  }

  if (step === 'loading') return (
    <div className="flex flex-col items-center justify-center min-h-dvh gap-3">
      <div className="w-12 h-12 rounded-3xl bg-[#1877F2] animate-pulse shadow-[0_8px_24px_rgba(24,119,242,0.4)]" />
      <p className="text-sm text-gray-400 font-medium">กำลังเชื่อมต่อ LINE...</p>
    </div>
  )

  if (step === 'error') return (
    <div className="flex flex-col items-center justify-center min-h-dvh gap-3 p-8 text-center">
      <div className="w-14 h-14 rounded-3xl bg-red-50 flex items-center justify-center mx-auto mb-2">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
      </div>
      <p className="font-bold text-gray-800">{errorMsg || 'เกิดข้อผิดพลาด'}</p>
      <button onClick={() => window.location.reload()} className="mt-2 text-sm text-[#1877F2] font-semibold">ลองใหม่</button>
    </div>
  )

  return (
    <div className="flex flex-col min-h-dvh">
      {/* Header */}
      <div className="bg-[#1877F2] px-6 pt-16 pb-14 flex flex-col items-center text-center">
        <div className="w-16 h-16 rounded-3xl bg-white/20 flex items-center justify-center text-white text-2xl font-bold mb-4">ขาย</div>
        <h1 className="text-white text-xl font-bold">สร้างร้านค้าใหม่</h1>
        <p className="text-white/70 text-sm mt-1">สวัสดี, {displayName}</p>
      </div>

      <div className="flex-1 px-4 -mt-6 pb-8">
        <div className="bg-white rounded-3xl p-5 shadow-[0_8px_32px_rgba(0,0,0,0.10)] space-y-4">
          {/* Shop name */}
          <div>
            <p className="text-xs font-bold text-gray-400 mb-1.5">ชื่อร้านค้า<span className="text-red-400 ml-0.5">*</span></p>
            <input className={inp} placeholder="เช่น One Store, ร้านค้าออนไลน์" value={name} onChange={(e) => setName(e.target.value)} />
          </div>

          {/* Slug */}
          <div>
            <p className="text-xs font-bold text-gray-400 mb-0.5">ชื่อย่อร้าน (URL)<span className="text-red-400 ml-0.5">*</span></p>
            <p className="text-[10px] text-gray-400 mb-1.5">ตัวเล็ก a-z, 0-9, - เท่านั้น</p>
            <div className="flex items-center gap-1 bg-gray-50 rounded-2xl px-4 py-3">
              <span className="text-xs text-gray-300 whitespace-nowrap">/shop/</span>
              <input className="flex-1 bg-transparent text-sm focus:outline-none text-gray-700 font-medium"
                placeholder="onestore" value={slug} onChange={(e) => handleSlugChange(e.target.value)}
                autoCapitalize="none" autoCorrect="off"
              />
            </div>
            {slugError && <p className="text-xs text-red-500 mt-1.5 px-1">{slugError}</p>}
            {slug && !slugError && (
              <p className="text-[11px] text-gray-400 mt-1.5 px-1">URL: <span className="text-[#1877F2] font-semibold">khaai.app/shop/{slug}</span></p>
            )}
          </div>
        </div>

        <div className="mt-4">
          <button onClick={handleSubmit} disabled={!name.trim() || !slug.trim() || step === 'saving'}
            className="w-full bg-[#1877F2] disabled:bg-gray-200 text-white disabled:text-gray-400 font-bold py-4 rounded-2xl text-sm transition-all shadow-[0_4px_16px_rgba(24,119,242,0.35)] disabled:shadow-none active:scale-[0.98]">
            {step === 'saving' ? 'กำลังสร้างร้าน...' : 'สร้างร้านค้า'}
          </button>
        </div>
      </div>
    </div>
  )
}
