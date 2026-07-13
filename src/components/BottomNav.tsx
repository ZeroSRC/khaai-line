'use client'

import { useEffect, useRef, useState } from 'react'
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

// Active variants: same path data + stroke as the outline icons, just filled in.
// Reusing the exact geometry keeps the optical size identical when a tab lights up —
// swapping in a different solid icon set makes the icon visibly shrink.
// Inner details are painted white so they read as cut-outs against the white nav bar.
const ICONS_FILLED: Record<string, JSX.Element> = {
  home: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9.5L12 3l9 6.5V20a1 1 0 01-1 1H4a1 1 0 01-1-1V9.5z"/>
      <path d="M9 21V12h6v9" fill="white" stroke="white"/>
    </svg>
  ),
  products: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z"/>
      <line x1="7" y1="7" x2="7.01" y2="7" stroke="white" strokeWidth="2.6"/>
    </svg>
  ),
  reports: (
    // Bars are strokes with no area to fill, so weight is the "filled" cue.
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 20V10M12 20V4M6 20v-6"/>
    </svg>
  ),
  settings: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.6 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.6a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/>
      <circle cx="12" cy="12" r="3" fill="white" stroke="white"/>
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
// Radial offsets (dx, dy) fan the 3 actions in an arc above the centre FAB.
// Badge colours/gradients are kept identical to the dashboard quick menu — the two
// surfaces offer the same actions, so they must read as the same colour system.
const FAB_ACTIONS: { key: TKey; icon: string; href: string; badge: string; dx: number; dy: number }[] = [
  { key: 'nav.sales',     icon: 'sales',     href: '/sales',     badge: 'bg-gradient-to-br from-[#5AA4FF] to-[#1877F2] shadow-[0_6px_16px_rgba(24,119,242,0.45)]', dx: -74, dy: -58 },
  { key: 'nav.purchases', icon: 'purchases', href: '/purchases', badge: 'bg-gradient-to-br from-[#8B92F8] to-[#4F46E5] shadow-[0_6px_16px_rgba(79,70,229,0.45)]',  dx: 0,   dy: -94 },
  { key: 'nav.shipments', icon: 'shipments', href: '/shipments', badge: 'bg-gradient-to-br from-[#FDBA74] to-[#F97316] shadow-[0_6px_16px_rgba(249,115,22,0.45)]', dx: 74,  dy: -58 },
]

export function BottomNav({ shopId }: { shopId: string }) {
  const pathname = usePathname()
  const t = useT()
  const [open, setOpen] = useState(false)
  const fabRef = useRef<HTMLDivElement>(null)
  const base = `/shop/${shopId}`

  // The backdrop alone can't catch everything: the nav bar sits ABOVE it (z-50 vs z-40), so
  // tapping the bar's empty space would leave the menu hanging open. Watch the document
  // instead and close on anything outside the FAB cluster — plus scroll and Escape.
  useEffect(() => {
    if (!open) return

    const onPointerDown = (e: PointerEvent) => {
      if (!fabRef.current?.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    const close = () => setOpen(false)

    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKey)
    window.addEventListener('scroll', close, { passive: true })

    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKey)
      window.removeEventListener('scroll', close)
    }
  }, [open])

  const active = (href: string) =>
    href === '' ? pathname === base || pathname === base + '/' : pathname.startsWith(base + href)
  const fabActive = FAB_ACTIONS.some((a) => pathname.startsWith(base + a.href))

  const TabLink = ({ tab }: { tab: Tab }) => {
    const on = active(tab.href)
    return (
      <Link href={`${base}${tab.href}`} onClick={() => setOpen(false)}
        className="flex-1 flex flex-col items-center gap-0.5 py-2">
        <span className={clsx('p-1.5 transition-colors', on ? 'text-[#1877F2]' : 'text-gray-400')}>
          {on ? ICONS_FILLED[tab.icon] : ICONS[tab.icon]}
        </span>
        <span className={clsx('text-[10px] leading-none tracking-wide transition-colors', on ? 'text-[#1877F2] font-semibold' : 'text-gray-400 font-medium')}>
          {t(tab.key)}
        </span>
      </Link>
    )
  }

  return (
    <>
      {/* Backdrop — dims the page. Closing is handled by the document listener above so that
          taps on the nav bar (which paints above this) close the menu too. */}
      {open && <div className="fixed inset-0 z-40 bg-black/5" />}

      {/* Nav bar */}
      <nav className="fixed bottom-3 left-3 right-3 max-w-[424px] mx-auto bg-white rounded-[28px] flex items-center shadow-[0_8px_32px_rgba(0,0,0,0.10)] px-1 py-1 z-50">
        {LEFT_TABS.map((tab) => <TabLink key={tab.href} tab={tab} />)}

        {/* Center FAB + radial action menu */}
        <div className="flex-1 flex justify-center">
          <div ref={fabRef} className="relative">
            {open && FAB_ACTIONS.map((a) => (
              <div key={a.href}
                className="absolute left-1/2 top-1/2 z-50"
                style={{ transform: `translate(-50%, -50%) translate(${a.dx}px, ${a.dy - 20}px)` }}>
                <Link href={`${base}${a.href}`} onClick={() => setOpen(false)}
                  className="flex flex-col items-center gap-1 active:scale-95 transition-transform"
                  style={{ animation: 'fabPop 0.16s ease-out backwards' }}>
                  <span className={clsx('w-14 h-14 rounded-full flex items-center justify-center text-white', a.badge)}>
                    {ICONS[a.icon]}
                  </span>
                  <span className="text-[11px] font-bold text-gray-700 bg-white/95 px-2 py-0.5 rounded-full shadow-[0_2px_6px_rgba(0,0,0,0.1)] whitespace-nowrap">
                    {t(a.key)}
                  </span>
                </Link>
              </div>
            ))}

            <button onClick={() => setOpen((v) => !v)} aria-label="เมนู"
              className={clsx(
                'relative w-14 h-14 -translate-y-5 rounded-full flex items-center justify-center text-white bg-[#1877F2] ring-4 ring-white transition-all active:scale-90',
                open ? 'shadow-[0_8px_24px_rgba(24,119,242,0.55)]' : 'shadow-[0_6px_20px_rgba(24,119,242,0.45)]',
                fabActive && !open && 'ring-[#1877F2]/15'
              )}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                className="transition-transform duration-200" style={{ transform: open ? 'rotate(45deg)' : 'none' }}>
                <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
            </button>
          </div>
        </div>

        {RIGHT_TABS.map((tab) => <TabLink key={tab.href} tab={tab} />)}
      </nav>
    </>
  )
}
