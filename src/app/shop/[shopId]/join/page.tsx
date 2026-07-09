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
        if (!liff.isLoggedIn()) {
          liff.login({ redirectUri: window.location.href })
          return
        }

        const idToken = liff.getIDToken()
        let lineUid: string
        let displayName: string

        if (idToken) {
          const res = await fetch('/api/auth/line', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ idToken }),
          })
          if (!res.ok) { setErrorMsg('ยืนยันตัวตนไม่สำเร็จ'); setStep('error'); return }
          const v = await res.json()
          lineUid = v.lineUid
          displayName = v.displayName
        } else {
          const profile = await liff.getProfile()
          lineUid = profile.userId
          displayName = profile.displayName
        }

        const sb = createSupabaseClient(jwt ?? undefined)

        // Fetch shop by slug
        const { data: shop } = await sb.from('shops').select('id, name').eq('slug', shopId).maybeSingle()
        if (!shop) {
          setErrorMsg('ไม่พบร้านค้านี้')
          setStep('error')
          return
        }
        setShopName(shop.name)

        // Check if already a member
        const { data: existing } = await sb
          .from('shop_members').select('id, role').eq('shop_id', shop.id).eq('line_uid', lineUid).maybeSingle()

        if (existing) {
          setStep('already')
          setTimeout(() => router.push(`/shop/${shopId}`), 2000)
          return
        }

        // Join as staff
        setStep('joining')
        await sb.from('shop_members').insert({
          shop_id: shop.id,
          line_uid: lineUid,
          display_name: displayName,
          role: 'staff',
        })

        setStep('done')
        setTimeout(() => router.push(`/shop/${shopId}`), 2000)
      } catch {
        setErrorMsg('เกิดข้อผิดพลาด กรุณาลองใหม่')
        setStep('error')
      }
    }
    join()
  }, [shopId])

  if (step === 'loading' || step === 'joining') {
    return (
      <div className="flex flex-col items-center justify-center min-h-dvh gap-3">
        <div className="w-10 h-10 rounded-xl bg-[#06C755] animate-pulse" />
        <p className="text-sm text-gray-400">{step === 'loading' ? 'กำลังโหลด...' : 'กำลังเข้าร่วมร้าน...'}</p>
      </div>
    )
  }

  if (step === 'already') {
    return (
      <div className="flex flex-col items-center justify-center min-h-dvh gap-3 text-center p-8">
        <div className="text-5xl">✅</div>
        <p className="font-semibold text-gray-800">คุณเป็นสมาชิกอยู่แล้ว</p>
        <p className="text-sm text-gray-400">กำลังพาไปยังร้าน {shopName}...</p>
      </div>
    )
  }

  if (step === 'done') {
    return (
      <div className="flex flex-col items-center justify-center min-h-dvh gap-3 text-center p-8">
        <div className="text-5xl">🎉</div>
        <p className="font-semibold text-gray-800">เข้าร่วมร้านสำเร็จ!</p>
        <p className="text-sm text-gray-400">กำลังพาไปยัง {shopName}...</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-dvh gap-3 text-center p-8">
      <div className="text-5xl">⚠️</div>
      <p className="font-semibold text-gray-800">{errorMsg}</p>
      <button onClick={() => window.location.reload()} className="text-sm text-[#06C755] underline mt-2">ลองใหม่</button>
    </div>
  )
}
