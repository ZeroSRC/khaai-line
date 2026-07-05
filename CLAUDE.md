# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Product

**Khaai** (ขาย) — LINE LIFF backoffice SaaS สำหรับร้านค้าขนาดเล็ก  
Multi-tenant: แต่ละร้านมี slug เป็นของตัวเอง → `/shop/[shopId]`

## Commands

```bash
npm run dev          # dev server (localhost:3000)
npm run build        # production build
npm run lint         # ESLint
npm run db:types     # generate TypeScript types from Supabase schema
```

## Architecture

### Multi-tenancy
- tenant = `shop` identified by URL slug (`/shop/[shopId]`)
- ทุก DB table มี `shop_id uuid` และ RLS policy `is_shop_member(shop_id)`
- Auth ไม่ใช้ Supabase Auth — ใช้ LINE `userId` จาก LIFF แทน
- Supabase client ส่ง `x-line-uid` header → RLS function `is_shop_member()` อ่านจาก `current_setting('app.line_uid')`

### LIFF Auth Flow
```
/shop/[shopId]/layout.tsx
  → useShopInit(slug)           # src/hooks/useShop.ts
    → initLiff() + liff.login() # src/lib/liff.ts
    → fetch shop by slug        # shops table
    → check shop_members        # ถ้าไม่มี → error
    → setShop/setMember         # src/store/shopStore.ts (Zustand)
```
ทุกหน้าใต้ `/shop/[shopId]` อ่าน state ผ่าน `useShopStore()` — ไม่ต้อง fetch ซ้ำ

### Database
Schema อยู่ที่ `supabase/schema.sql` — รัน full schema นี้ใน Supabase SQL Editor ครั้งเดียว  
Key tables: `shops`, `shop_members`, `products`, `sales`, `sale_items`, `serial_numbers`, `shipments`, `expenses`

Triggers สำคัญ:
- `trg_warranty_on_delivered` — เมื่อ shipment status → `delivered` จะ set `warranty_starts_at/ends_at` ใน `serial_numbers` อัตโนมัติ
- `trg_deduct_stock_on_sale` — insert `sale_items` → หัก `products.stock` อัตโนมัติ

pg_cron job `refresh-warranty-status` รันทุกเที่ยงคืน UTC เพื่ออัปเดต `warranty_status`

### LINE Bot Webhook
`src/app/api/webhook/route.ts` — รับ POST จาก LINE Platform  
ตรวจ HMAC signature ก่อนทุกครั้ง  
Commands: `/ยอด`, `/stock`, `/ship`  
Webhook URL ที่ต้องตั้งใน LINE Developers: `https://{domain}/api/webhook`

### Supabase Storage
Bucket ชื่อ `slips` (public) — เก็บรูปสลิปโอนเงิน  
Path pattern: `{shop_id}/slips/{timestamp}.{ext}`

## Key Conventions

- `createSupabaseClient(lineUid)` ทุกครั้งที่ query — ส่ง lineUid เพื่อให้ RLS ทำงาน
- ไม่มี `loading` global — แต่ละหน้า manage state เอง
- Bottom nav 5 tabs: หน้าแรก / ขาย / ซื้อ / พัสดุ / รายงาน
- UI width จำกัดที่ 430px (body CSS) — ออกแบบสำหรับ LIFF in-app browser
- ภาษาไทยทั้งหมด ยกเว้น code และ technical terms

## Goal & Progress Tracking

**อ่านทั้งสองไฟล์นี้ก่อนเริ่มงานทุกครั้ง:**

- `goal-target-version.md` — checklist feature ที่ทำแล้ว vs ยังค้างอยู่  
- `docs/user-flow.md` — flow การเดินทางของ user ผ่านทุกหน้า ใช้อ้างอิงว่าหน้าไหนอยู่ตรงไหน เชื่อมกันยังไง

เมื่อ implement feature ใดสำเร็จ:
1. อัปเดต checkbox ใน `goal-target-version.md`
2. อัปเดต flow ที่เกี่ยวข้องใน `docs/user-flow.md`

## Environment Variables

ดูตัวอย่างครบที่ `.env.local.example`  
`NEXT_PUBLIC_*` ใช้ได้ฝั่ง client | ตัวที่ไม่มี prefix ใช้เฉพาะ server (webhook)
