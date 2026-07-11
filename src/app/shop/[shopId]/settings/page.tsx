'use client'

import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { useShopStore } from '@/store/shopStore'
import { useLangStore } from '@/store/langStore'
import { useT } from '@/lib/i18n'

const BackBtn = ({ onClick }: { onClick: () => void }) => (
  <button onClick={onClick} className="w-9 h-9 rounded-2xl bg-gray-50 flex items-center justify-center text-gray-500 active:bg-gray-100 transition-colors">
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
  </button>
)

const Chevron = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#c7ccd1" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
)

interface Row {
  icon: React.ReactNode
  iconBg: string
  label: string
  desc: string
  value?: string
  onClick?: () => void
  href?: string
}

const MenuRow = ({ icon, iconBg, label, desc, value, onClick, href }: Row) => {
  const inner = (
    <>
      <div className={`w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0 ${iconBg}`}>{icon}</div>
      <div className="flex-1 min-w-0 text-left">
        <p className="text-sm font-semibold text-gray-900">{label}</p>
        <p className="text-xs text-gray-400 mt-0.5 truncate">{desc}</p>
      </div>
      {value && <span className="text-xs font-semibold text-gray-400 mr-1">{value}</span>}
      <Chevron />
    </>
  )
  const cls = 'w-full flex items-center gap-3 px-4 py-3.5 active:bg-gray-50 transition-colors'
  return href ? <Link href={href} className={cls}>{inner}</Link> : <button onClick={onClick} className={cls}>{inner}</button>
}

export default function SettingsPage() {
  const { shopId } = useParams<{ shopId: string }>()
  const router = useRouter()
  const { shop, clear } = useShopStore()
  const lang = useLangStore((s) => s.lang)
  const t = useT()
  const base = `/shop/${shopId}`

  const switchShop = () => {
    localStorage.removeItem('khaai_last_shop')
    clear()
    router.push('/')
  }

  return (
    <div className="pb-10">
      <div className="px-4 pt-8 pb-4 flex items-center gap-3">
        <BackBtn onClick={() => router.back()} />
        <h1 className="text-lg font-bold text-gray-900">{t('settings.title')}</h1>
      </div>

      <div className="px-4 space-y-5">
        {/* Shop info card */}
        {shop && (
          <div className="bg-[#1877F2] rounded-3xl p-5 shadow-[0_8px_24px_rgba(24,119,242,0.25)] flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center text-white text-xl font-bold flex-shrink-0">
              {shop.name?.[0]?.toUpperCase() ?? 'K'}
            </div>
            <div className="min-w-0">
              <p className="text-white font-bold text-base leading-tight truncate">{shop.name}</p>
              <p className="text-white/60 text-xs mt-0.5 truncate">/{shop.slug}</p>
            </div>
          </div>
        )}

        {/* Shop section */}
        <div>
          <p className="text-xs font-bold text-gray-300 tracking-widest uppercase px-1 mb-2">{t('settings.shopSection')}</p>
          <div className="bg-white rounded-3xl shadow-[0_2px_16px_rgba(0,0,0,0.07)] overflow-hidden divide-y divide-gray-50">
            <MenuRow
              href={`${base}/settings/members`}
              iconBg="bg-[#1877F2]/10 text-[#1877F2]"
              icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></svg>}
              label={t('settings.members')}
              desc={t('settings.membersDesc')}
            />
          </div>
        </div>

        {/* General section */}
        <div>
          <p className="text-xs font-bold text-gray-300 tracking-widest uppercase px-1 mb-2">{t('settings.generalSection')}</p>
          <div className="bg-white rounded-3xl shadow-[0_2px_16px_rgba(0,0,0,0.07)] overflow-hidden divide-y divide-gray-50">
            <MenuRow
              href={`${base}/settings/language`}
              iconBg="bg-violet-50 text-violet-500"
              icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"/></svg>}
              label={t('settings.language')}
              desc={t('settings.languageDesc')}
              value={lang === 'th' ? 'ไทย' : 'EN'}
            />
          </div>
        </div>

        {/* Account section */}
        <div>
          <p className="text-xs font-bold text-gray-300 tracking-widest uppercase px-1 mb-2">{t('settings.account')}</p>
          <div className="bg-white rounded-3xl shadow-[0_2px_16px_rgba(0,0,0,0.07)] overflow-hidden">
            <MenuRow
              onClick={switchShop}
              iconBg="bg-gray-100 text-gray-500"
              icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 1l4 4-4 4"/><path d="M3 11V9a4 4 0 014-4h14M7 23l-4-4 4-4"/><path d="M21 13v2a4 4 0 01-4 4H3"/></svg>}
              label={t('settings.switchShop')}
              desc={t('settings.switchShopDesc')}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
