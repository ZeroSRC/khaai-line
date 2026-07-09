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
        const liff = await initLiff()
        if (!liff.isLoggedIn()) {
          localStorage.setItem('khaai_last_shop', slug)
          liff.login()
          return
        }
        const profile = await liff.getProfile()
        setLineProfile(profile.userId, profile.displayName, profile.pictureUrl ?? '')

        const sb = createSupabaseClient(profile.userId)
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
