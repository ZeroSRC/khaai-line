'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { initLiff } from '@/lib/liff'
import { createSupabaseClient } from '@/lib/supabase'
import { HeaderDecor } from '@/components/HeaderDecor'
import { useT } from '@/lib/i18n'

type Step = 'loading' | 'form' | 'saving' | 'done' | 'error'

const inp = 'w-full bg-gray-50 border-2 border-transparent rounded-2xl px-4 py-3 text-sm outline-none focus:outline-none focus:border-transparent focus:ring-0 focus:ring-transparent transition-all'

export default function RegisterPage() {
  const router = useRouter()
  const t = useT()
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
    <div className="flex flex-col items-center justify-center min-h-dvh gap-3 bg-gradient-to-br from-[#3D8DFF] via-[#1877F2] to-[#0A3A93] text-white">
      <div className="w-12 h-12 rounded-3xl bg-white/20 animate-pulse shadow-[0_8px_24px_rgba(255,255,255,0.15)] flex items-center justify-center text-lg font-bold">K</div>
      <p className="text-sm text-white/70 font-medium">กำลังเชื่อมต่อ LINE...</p>
    </div>
  )

  if (step === 'error') return (
    <div className="flex flex-col items-center justify-center min-h-dvh gap-3 p-8 text-center bg-gradient-to-br from-[#3D8DFF] via-[#1877F2] to-[#0A3A93] text-white">
      <div className="w-14 h-14 rounded-3xl bg-white/10 flex items-center justify-center mx-auto mb-2 shadow-lg">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#ff8585" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
      </div>
      <p className="font-bold text-white">{errorMsg || 'เกิดข้อผิดพลาด'}</p>
      <button onClick={() => window.location.reload()} className="mt-2 text-sm text-white underline font-semibold">ลองใหม่</button>
    </div>
  )

  const canSubmit = name.trim().length > 0 && slug.trim().length > 0 && step !== 'saving'

  return (
    <div className="relative min-h-dvh">
      {/* Background Decor */}
      <div className="fixed inset-0 overflow-hidden bg-gradient-to-br from-[#3D8DFF] via-[#1877F2] to-[#0A3A93]">
        <HeaderDecor />
      </div>

      <div className="relative min-h-dvh flex flex-col items-center justify-center px-6 py-8">
        {/* Mascot + breathing halo */}
        <div className="relative mb-5 fade-up" style={{ animationDelay: '0.05s' }}>
          <div className="halo-pulse absolute inset-0 -m-4 rounded-full bg-white/30 blur-2xl" />
          <div className="mascot-float relative w-24 h-24 rounded-[28px] overflow-hidden shadow-[0_16px_40px_rgba(3,29,74,0.45)] ring-4 ring-white/50">
            <img src="/mascot.png" alt="Khaai" className="w-full h-full object-cover" />
          </div>
        </div>

        <h1 className="text-white text-2xl font-bold tracking-tight fade-up" style={{ animationDelay: '0.12s' }}>
          สร้างร้านค้าใหม่
        </h1>
        <p className="text-white/75 text-xs mt-1.5 mb-6 fade-up" style={{ animationDelay: '0.18s' }}>
          สวัสดี, {displayName}
        </p>

        {/* Card Form */}
        <div className="w-full bg-white rounded-[28px] p-6 shadow-[0_20px_50px_rgba(3,29,74,0.28)] space-y-4 fade-up"
          style={{ animationDelay: '0.26s' }}>
          {/* Shop name */}
          <div>
            <p className="text-xs font-bold text-gray-400 mb-1.5">ชื่อร้านค้า<span className="text-red-400 ml-0.5">*</span></p>
            <input className={inp} placeholder="เช่น One Store, ร้านค้าออนไลน์" value={name} onChange={(e) => setName(e.target.value)} />
          </div>

          {/* Slug */}
          <div>
            <p className="text-xs font-bold text-gray-400 mb-0.5">ชื่อย่อร้าน (URL)<span className="text-red-400 ml-0.5">*</span></p>
            <p className="text-[10px] text-gray-400 mb-1.5">ตัวเล็ก a-z, 0-9, - เท่านั้น</p>
            
            <label className="flex items-center gap-1.5 bg-gray-50 rounded-2xl px-4 py-3 transition-colors focus-within:bg-white focus-within:ring-2 focus-within:ring-[#1877F2]/40">
              <span className="text-xs text-gray-300 whitespace-nowrap select-none">/shop/</span>
              <input className="flex-1 min-w-0 bg-transparent text-sm focus:outline-none text-gray-700 font-medium placeholder:text-gray-300"
                placeholder="onestore" value={slug} onChange={(e) => handleSlugChange(e.target.value)}
                autoCapitalize="none" autoCorrect="off" spellCheck={false}
              />
            </label>
            {slugError && <p className="text-[11px] text-red-500 mt-1.5 px-1 font-semibold">{slugError}</p>}
            {slug && !slugError && (
              <p className="text-[11px] text-gray-400 mt-1.5 px-1 truncate">
                ที่อยู่: <span className="text-[#1877F2] font-semibold">khaai.app/shop/{slug}</span>
              </p>
            )}
          </div>

          <button onClick={handleSubmit} disabled={!canSubmit}
            className="w-full flex items-center justify-center gap-2 bg-gradient-to-br from-[#5AA4FF] to-[#1877F2] disabled:bg-none disabled:bg-gray-100 text-white disabled:text-gray-300 font-bold py-3.5 rounded-2xl text-sm transition-all shadow-[0_8px_20px_rgba(24,119,242,0.4)] disabled:shadow-none active:scale-[0.98]">
            {step === 'saving' ? 'กำลังสร้างร้าน...' : 'สร้างร้านค้าใหม่'}
          </button>
        </div>

        <Link href="/" className="text-white/75 hover:text-white text-[11px] mt-6 fade-up underline transition-colors" style={{ animationDelay: '0.34s' }}>
          กลับไปยังหน้าเข้าสู่ระบบ
        </Link>
      </div>
    </div>
  )
}
