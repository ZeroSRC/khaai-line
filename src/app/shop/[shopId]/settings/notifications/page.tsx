'use client'

import { useRouter } from 'next/navigation'
import { useNotifyStore } from '@/store/notifyStore'
import { useT } from '@/lib/i18n'

const BackBtn = ({ onClick }: { onClick: () => void }) => (
  <button onClick={onClick} className="w-9 h-9 rounded-2xl bg-gray-50 flex items-center justify-center text-gray-500 active:bg-gray-100 transition-colors">
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
  </button>
)

/** Visual only — the row it lives in is the actual switch, so this must not be a <button>
 *  (nesting one inside another is invalid HTML and breaks the tap target). */
function Toggle({ on }: { on: boolean }) {
  return (
    <span className={`w-12 h-7 rounded-full flex-shrink-0 p-0.5 block transition-colors ${on ? 'bg-[#1877F2]' : 'bg-gray-200'}`}>
      <span className={`block w-6 h-6 rounded-full bg-white shadow-[0_1px_3px_rgba(0,0,0,0.2)] transition-transform ${on ? 'translate-x-5' : 'translate-x-0'}`} />
    </span>
  )
}

export default function NotificationsPage() {
  const router = useRouter()
  const t = useT()
  const { lowStock, setLowStock } = useNotifyStore()

  return (
    <div className="pb-10">
      <div className="px-4 pt-8 pb-4 flex items-center gap-3">
        <BackBtn onClick={() => router.back()} />
        <h1 className="text-lg font-bold text-gray-900">{t('notify.title')}</h1>
      </div>

      <div className="px-4">
        <p className="text-xs font-bold text-gray-300 tracking-widest uppercase px-1 mb-2">{t('notify.section')}</p>

        <div className="bg-white rounded-3xl shadow-[0_2px_16px_rgba(0,0,0,0.07)] overflow-hidden">
          {/* The whole row is the switch — the 48px toggle alone is a small tap target */}
          <button
            role="switch"
            aria-checked={lowStock}
            onClick={() => setLowStock(!lowStock)}
            className="w-full flex items-center gap-3 px-4 py-3.5 text-left active:bg-gray-50 transition-colors">
            <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-500 flex items-center justify-center flex-shrink-0">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-900">{t('notify.lowStock')}</p>
              <p className="text-xs text-gray-400 mt-0.5">{t('notify.lowStockDesc')}</p>
            </div>
            <Toggle on={lowStock} />
          </button>
        </div>

        <p className="text-[11px] text-gray-400 text-center mt-4 px-4">{t('notify.hint')}</p>
      </div>
    </div>
  )
}
