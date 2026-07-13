'use client'

/**
 * Tiny trend line for a stat card. No axes, no labels — it answers "which way is this
 * heading", not "what was Tuesday". Scaled to its own min/max so a flat-but-high series
 * still reads as flat.
 */
export function Sparkline({
  data,
  color,
  className = 'w-full h-7',
  /** Plot `data` across a wider axis than it fills — e.g. 13 days of a 31-day month, so the
   *  line stops where today is instead of stretching to the right edge and faking a full month. */
  axisLength,
}: {
  data: number[]
  color: string
  className?: string
  axisLength?: number
}) {
  if (data.length < 2) return null

  const W = 100
  const H = 28
  const max = Math.max(...data)
  const min = Math.min(...data)
  const span = max - min
  const lastIndex = Math.max((axisLength ?? data.length) - 1, 1)

  const x = (i: number) => (i / lastIndex) * W
  // An all-zero (or flat) series has no range to scale into — park it on the baseline
  // instead of dividing by zero and drawing a line through the middle of nowhere.
  const y = (v: number) => (span === 0 ? H * 0.75 : H - ((v - min) / span) * (H - 4) - 2)

  const line = data.map((v, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ')
  // Close the fill under the LAST PLOTTED point, not the right edge — otherwise a
  // half-finished month gets a fill stretching across days that haven't happened.
  const area = `${line} L${x(data.length - 1).toFixed(1)},${H} L0,${H} Z`
  const gid = `spark-${color.replace('#', '')}`

  return (
    // Size comes entirely from className — merging a default `w-full` with a caller's `w-16`
    // would leave two same-specificity width rules fighting, and the winner is stylesheet order.
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className={className}>
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.18" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${gid})`} />
      <path d={line} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
        vectorEffect="non-scaling-stroke" />
    </svg>
  )
}

/**
 * Percent change badge. Returns null when there is no baseline — you cannot express
 * "0 → 500" as a percentage, and printing "+∞%" or a fake "+100%" would be a lie.
 */
export function DeltaBadge({
  current,
  previous,
  /** For expenses, going UP is bad — flip which direction gets the green. */
  invert = false,
}: {
  current: number
  previous: number
  invert?: boolean
}) {
  if (previous === 0) return null

  const pct = ((current - previous) / previous) * 100
  if (Math.abs(pct) < 0.5) return null

  const up = pct > 0
  const good = invert ? !up : up

  return (
    <span className={`inline-flex items-center gap-0.5 text-[10px] font-bold tabular-nums ${good ? 'text-emerald-600' : 'text-rose-500'}`}>
      <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"
        className={up ? '' : 'rotate-180'}>
        <polyline points="6 15 12 9 18 15" />
      </svg>
      {Math.abs(pct).toFixed(0)}%
    </span>
  )
}
