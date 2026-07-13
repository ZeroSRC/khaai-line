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
- Bottom nav 4 tabs + FAB กลาง: หน้าแรก / สินค้า / **(+)** / รายงาน / ตั้งค่า  
  FAB กางเมนู radial → ขาย / ซื้อ / พัสดุ
- UI width จำกัดที่ 430px (body CSS) — ออกแบบสำหรับ LIFF in-app browser
- ภาษาไทยทั้งหมด ยกเว้น code และ technical terms
- ข้อความ UI ทุกคำผ่าน `useT()` + `src/lib/i18n.ts` — ห้าม hardcode string ลงหน้า
- หน่วยเงินใช้ `formatMoneyFull()` / `bahtUnit()` จาก `src/lib/format.ts` — ห้ามใช้ `฿`

## Goal & Progress Tracking

**อ่านทั้งสองไฟล์นี้ก่อนเริ่มงานทุกครั้ง:**

- `goal-target-version.md` — checklist feature ที่ทำแล้ว vs ยังค้างอยู่  
- `docs/user-flow.md` — flow การเดินทางของ user ผ่านทุกหน้า ใช้อ้างอิงว่าหน้าไหนอยู่ตรงไหน เชื่อมกันยังไง

### 🔴 กฏบังคับ: แก้ logic → ต้องอัปเดต `docs/user-flow.md` เสมอ

**ห้ามจบงานโดยไม่แตะ `docs/user-flow.md` ถ้างานนั้นเข้าข่ายข้อใดข้อหนึ่ง:**

- เพิ่ม / ลบ / เปลี่ยน path ของหน้า
- เปลี่ยน navigation (nav, FAB, ปุ่มที่ลิงก์ไปหน้าอื่น, redirect หลังบันทึก)
- เปลี่ยนขั้นตอนในฟอร์ม (เพิ่มช่อง, เปลี่ยนลำดับ, เพิ่มเงื่อนไข)
- เปลี่ยน**สูตรคำนวณ** (กำไร, ต้นทุน, ยอดรวม, สต็อก)
- เปลี่ยน DB schema / trigger / RLS ที่กระทบ flow
- เปลี่ยนเงื่อนไขว่าข้อมูลไหน "โผล่" หรือ "หาย" จากที่ไหน (เช่น filter ของ picker)

> UI ล้วน (สี, spacing, animation) **ไม่ต้อง** อัปเดต flow — ยกเว้นมันเปลี่ยนวิธีที่ user เดินทาง

### เขียน user-flow ยังไง

ไม่ใช่แค่บรรยายว่าหน้าไหนไปหน้าไหน แต่ต้อง **บันทึกกับดักและเหตุผลของการตัดสินใจ** ไว้ด้วย
เพื่อไม่ให้คนอ่านทีหลัง (รวมถึงตัวเราเอง) เผลอแก้กลับไปเป็นบัคเดิม เช่น:

- ทำไม `sale_items.unit_cost` ต้อง snapshot (trigger ตอนซื้อเขียนทับ `products.cost_price`)
- ทำไม COGS ≠ ยอดซื้อของเดือนนั้น (พร้อมตัวเลขตัวอย่างของบัคเดิม)
- ทำไมค่าส่งใช้วิธี sum จาก `shipments` แทนสร้างแถวใน `expenses`

**เมื่อ implement feature ใดสำเร็จ:**
1. อัปเดต checkbox ใน `goal-target-version.md` (+ วันที่ "อัปเดตล่าสุด")
2. อัปเดต flow ที่เกี่ยวข้องใน `docs/user-flow.md`
3. ถ้าเพิ่ม SQL ที่ต้องรันมือ → เพิ่มลงตาราง SQL ในทั้งสองไฟล์

## Environment Variables

ดูตัวอย่างครบที่ `.env.local.example`  
`NEXT_PUBLIC_*` ใช้ได้ฝั่ง client | ตัวที่ไม่มี prefix ใช้เฉพาะ server (webhook)
