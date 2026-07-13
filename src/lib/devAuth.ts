/**
 * Dev auth mode — ให้รันแอปบน localhost ได้โดยไม่ต้องผ่าน LINE จริง
 *
 * ทำไมต้องมี: LIFF บังคับ redirect กลับไปที่ Endpoint URL ที่ลงทะเบียนใน LINE Developers
 * (= prod เสมอ) แถม Edge Function `verify-line` ก็เอา access token ไปยิง api.line.me จริง
 * → localhost จึง login ไม่ได้ และไม่มี JWT ให้ RLS ใช้
 *
 * เปิดใช้: ใส่ NEXT_PUBLIC_DEV_LINE_UID ใน .env.local (ใช้ LINE UID จริงของคุณ
 * ที่เป็นสมาชิกร้านอยู่แล้ว ไม่งั้นจะโดน "คุณไม่มีสิทธิ์เข้าถึงร้านนี้")
 *
 * ⚠️ ปิดตัวเองอัตโนมัติเมื่อ NODE_ENV === 'production' — build จริงจะไม่มีทางหลุด
 */
export const DEV_LINE_UID = process.env.NEXT_PUBLIC_DEV_LINE_UID ?? ''
export const DEV_LINE_NAME = process.env.NEXT_PUBLIC_DEV_LINE_NAME || 'Dev User'

export const IS_DEV_AUTH = process.env.NODE_ENV !== 'production' && DEV_LINE_UID !== ''
