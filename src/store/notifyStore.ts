import { create } from 'zustand'
import { persist } from 'zustand/middleware'

/**
 * Notification preferences. Client-side only for now — these control which alerts
 * the dashboard surfaces, not LINE push messages. When push lands, this shape moves
 * to a `shop_members.notify_*` column so it follows the user across devices.
 */
interface NotifyState {
  lowStock: boolean
  setLowStock: (on: boolean) => void
}

export const useNotifyStore = create<NotifyState>()(
  persist(
    (set) => ({
      lowStock: true, // on by default — an alert nobody asked to hide is one they still need
      setLowStock: (lowStock) => set({ lowStock }),
    }),
    { name: 'khaai_notify' },
  ),
)
