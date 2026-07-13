'use client'

import type { Liff } from '@line/liff'
import { IS_DEV_AUTH, DEV_LINE_UID, DEV_LINE_NAME } from './devAuth'

let liffInstance: Liff | null = null

/**
 * LIFF ปลอมสำหรับ localhost — logged in ตลอด, ไม่ redirect ไปไหน
 * getAccessToken() คืน token ปลอม เพราะ dev path ไม่ได้เอาไปยิง LINE API
 * (ดู useShopInit → /api/dev-token)
 */
function mockLiff(): Liff {
  return {
    init: async () => {},
    ready: Promise.resolve(),
    isLoggedIn: () => true,
    isInClient: () => false,
    login: () => {},
    logout: () => {},
    getAccessToken: () => 'dev-access-token',
    getProfile: async () => ({
      userId: DEV_LINE_UID,
      displayName: DEV_LINE_NAME,
      pictureUrl: undefined,
      statusMessage: undefined,
    }),
    closeWindow: () => {
      console.info('[dev] liff.closeWindow() — ในเบราว์เซอร์ปกติไม่ทำอะไร')
    },
  } as unknown as Liff
}

export async function initLiff(): Promise<Liff> {
  if (liffInstance) return liffInstance

  if (IS_DEV_AUTH) {
    liffInstance = mockLiff()
    return liffInstance
  }

  const liff = (await import('@line/liff')).default
  await liff.init({ liffId: process.env.NEXT_PUBLIC_LIFF_ID! })
  liffInstance = liff
  return liff
}

export async function getLiffProfile() {
  const liff = await initLiff()
  if (!liff.isLoggedIn()) {
    liff.login()
    // login redirects, so this never resolves
    return new Promise<never>(() => {})
  }
  return liff.getProfile()
}

export async function getLineUid(): Promise<string> {
  const profile = await getLiffProfile()
  return profile.userId
}

export async function closeLiff() {
  const liff = await initLiff()
  liff.closeWindow()
}
