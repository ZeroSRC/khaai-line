'use client'

// Tinted bg + saturated text, drawn from the app's existing accent hues.
const PALETTE = [
  'bg-[#1877F2]/10 text-[#1877F2]',
  'bg-indigo-50 text-indigo-500',
  'bg-violet-50 text-violet-500',
  'bg-teal-50 text-teal-600',
  'bg-amber-50 text-amber-600',
  'bg-rose-50 text-rose-500',
  'bg-emerald-50 text-emerald-600',
  'bg-orange-50 text-orange-500',
]

/** Hash the name so a product always gets the same colour, instead of a random
 *  one that changes on every render or a single grey that makes items look identical. */
function tint(seed: string) {
  let h = 0
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0
  return PALETTE[h % PALETTE.length]
}

/**
 * Product thumbnail. Falls back to a coloured monogram when there is no image —
 * reads as a deliberate placeholder rather than a broken/missing one.
 */
export function ProductThumb({
  name,
  imageUrl,
  size = 'md',
}: {
  name: string
  imageUrl?: string | null
  size?: 'sm' | 'md'
}) {
  const box = size === 'sm'
    ? 'w-10 h-10 rounded-xl text-sm'
    : 'w-12 h-12 rounded-2xl text-lg'

  if (imageUrl) {
    return (
      <div className={`${box} bg-gray-100 overflow-hidden flex-shrink-0`}>
        <img src={imageUrl} alt="" className="w-full h-full object-cover" />
      </div>
    )
  }

  const initial = name.trim().charAt(0).toUpperCase() || '?'

  return (
    <div className={`${box} ${tint(name)} flex items-center justify-center flex-shrink-0 font-bold select-none`}>
      {initial}
    </div>
  )
}
