'use client'

/** 4-point sparkle centred on (x,y). */
function star(x: number, y: number, s: number) {
  return `M${x},${y - s} C${x},${y - s * 0.28} ${x + s * 0.28},${y} ${x + s},${y}
          C${x + s * 0.28},${y} ${x},${y + s * 0.28} ${x},${y + s}
          C${x},${y + s * 0.28} ${x - s * 0.28},${y} ${x - s},${y}
          C${x - s * 0.28},${y} ${x},${y - s * 0.28} ${x},${y - s} Z`
}

// x, y, size, animation delay (s)
const SPARKS: [number, number, number, number][] = [
  [312, 34, 5.5, 0],
  [372, 78, 3.5, 0.6],
  [268, 96, 3, 1.2],
  [406, 30, 2.5, 0.3],
  [340, 140, 4, 0.9],
  [232, 46, 2.5, 1.5],
  [396, 158, 3, 0.45],
]

/**
 * Decorative layer for the dashboard header: soft glow orbs, flowing light ribbons,
 * and twinkling sparkles. Purely visual — sits behind the content and eats no taps.
 */
export function HeaderDecor() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      {/* Glow orbs — give the flat gradient some depth */}
      <div className="absolute -top-24 -right-12 w-64 h-64 rounded-full bg-[#7FC0FF]/20 blur-3xl" />
      <div className="absolute top-16 right-0 w-36 h-36 rounded-full bg-white/15 blur-2xl" />
      <div className="absolute -bottom-24 -left-16 w-56 h-56 rounded-full bg-white/[0.07] blur-3xl" />

      {/* Light ribbons */}
      <svg className="absolute inset-0 w-full h-full" viewBox="0 0 430 280" preserveAspectRatio="xMidYMid slice">
        <defs>
          <linearGradient id="hdrRibbonA" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%"   stopColor="#ffffff" stopOpacity="0" />
            <stop offset="45%"  stopColor="#ffffff" stopOpacity="0.55" />
            <stop offset="100%" stopColor="#9CCBFF" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="hdrRibbonB" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%"   stopColor="#BBDBFF" stopOpacity="0" />
            <stop offset="50%"  stopColor="#BBDBFF" stopOpacity="0.45" />
            <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
          </linearGradient>
          <filter id="hdrSoft" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3.5" />
          </filter>
        </defs>

        <g filter="url(#hdrSoft)" fill="none" strokeLinecap="round">
          <path d="M210 -30 C 300 40, 250 118, 400 88"  stroke="url(#hdrRibbonA)" strokeWidth="2.5" />
          <path d="M245 -20 C 342 58, 286 152, 445 128" stroke="url(#hdrRibbonA)" strokeWidth="4.5" />
          <path d="M272 4   C 384 72, 322 172, 452 168" stroke="url(#hdrRibbonB)" strokeWidth="2" />
          <path d="M178 -12 C 262 92, 332 58, 436 204"  stroke="url(#hdrRibbonB)" strokeWidth="1.5" />
        </g>

        {/* Sparkles */}
        <g fill="#ffffff">
          {SPARKS.map(([x, y, s, delay], i) => (
            <path
              key={i}
              d={star(x, y, s)}
              className="twinkle"
              style={{
                animation: 'twinkle 2.6s ease-in-out infinite',
                animationDelay: `${delay}s`,
                transformOrigin: `${x}px ${y}px`,
              }}
            />
          ))}
        </g>
      </svg>
    </div>
  )
}
