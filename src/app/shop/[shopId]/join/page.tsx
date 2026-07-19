'use client'

import { useEffect, useState } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import { initLiff } from '@/lib/liff'
import { createSupabaseClient } from '@/lib/supabase'
import { useShopStore } from '@/store/shopStore'
import { useT } from '@/lib/i18n'
import { LoadingScreen } from '@/components/LoadingScreen'

type Step = 'loading' | 'joining' | 'already' | 'done' | 'error' | 'expired'

export default function JoinPage() {
  const { shopId } = useParams<{ shopId: string }>()
  const params = useSearchParams()
  const clearShop = useShopStore((s) => s.clear)
  const t = useT()
  const [step, setStep] = useState<Step>('loading')
  const [shopName, setShopName] = useState('')
  const [errorMsg, setErrorMsg] = useState('')
  // Raw technical detail shown under the friendly message — remote debugging (chrome://inspect /
  // Safari Web Inspector) isn't realistic to ask of every shop owner, so put the real cause
  // directly on screen instead of only in the console.
  const [debugMsg, setDebugMsg] = useState('')

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
          if (!res.ok) { setErrorMsg(t('join.verifyFailed')); setStep('error'); return }
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
        // Without a JWT the insert below is anonymous and RLS silently rejects it — better to
        // stop here than to flash "joined!" and leave the person locked out.
        if (!jwt) { setErrorMsg(t('join.verifyFailed')); setStep('error'); return }

        // Temporary QR: if the link carries a token, it must be valid and unexpired.
        // A plain link with no token still works (permanent invite) — the QR is the temporary one.
        const exp = params.get('e'), sig = params.get('s')
        if (exp && sig) {
          const vr = await fetch('/api/invite-token', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'verify', slug: shopId, exp, sig }),
          }).then((r) => r.json()).catch(() => ({ valid: false }))
          if (!vr.valid) { setStep('expired'); return }
        }

        const sb = createSupabaseClient(jwt)
        // A non-member can't read `shops` directly (RLS is members-only), which is exactly the
        // person joining. Resolve the shop through a security-definer function instead.
        const { data: shopRows, error: shopErr } = await sb.rpc('shop_public_by_slug', { p_slug: shopId })
        // A wrong/mismatched jwt (e.g. verify-line's JWT_SECRET not matching the Supabase
        // project's real JWT secret) makes PostgREST reject the request with a 401 — that
        // shows up here as an error, not as an empty result, so it must be logged or this
        // looks identical to "the shop genuinely doesn't exist".
        if (shopErr) console.error('[join] shop_public_by_slug', shopErr)
        const shop = Array.isArray(shopRows) ? shopRows[0] : shopRows
        if (!shop) {
          setErrorMsg(t('join.shopNotFound'))
          setDebugMsg(shopErr ? `${shopErr.code ?? ''} ${shopErr.message}`.trim() : 'rpc returned no row (no error)')
          setStep('error'); return
        }
        setShopName(shop.name)

        // Full page load, NOT router.push: a client-side redirect keeps the /shop layout
        // mounted with whatever state (or cached bundle, in LINE's webview) it had from
        // before the join — which kept showing a stale "ไม่พบร้านค้านี้" after a successful
        // join. A hard navigation is exactly the manual refresh that always fixed it.
        const goToShop = () => window.location.replace(`/shop/${shopId}`)

        const { data: existing } = await sb.from('shop_members').select('id').eq('shop_id', shop.id).eq('line_uid', lineUid).maybeSingle()
        if (existing) { setStep('already'); setTimeout(goToShop, 2000); return }

        setStep('joining')
        const { error: joinErr } = await sb.from('shop_members').insert({ shop_id: shop.id, line_uid: lineUid, display_name: displayName, role: 'staff', last_upd_by: lineUid })
        if (joinErr) {
          // The pre-check above reads through RLS, which only lets a caller see rows for a
          // shop it's ALREADY a member of — for a first-time join it can never reliably see
          // a row that a concurrent request (e.g. tapping the plain link and the QR close
          // together) just inserted. The unique index is the real source of truth: a 23505
          // here just means "you're already in" (fix-shop-members-unique.sql), not a failure.
          if (joinErr.code === '23505') { setStep('already'); setTimeout(goToShop, 2000); return }
          console.error('[join] insert shop_members', joinErr)
          setErrorMsg(t('join.genericError')); setDebugMsg(`${joinErr.code ?? ''} ${joinErr.message}`.trim())
          setStep('error'); return
        }
        setStep('done'); setTimeout(goToShop, 2000)
      } catch (err) {
        console.error('[join] unhandled', err)
        setErrorMsg(t('join.genericError')); setDebugMsg(err instanceof Error ? err.message : String(err))
        setStep('error')
      }
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
    <LoadingScreen text={step === 'joining' ? t('join.joining') : undefined} />
  )

  if (step === 'already') return (
    <div className="flex flex-col items-center justify-center min-h-dvh gap-4 text-center p-8">
      <div className="w-20 h-20 rounded-3xl bg-[#1877F2]/10 flex items-center justify-center text-[#1877F2] mx-auto">{iconEl('check')}</div>
      <div>
        <p className="font-bold text-gray-900 text-lg">{t('join.already')}</p>
        <p className="text-sm text-gray-400 mt-1">{t('join.redirecting', { shop: shopName })}</p>
      </div>
    </div>
  )

  if (step === 'expired') return (
    <div className="flex flex-col items-center justify-center min-h-dvh gap-4 text-center p-8">
      <div className="w-20 h-20 rounded-3xl bg-amber-50 flex items-center justify-center text-amber-500 mx-auto">
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
      </div>
      <div>
        <p className="font-bold text-gray-900 text-lg">{t('join.expiredTitle')}</p>
        <p className="text-sm text-gray-400 mt-1">{t('join.expiredHint')}</p>
      </div>
    </div>
  )

  if (step === 'done') return (
    <div className="flex flex-col items-center justify-center min-h-dvh gap-4 text-center p-8">
      <div className="w-20 h-20 rounded-3xl bg-[#1877F2]/10 flex items-center justify-center text-[#1877F2] mx-auto">{iconEl('star')}</div>
      <div>
        <p className="font-bold text-gray-900 text-lg">{t('join.success')}</p>
        <p className="text-sm text-gray-400 mt-1">{t('join.redirectingTo', { shop: shopName })}</p>
      </div>
    </div>
  )

  const backToHome = () => {
    localStorage.removeItem('khaai_last_shop')
    clearShop()
    window.location.href = '/'
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-dvh gap-4 text-center p-8">
      <div className="w-20 h-20 rounded-3xl bg-red-50 flex items-center justify-center text-red-400 mx-auto">{iconEl('warning')}</div>
      <div>
        <p className="font-bold text-gray-900">{errorMsg}</p>
        {debugMsg && <p className="text-[11px] text-gray-400 mt-2 break-all px-4">{debugMsg}</p>}
        <div className="flex items-center justify-center gap-4 mt-3">
          <button onClick={() => window.location.reload()} className="text-sm text-[#1877F2] font-semibold">{t('join.retry')}</button>
          <button onClick={backToHome} className="text-sm text-gray-400 font-semibold">{t('join.backHome')}</button>
        </div>
      </div>
    </div>
  )
}
