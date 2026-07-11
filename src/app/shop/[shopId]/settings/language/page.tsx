'use client'

import { useRouter } from 'next/navigation'
import { useLangStore, type Lang } from '@/store/langStore'
import { useT } from '@/lib/i18n'

const BackBtn = ({ onClick }: { onClick: () => void }) => (
  <button onClick={onClick} className="w-9 h-9 rounded-2xl bg-gray-50 flex items-center justify-center text-gray-500 active:bg-gray-100 transition-colors">
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
  </button>
)

const Check = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#1877F2" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
)

export default function LanguagePage() {
  const router = useRouter()
  const { lang, setLang } = useLangStore()
  const t = useT()

  const options: { value: Lang; flag: string; label: string; sub: string }[] = [
    { value: 'th', flag: '🇹🇭', label: t('language.th'), sub: t('language.thSub') },
    { value: 'en', flag: '🇬🇧', label: t('language.en'), sub: t('language.enSub') },
  ]

  return (
    <div className="pb-10">
      <div className="px-4 pt-12 pb-4 flex items-center gap-3">
        <BackBtn onClick={() => router.back()} />
        <h1 className="text-lg font-bold text-gray-900">{t('language.title')}</h1>
      </div>

      <div className="px-4 space-y-3">
        <p className="text-xs text-gray-400 px-1">{t('language.subtitle')}</p>
        <div className="bg-white rounded-3xl shadow-[0_2px_16px_rgba(0,0,0,0.07)] overflow-hidden divide-y divide-gray-50">
          {options.map((o) => {
            const active = lang === o.value
            return (
              <button key={o.value} onClick={() => setLang(o.value)}
                className="w-full flex items-center gap-3 px-4 py-4 active:bg-gray-50 transition-colors">
                <div className="w-11 h-11 rounded-2xl bg-gray-50 flex items-center justify-center text-2xl flex-shrink-0">{o.flag}</div>
                <div className="flex-1 min-w-0 text-left">
                  <p className={`text-sm font-semibold ${active ? 'text-[#1877F2]' : 'text-gray-900'}`}>{o.label}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{o.sub}</p>
                </div>
                {active && <Check />}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
