'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import clsx from 'clsx'
import { useT, type TKey } from '@/lib/i18n'

const ICONS: Record<string, JSX.Element> = {
  home: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9.5L12 3l9 6.5V20a1 1 0 01-1 1H4a1 1 0 01-1-1V9.5z"/>
      <path d="M9 21V12h6v9"/>
    </svg>
  ),
  products: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z"/>
      <line x1="7" y1="7" x2="7.01" y2="7"/>
    </svg>
  ),
  reports: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 20V10M12 20V4M6 20v-6"/>
    </svg>
  ),
  settings: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3"/>
      <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.6 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.6a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/>
    </svg>
  ),
  sales: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20M6 15h4M14 15h4"/>
    </svg>
  ),
  purchases: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 002 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/>
      <path d="M3.27 6.96L12 12.01l8.73-5.05M12 22.08V12"/>
    </svg>
  ),
  shipments: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 3h15v13H1zM16 8h4l3 3v5h-7V8z"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/>
    </svg>
  ),
}

type Tab = { key: TKey; icon: string; href: string }

const LEFT_TABS: Tab[] = [
  { key: 'nav.home',     icon: 'home',     href: '' },
  { key: 'nav.products', icon: 'products', href: '/products' },
]
const RIGHT_TABS: Tab[] = [
  { key: 'nav.reports',  icon: 'reports',  href: '/reports' },
  { key: 'nav.settings', icon: 'settings', href: '/settings' },
]
const FAB_ACTIONS: { key: TKey; icon: string; href: string; badge: string }[] = [
  { key: 'nav.sales',     icon: 'sales',     href: '/sales',     badge: 'bg-[#1877F2] shadow-[0_4px_12px_rgba(24,119,242,0.4)]' },
  { key: 'nav.purchases', icon: 'purchases', href: '/purchases', badge: 'bg-blue-500 shadow-[0_4px_12px_rgba(59,130,246,0.4)]' },
  { key: 'nav.shipments', icon: 'shipments', href: '/shipments', badge: 'bg-orange-500 shadow-[0_4px_12px_rgba(249,115,22,0.4)]' },
]

export function BottomNav({ shopId }: { shopId: string }) {
  const pathname = usePathname()
  const t = useT()
  const [open, setOpen] = useState(false)
  const base = `/shop/${shopId}`

  const active = (href: string) =>
    href === '' ? pathname === base || pathname === base + '/' : pathname.startsWith(base + href)
  const fabActive = FAB_ACTIONS.some((a) => pathname.startsWith(base + a.href))

  const TabLink = ({ tab }: { tab: Tab }) => {
    const on = active(tab.href)
    return (
      <Link href={`${base}${tab.href}`} onClick={() => setOpen(false)}
        className="flex-1 flex flex-col items-center gap-0.5 py-2">
        <span className={clsx('p-1.5 rounded-xl transition-colors', on ? 'bg-[#1877F2]/10 text-[#1877F2]' : 'text-gray-400')}>
          {ICONS[tab.icon]}
        </span>
        <span className={clsx('text-[10px] leading-none tracking-wide transition-colors', on ? 'text-[#1877F2] font-semibold' : 'text-gray-400 font-medium')}>
          {t(tab.key)}
        </span>
      </Link>
    )
  }

  return (
    <>
      {/* Backdrop */}
      {open && <div className="fixed inset-0 z-40 bg-black/5" onClick={() => setOpen(false)} />}

      {/* Action popup */}
      {open && (
        <div className="fixed left-0 right-0 bottom-28 z-50 flex flex-col items-center gap-2.5 pointer-events-none">
          {FAB_ACTIONS.map((a, i) => (
            <Link key={a.href} href={`${base}${a.href}`} onClick={() => setOpen(false)}
              className="pointer-events-auto flex items-center gap-3 bg-white rounded-full pl-2 pr-5 py-2 shadow-[0_6px_24px_rgba(0,0,0,0.16)] active:scale-95 transition-transform"
              style={{ animation: 'fabPop 0.18s ease-out backwards', animationDelay: `${(FAB_ACTIONS.length - 1 - i) * 45}ms` }}>
              <span className={clsx('w-9 h-9 rounded-full flex items-center justify-center text-white', a.badge)}>
                {ICONS[a.icon]}
              </span>
              <span className="text-sm font-bold text-gray-800">{t(a.key)}</span>
            </Link>
          ))}
        </div>
      )}

      {/* Nav bar */}
      <nav className="fixed bottom-3 left-3 right-3 max-w-[424px] mx-auto bg-white rounded-[28px] flex items-center shadow-[0_8px_32px_rgba(0,0,0,0.10)] px-1 py-1 z-50">
        {LEFT_TABS.map((tab) => <TabLink key={tab.href} tab={tab} />)}

        {/* Center FAB */}
        <div className="flex-1 flex justify-center">
          <button onClick={() => setOpen((v) => !v)} aria-label="เมนู"
            className={clsx(
              'w-14 h-14 -translate-y-5 rounded-full flex items-center justify-center text-white bg-[#1877F2] ring-4 ring-white transition-all active:scale-90',
              open ? 'shadow-[0_8px_24px_rgba(24,119,242,0.55)]' : 'shadow-[0_6px_20px_rgba(24,119,242,0.45)]',
              fabActive && !open && 'ring-[#1877F2]/15'
            )}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
              className="transition-transform duration-200" style={{ transform: open ? 'rotate(45deg)' : 'none' }}>
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
          </button>
        </div>

        {RIGHT_TABS.map((tab) => <TabLink key={tab.href} tab={tab} />)}
      </nav>
    </>
  )
}
