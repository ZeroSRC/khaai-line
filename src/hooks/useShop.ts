'use client'

import { useEffect, useState } from 'react'
import { useShopStore } from '@/store/shopStore'
import { createSupabaseClient } from '@/lib/supabase'
import { initLiff } from '@/lib/liff'
import { IS_DEV_AUTH } from '@/lib/devAuth'
import type { Shop, ShopMember } from '@/lib/types'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const VERIFY_URL = `${SUPABASE_URL}/functions/v1/verify-line`

export function useShopInit(slug: string, opts?: { skip?: boolean }) {
  const skip = opts?.skip === true
  const { setShop, setMember, setLineProfile, setJwt } = useShopStore()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // /join runs before the person is a member, so the membership check below is
    // guaranteed to fail there. Worse: the failed result ("ไม่พบร้านค้านี้") stays in state,
    // and since Next keeps the layout mounted across the post-join client-side redirect
    // (same slug → this effect doesn't re-run), the stale error is what got rendered
    // after a successful join. Skipping entirely on /join — and re-running when skip
    // flips false after the redirect — fixes both.
    if (skip) return
    setLoading(true)
    setError(null)
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
        // dev: ไม่มี LINE token จริง → เซ็น JWT เองที่ /api/dev-token (ปิดตัวเองบน prod)
        const verifyRes = IS_DEV_AUTH
          ? await fetch('/api/dev-token', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ line_uid: profile.userId }),
            })
          : await fetch(VERIFY_URL, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ line_access_token: liff.getAccessToken() }),
            })

        if (!verifyRes.ok) {
          const detail = await verifyRes.json().catch(() => null)
          if (IS_DEV_AUTH && detail?.error) console.error('[dev-token]', detail.error)
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

        // Backfill the LINE display name. Members added by UID (or before this ran) have a
        // null name and show as "unnamed" on the members list; refresh it on every login so
        // the name also stays current if they rename themselves on LINE.
        if (member.display_name !== profile.displayName) {
          sb.from('shop_members').update({ display_name: profile.displayName, last_upd_by: profile.userId }).eq('id', member.id).then(() => {})
          member.display_name = profile.displayName
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
  }, [slug, skip]) // eslint-disable-line react-hooks/exhaustive-deps

  return { loading, error }
}
