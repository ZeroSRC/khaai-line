import dayjs from 'dayjs'
import 'dayjs/locale/th'
import buddhistEra from 'dayjs/plugin/buddhistEra'
import { useLangStore } from '@/store/langStore'

dayjs.extend(buddhistEra)
dayjs.locale('th')

export function formatThaiDate(date: string | Date) {
  return dayjs(date).format('D MMM BBBB')
}

export function formatDateTime(date: string | Date) {
  return dayjs(date).format('D MMM BB HH:mm')
}

/**
 * Label for a YYYY-MM-DD value, following the *app's* language — not the device's.
 * Buddhist era for Thai (matches the rest of the app), Gregorian for English.
 */
export function formatDateLabel(date: string, lang: 'th' | 'en') {
  return lang === 'th'
    ? dayjs(date).locale('th').format('D MMM BBBB')
    : dayjs(date).locale('en').format('D MMM YYYY')
}

export function formatMoney(amount: number) {
  return new Intl.NumberFormat('th-TH', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount)
}

/** The currency word for the active language. */
export function bahtUnit() {
  return useLangStore.getState().lang === 'th' ? 'บาท' : 'Baht'
}

/**
 * "1,234 บาท" / "1,234 Baht".
 * Reads the language from the store rather than taking it as an argument, so the
 * dozens of existing call sites stay unchanged. Every page that renders money also
 * calls useT(), which subscribes to the same store — so they re-render when the
 * language flips and pick up the new unit.
 */
export function formatMoneyFull(amount: number) {
  return `${formatMoney(amount)} ${bahtUnit()}`
}

export function warrantyDaysLeft(endsAt: string): number {
  return Math.max(0, dayjs(endsAt).diff(dayjs(), 'day'))
}
