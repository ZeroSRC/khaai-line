'use client'

import { useEffect, useState } from 'react'
import { useShopStore } from '@/store/shopStore'
import { createSupabaseClient } from '@/lib/supabase'
import { initLiff } from '@/lib/liff'
import type { Shop, ShopMember } from '@/lib/types'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const VERIFY_URL = `${SUPABASE_URL}/functions/v1/verify-line`

export function useShopInit(slug: string) {
  const { setShop, setMember, setLineProfile, setJwt } = useShopStore()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function init() {
      try {
        const liff = await initLiff()
        if (!liff.isLoggedIn()) {
          localStorage.setItem('khaai_last_shop', slug)
          liff.login()
          return
        }

        const profile = await liff.getProfile()
        setLineProfile(profile.userId, profile.displayName, profile.pictureUrl ?? '')

        // แลก LINE access token เป็น Supabase JWT ผ่าน Edge Function
        const lineToken = liff.getAccessToken()
        const verifyRes = await fetch(VERIFY_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ line_access_token: lineToken }),
        })

        if (!verifyRes.ok) {
          setError('ไม่สามารถยืนยันตัวตนได้ กรุณาลองใหม่')
          return
        }

        const { access_token } = await verifyRes.json()
        setJwt(access_token)

        const sb = createSupabaseClient(access_token)

        const { data: shop, error: shopErr } = await sb
          .from('shops')
          .select('*')
          .eq('slug', slug)
          .single()

        if (shopErr || !shop) {
          setError('ไม่พบร้านค้านี้')
          return
        }
        setShop(shop as Shop)

        const { data: member } = await sb
          .from('shop_members')
          .select('*')
          .eq('shop_id', shop.id)
          .eq('line_uid', profile.userId)
          .single()

        if (!member) {
          setError('คุณไม่มีสิทธิ์เข้าถึงร้านนี้')
          return
        }
        setMember(member as ShopMember)
        localStorage.setItem('khaai_last_shop', slug)
      } catch {
        setError('เกิดข้อผิดพลาด กรุณาลองใหม่')
      } finally {
        setLoading(false)
      }
    }
    init()
  }, [slug]) // eslint-disable-line react-hooks/exhaustive-deps

  return { loading, error }
}
