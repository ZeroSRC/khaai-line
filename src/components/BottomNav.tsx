'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import clsx from 'clsx'

const ICONS = {
  home: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9.5L12 3l9 6.5V20a1 1 0 01-1 1H4a1 1 0 01-1-1V9.5z"/>
      <path d="M9 21V12h6v9"/>
    </svg>
  ),
  sales: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="5" width="20" height="14" rx="2"/>
      <path d="M2 10h20"/>
      <path d="M6 15h4M14 15h4"/>
    </svg>
  ),
  purchases: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16.5 9.4L7.55 4.24"/>
      <path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 002 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/>
      <path d="M3.27 6.96L12 12.01l8.73-5.05M12 22.08V12"/>
    </svg>
  ),
  shipments: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 3h15v13H1zM16 8h4l3 3v5h-7V8z"/>
      <circle cx="5.5" cy="18.5" r="2.5"/>
      <circle cx="18.5" cy="18.5" r="2.5"/>
    </svg>
  ),
  reports: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 20V10M12 20V4M6 20v-6"/>
    </svg>
  ),
}

const TABS = [
  { label: 'หน้าแรก', icon: ICONS.home,      href: '' },
  { label: 'ขาย',     icon: ICONS.sales,     href: '/sales' },
  { label: 'ซื้อ',    icon: ICONS.purchases, href: '/purchases' },
  { label: 'พัสดุ',   icon: ICONS.shipments, href: '/shipments' },
  { label: 'รายงาน',  icon: ICONS.reports,   href: '/reports' },
]

export function BottomNav({ shopId }: { shopId: string }) {
  const pathname = usePathname()
  const base = `/shop/${shopId}`

  return (
    <nav className="fixed bottom-3 left-3 right-3 max-w-[424px] mx-auto bg-white rounded-[28px] flex shadow-[0_8px_32px_rgba(0,0,0,0.10)] px-1 py-1 z-50">
      {TABS.map((tab) => {
        const href = `${base}${tab.href}`
        const active =
          tab.href === ''
            ? pathname === base || pathname === base + '/'
            : pathname.startsWith(href)

        return (
          <Link
            key={tab.href}
            href={href}
            className="flex-1 flex flex-col items-center gap-0.5 py-2 transition-colors"
          >
            <span className={clsx(
              'p-1.5 rounded-xl transition-colors',
              active ? 'bg-[#06C755]/10 text-[#06C755]' : 'text-gray-400'
            )}>
              {tab.icon}
            </span>
            <span className={clsx(
              'text-[10px] leading-none tracking-wide transition-colors',
              active ? 'text-[#06C755] font-semibold' : 'text-gray-400 font-medium'
            )}>
              {tab.label}
            </span>
          </Link>
        )
      })}
    </nav>
  )
}
