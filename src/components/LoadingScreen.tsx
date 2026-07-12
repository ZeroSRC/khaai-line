'use client'

import { useT } from '@/lib/i18n'

/**
 * Full-screen loading state with the Khaai mascot.
 * Pure CSS animation on the existing PNG — no extra asset or library.
 * Swap the <img> for a Lottie/Rive player later without touching callers.
 */
export function LoadingScreen({ text }: { text?: string }) {
  const t = useT()

  return (
    <div className="flex flex-col items-center justify-center min-h-dvh gap-7 bg-white">
      <div className="flex flex-col items-center">
        <img
          src="/mascot.png"
          alt="Khaai"
          className="mascot-float w-28 h-28 object-contain"
          style={{ animation: 'mascotFloat 1.8s ease-in-out infinite' }}
        />
        <div
          className="mascot-shadow w-16 h-2.5 rounded-full bg-black mt-3 blur-[4px]"
          style={{ animation: 'mascotShadow 1.8s ease-in-out infinite' }}
        />
      </div>

      <div className="flex flex-col items-center gap-3">
        <p className="text-base font-bold text-gray-700">{text ?? t('common.loading')}</p>
        <div className="flex gap-1.5">
          {[0, 1, 2].map((i) => (
            <span key={i}
              className="dot-bounce w-2 h-2 rounded-full bg-[#1877F2]"
              style={{ animation: 'dotBounce 1s ease-in-out infinite', animationDelay: `${i * 0.15}s` }}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
