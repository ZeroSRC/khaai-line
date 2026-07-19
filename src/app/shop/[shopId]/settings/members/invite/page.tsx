'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import QRCode from 'qrcode'
import { useShopStore } from '@/store/shopStore'
import { useT } from '@/lib/i18n'

const BackBtn = ({ onClick }: { onClick: () => void }) => (
  <button onClick={onClick} className="w-9 h-9 rounded-2xl bg-gray-50 flex items-center justify-center text-gray-500 active:bg-gray-100 transition-colors">
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
  </button>
)

export default function InviteMemberPage() {
  const { shopId } = useParams<{ shopId: string }>()
  const router = useRouter()
  const { shop, member: myMember, jwt } = useShopStore()
  const t = useT()
  const [copied, setCopied] = useState(false)

  // Temporary QR: a signed token that expires in a few minutes
  const [qr, setQr] = useState<string>('')       // data-URL of the QR image
  const [qrExp, setQrExp] = useState(0)          // unix seconds the token dies at
  const [qrLoading, setQrLoading] = useState(false)
  const [now, setNow] = useState(Math.floor(Date.now() / 1000))

  const isOwner = myMember?.role === 'owner'
  const qrRemaining = Math.max(0, qrExp - now)

  // Tick every second so the countdown updates and the QR flips to "expired" on its own
  useEffect(() => {
    const id = setInterval(() => setNow(Math.floor(Date.now() / 1000)), 1000)
    return () => clearInterval(id)
  }, [])

  const genQr = async () => {
    if (!jwt) return
    setQrLoading(true)
    try {
      const res = await fetch('/api/invite-token', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'sign', slug: shopId, jwt }),
      })
      if (!res.ok) throw new Error()
      const { exp, sig } = await res.json()
      // Open the LIFF app straight at the join route so LINE's camera lands the new person there
      const liffId = process.env.NEXT_PUBLIC_LIFF_ID
      const url = `https://liff.line.me/${liffId}/shop/${shopId}/join?e=${exp}&s=${encodeURIComponent(sig)}`
      const dataUrl = await QRCode.toDataURL(url, { width: 320, margin: 1, color: { dark: '#111827', light: '#ffffff' } })
      setQr(dataUrl); setQrExp(exp)
    } catch { /* leave the previous QR / empty state */ }
    finally { setQrLoading(false) }
  }

  const inviteLink = typeof window !== 'undefined' ? `${window.location.origin}/shop/${shopId}/join` : ''

  const copyInviteLink = () => {
    navigator.clipboard.writeText(inviteLink)
    setCopied(true); setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="pb-10">
      <div className="px-4 pt-8 pb-4 flex items-center gap-3">
        <BackBtn onClick={() => router.back()} />
        <h1 className="text-lg font-bold text-gray-900">{t('invite.title')}</h1>
      </div>

      <div className="px-4 space-y-3">
        {/* Invite link */}
        <div className="bg-white rounded-3xl p-4 shadow-[0_2px_16px_rgba(0,0,0,0.07)]">
          <p className="text-xs font-bold text-gray-400 mb-3">{t('invite.linkLabel')}</p>
          <div className="flex items-center gap-2 bg-gray-50 rounded-2xl px-4 py-3 mb-3">
            <p className="flex-1 text-xs text-gray-500 truncate">{inviteLink}</p>
          </div>
          <button onClick={copyInviteLink}
            className={`w-full py-3 rounded-2xl text-sm font-semibold transition-colors ${copied ? 'bg-[#1877F2]/10 text-[#1877F2]' : 'bg-[#1877F2] text-white shadow-[0_4px_12px_rgba(24,119,242,0.35)]'}`}>
            {copied ? t('invite.copied') : t('invite.copyLink')}
          </button>
          <p className="text-[10px] text-gray-400 mt-2 text-center">{t('invite.newMemberHint')}</p>
        </div>

        {/* Temporary QR — owner only. Scan on the "enter shop" page to join instantly. */}
        {isOwner && (
          <div className="bg-white rounded-3xl p-4 shadow-[0_2px_16px_rgba(0,0,0,0.07)] flex flex-col items-center">
            <p className="text-xs font-bold text-gray-400 self-start mb-3">{t('invite.qrLabel')}</p>

            {qr && qrRemaining > 0 ? (
              <>
                <div className="rounded-2xl overflow-hidden border border-gray-100 p-2 bg-white">
                  <img src={qr} alt="QR" className="w-44 h-44" />
                </div>
                {/* Countdown so the person sharing knows it's about to die */}
                <p className="text-xs text-gray-400 mt-3">
                  {t('invite.qrExpiresIn')}{' '}
                  <span className="font-bold text-[#1877F2] tabular-nums">
                    {Math.floor(qrRemaining / 60)}:{String(qrRemaining % 60).padStart(2, '0')}
                  </span>
                </p>
                <button onClick={genQr} disabled={qrLoading}
                  className="mt-3 text-xs font-semibold text-gray-500 active:text-gray-700 disabled:opacity-50">
                  {t('invite.qrRegen')}
                </button>
              </>
            ) : (
              <div className="flex flex-col items-center py-4">
                <div className="w-44 h-44 rounded-2xl bg-gray-50 border-2 border-dashed border-gray-200 flex items-center justify-center text-gray-300">
                  {qr && qrRemaining === 0
                    ? <span className="text-xs font-semibold text-amber-500">{t('invite.qrExpired')}</span>
                    : <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><path d="M14 14h3v3M20 14v.01M14 20h.01M17 20h.01M20 17v3" /></svg>}
                </div>
                <button onClick={genQr} disabled={qrLoading}
                  className="mt-4 bg-[#1877F2] text-white text-sm font-semibold px-5 py-2.5 rounded-2xl shadow-[0_4px_12px_rgba(24,119,242,0.35)] active:scale-95 transition-transform disabled:opacity-50">
                  {qrLoading ? t('invite.qrLoading') : qr ? t('invite.qrRegen') : t('invite.qrShow')}
                </button>
              </div>
            )}
            <p className="text-[10px] text-gray-400 mt-3 text-center">{t('invite.qrHint')}</p>
          </div>
        )}
      </div>
    </div>
  )
}
