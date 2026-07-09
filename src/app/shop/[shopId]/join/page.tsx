'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { initLiff } from '@/lib/liff'
import { createSupabaseClient } from '@/lib/supabase'

type Step = 'loading' | 'joining' | 'already' | 'done' | 'error'

export default function JoinPage() {
  const { shopId } = useParams<{ shopId: string }>()
  const router = useRouter()
  const [step, setStep] = useState<Step>('loading')
  const [shopName, setShopName] = useState('')
  const [errorMsg, setErrorMsg] = useState('')

  useEffect(() => {
    async function join() {
      try {
        const liff = await initLiff()
        if (!liff.isLoggedIn()) { liff.login({ redirectUri: window.location.href }); return }
        const idToken = liff.getIDToken()
        let lineUid: string, displayName: string

        if (idToken) {
          const res = await fetch('/api/auth/line', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ idToken }),
          })
          if (!res.ok) { setErrorMsg('ยืนยันตัวตนไม่สำเร็จ'); setStep('error'); return }
          const v = await res.json(); lineUid = v.lineUid; displayName = v.displayName
        } else {
          const profile = await liff.getProfile(); lineUid = profile.userId; displayName = profile.displayName
        }

        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
        let jwt: string | undefined
        const tokenRes = await fetch(`${supabaseUrl}/functions/v1/verify-line`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ line_access_token: liff.getAccessToken() }),
        })
        if (tokenRes.ok) { const { access_token } = await tokenRes.json(); jwt = access_token }

        const sb = createSupabaseClient(jwt)
        const { data: shop } = await sb.from('shops').select('id, name').eq('slug', shopId).maybeSingle()
        if (!shop) { setErrorMsg('ไม่พบร้านค้านี้'); setStep('error'); return }
        setShopName(shop.name)

        const { data: existing } = await sb.from('shop_members').select('id').eq('shop_id', shop.id).eq('line_uid', lineUid).maybeSingle()
        if (existing) { setStep('already'); setTimeout(() => router.push(`/shop/${shopId}`), 2000); return }

        setStep('joining')
        await sb.from('shop_members').insert({ shop_id: shop.id, line_uid: lineUid, display_name: displayName, role: 'staff' })
        setStep('done'); setTimeout(() => router.push(`/shop/${shopId}`), 2000)
      } catch { setErrorMsg('เกิดข้อผิดพลาด กรุณาลองใหม่'); setStep('error') }
    }
    join()
  }, [shopId])

  const iconEl = (icon: 'check' | 'star' | 'warning') => {
    const icons = {
      check: <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>,
      star: <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>,
      warning: <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>,
    }
    return icons[icon]
  }

  if (step === 'loading' || step === 'joining') return (
    <div className="flex flex-col items-center justify-center min-h-dvh gap-3">
      <div className="w-12 h-12 rounded-3xl bg-[#06C755] animate-pulse shadow-[0_8px_24px_rgba(6,199,85,0.4)]" />
      <p className="text-sm text-gray-400 font-medium">{step === 'loading' ? 'กำลังโหลด...' : 'กำลังเข้าร่วมร้าน...'}</p>
    </div>
  )

  if (step === 'already') return (
    <div className="flex flex-col items-center justify-center min-h-dvh gap-4 text-center p-8">
      <div className="w-20 h-20 rounded-3xl bg-[#06C755]/10 flex items-center justify-center text-[#06C755] mx-auto">{iconEl('check')}</div>
      <div>
        <p className="font-bold text-gray-900 text-lg">คุณเป็นสมาชิกอยู่แล้ว</p>
        <p className="text-sm text-gray-400 mt-1">กำลังพาไปยังร้าน {shopName}...</p>
      </div>
    </div>
  )

  if (step === 'done') return (
    <div className="flex flex-col items-center justify-center min-h-dvh gap-4 text-center p-8">
      <div className="w-20 h-20 rounded-3xl bg-[#06C755]/10 flex items-center justify-center text-[#06C755] mx-auto">{iconEl('star')}</div>
      <div>
        <p className="font-bold text-gray-900 text-lg">เข้าร่วมร้านสำเร็จ!</p>
        <p className="text-sm text-gray-400 mt-1">กำลังพาไปยัง {shopName}...</p>
      </div>
    </div>
  )

  return (
    <div className="flex flex-col items-center justify-center min-h-dvh gap-4 text-center p-8">
      <div className="w-20 h-20 rounded-3xl bg-red-50 flex items-center justify-center text-red-400 mx-auto">{iconEl('warning')}</div>
      <div>
        <p className="font-bold text-gray-900">{errorMsg}</p>
        <button onClick={() => window.location.reload()} className="mt-3 text-sm text-[#06C755] font-semibold">ลองใหม่</button>
      </div>
    </div>
  )
}
