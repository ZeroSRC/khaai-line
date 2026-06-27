'use client'

import { useEffect, useState } from 'react'
import { useShopStore } from '@/store/shopStore'
import { createSupabaseClient } from '@/lib/supabase'
import { initLiff } from '@/lib/liff'
import type { Shop, ShopMember } from '@/lib/types'

export function useShopInit(slug: string) {
  const { setShop, setMember, setLineProfile } = useShopStore()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function init() {
      try {
        // 1. Init LIFF + get LINE profile
        const liff = await initLiff()
        if (!liff.isLoggedIn()) {
          liff.login({ redirectUri: window.location.href })
          return
        }

        // Verify idToken server-side before trusting userId
        const idToken = liff.getIDToken()
        let verifiedUid: string
        let verifiedName: string
        let verifiedPicture: string

        if (idToken) {
          const verifyRes = await fetch('/api/auth/line', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ idToken }),
          })
          if (!verifyRes.ok) {
            setError('ยืนยันตัวตนไม่สำเร็จ')
            return
          }
          const verified = await verifyRes.json()
          verifiedUid = verified.lineUid
          verifiedName = verified.displayName
          verifiedPicture = verified.pictureUrl ?? ''
        } else {
          // Fallback for environments where idToken is unavailable
          const profile = await liff.getProfile()
          verifiedUid = profile.userId
          verifiedName = profile.displayName
          verifiedPicture = profile.pictureUrl ?? ''
        }

        setLineProfile(verifiedUid, verifiedName, verifiedPicture)

        // 2. Fetch shop by slug
        const sb = createSupabaseClient(verifiedUid)
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

        // 3. Check membership
        const { data: member } = await sb
          .from('shop_members')
          .select('*')
          .eq('shop_id', shop.id)
          .eq('line_uid', verifiedUid)
          .single()

        if (!member) {
          setError('คุณไม่มีสิทธิ์เข้าถึงร้านนี้')
          return
        }
        setMember(member as ShopMember)
      } catch (e) {
        setError('เกิดข้อผิดพลาด กรุณาลองใหม่')
      } finally {
        setLoading(false)
      }
    }
    init()
  }, [slug]) // eslint-disable-line react-hooks/exhaustive-deps

  return { loading, error }
}
