'use client'

/**
 * Full-screen loading state: the Khaai mascot with a progress ring orbiting it.
 * Pure CSS/SVG on the existing PNG — no extra library.
 *
 * `text` is opt-in. The plain spinner needs no "loading…" caption — the ring already
 * says that. Pass text only when the wait means something specific (e.g. "joining shop").
 */
export function LoadingScreen({ text }: { text?: string }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-dvh gap-6 bg-white">
      <div className="relative w-24 h-24">
        {/* Ring — sits outside the mascot so it never covers the face */}
        <svg className="spin-ring absolute inset-0 w-full h-full" viewBox="0 0 100 100">
          <defs>
            <linearGradient id="ringGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%"   stopColor="#5AA4FF" />
              <stop offset="100%" stopColor="#1877F2" />
            </linearGradient>
          </defs>
          {/* Track: a full faint circle, so the gap the arc leaves still reads as a ring */}
          <circle cx="50" cy="50" r="46" fill="none" stroke="#1877F2" strokeOpacity="0.1" strokeWidth="4.5" />
          {/* Arc: ~30% of the circumference (2πr ≈ 289) */}
          <circle
            cx="50" cy="50" r="46" fill="none"
            stroke="url(#ringGrad)" strokeWidth="4.5" strokeLinecap="round"
            strokeDasharray="87 202"
          />
        </svg>

        {/* Mascot — cropped to a circle inside the ring */}
        <div className="absolute inset-[9px] rounded-full overflow-hidden shadow-[0_6px_18px_rgba(24,119,242,0.22)]">
          <img src="/mascot-face.png" alt="Khaai" className="w-full h-full object-cover" />
        </div>
      </div>

      {text && <p className="text-sm font-bold text-gray-500">{text}</p>}
    </div>
  )
}
