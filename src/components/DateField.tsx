'use client'

import { formatDateLabel } from '@/lib/format'
import { useLangStore } from '@/store/langStore'

/**
 * Date input that keeps the native OS picker (best touch UX) but renders its own label.
 *
 * A bare <input type="date"> lets the OS draw the text, and iOS draws it using the
 * *device's* regional calendar — so a Thai-region iPhone shows Buddhist years even when
 * the app is switched to English, and the control looks nothing like our other fields.
 * The real <input> is kept but made fully transparent on top of our own markup: taps
 * still open the native picker, while the visible text is ours and follows the app's
 * language. The underlying value stays YYYY-MM-DD either way (per the HTML spec).
 */
export function DateField({
  value,
  onChange,
  max,
  min,
}: {
  value: string
  onChange: (value: string) => void
  max?: string
  min?: string
}) {
  const lang = useLangStore((s) => s.lang)

  return (
    <div className="relative">
      <div className="w-full bg-gray-50 rounded-2xl px-4 py-3 flex items-center justify-between">
        <span className="text-sm font-semibold text-gray-800">
          {value ? formatDateLabel(value, lang) : '—'}
        </span>
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="4" width="18" height="18" rx="2"/>
          <line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
        </svg>
      </div>

      <input
        type="date"
        value={value}
        max={max}
        min={min}
        onChange={(e) => onChange(e.target.value)}
        onClick={(e) => {
          try {
            // บางอุปกรณ์ใน LINE LIFF ต้องใช้ showPicker() เพื่อกระตุ้น
            (e.target as any).showPicker();
          } catch (err) {}
        }}
        className="absolute inset-0 w-full h-full opacity-0 appearance-none cursor-pointer z-10"
      />
    </div>
  )
}
