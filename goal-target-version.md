# Goal & Target Version — Khaai

อัปเดตล่าสุด: 2026-07-13

---

## โครงสร้างโปรเจ็ค

| โปรเจ็ค | หน้าที่ | สถานะ |
|---------|---------|-------|
| `khaai` (repo นี้) | LIFF app ใน LINE | กำลังพัฒนา |
| `khaai-web` | Landing page + Web dashboard | กำลังพัฒนา |

**หมายเหตุ:** `khaai` และ `khaai-web` ใช้ Supabase project เดิมร่วมกัน  
เริ่ม `khaai-web` หลังจาก LIFF ครบ v1 แล้ว

---

## LIFF (LINE in-app browser · `/shop/[shopId]`)

### Auth & UX
- [x] LIFF login + จำร้านล่าสุด (localStorage)
- [x] กด profile picture → popup เปลี่ยนร้านค้า
- [x] iOS auto-zoom fix (maximum-scale=1)
- [x] หน้า Loading อนิเมชันมาสคอต (CSS ล้วน) — `LoadingScreen.tsx`
- [x] หน้าแรกโชว์โลโก้มาสคอต + ตัดลิงก์ "สร้างร้านใหม่" (ย้ายไป khaai-web)

### Navigation & Theme
- [x] เปลี่ยนธีมจากเขียว LINE → น้ำเงินแบรนด์ `#1877F2`
- [x] Bottom nav 4 tabs + FAB กลาง เมนู radial (ขาย/ซื้อ/พัสดุ)
- [x] Active tab เปลี่ยน icon outline → fill (คง stroke ขนาดไม่กระตุก)
- [x] Dashboard redesign — header gradient + `HeaderDecor` (glow orbs / ริบบิ้นแสง / ประกายดาว)
- [x] เมนูด่วน badge ไล่เฉด + สีตรงกับเมนู FAB
- [x] กิจกรรมล่าสุด (รวม 5 ตาราง → กดเข้าหน้ารายการนั้นได้)

### สินค้า
- [x] รายการสินค้า (`/products`) — เข้าจาก bottom nav ได้แล้ว
- [x] เพิ่มสินค้าใหม่ (`/products/new`)
- [x] แก้ไข / toggle แสดง / ลบสินค้า (`/products/[id]`)
- [x] รูปสินค้า — upload + preview + placeholder monogram (`ProductImagePicker` / `ProductThumb`)

### ขาย
- [x] รายการบิล (`/sales`) — โชว์ชื่อสินค้าเป็นหลัก + badge เลขบิล
- [x] บันทึกการขาย + อัปโหลดสลิป (`/sales/new`)
- [x] รายละเอียดบิล (`/sales/[id]`)
- [x] เลือกวิธีรับสินค้า (จัดส่ง / รับเอง) — `sales.delivery_method`
- [x] snapshot ต้นทุนตอนขาย — `sale_items.unit_cost`

### ซื้อ
- [x] รายการซื้อ (`/purchases`) — โชว์ชื่อสินค้าเป็นหลัก + badge เลข PO
- [x] บันทึกซื้อ + อัปโหลดสลิป (`/purchases/new`)
- [x] รายละเอียดการซื้อ (`/purchases/[id]`)
- [x] Supplier picker แสดงโลโก้แบรนด์

### พัสดุ
- [x] รายการพัสดุ (`/shipments`)
- [x] สร้างพัสดุใหม่ (`/shipments/new`) — carrier picker แสดงโลโก้ขนส่ง
- [x] รายละเอียดพัสดุ (`/shipments/[id]`)
- [x] แก้ไข / ลบพัสดุ (เคสพิมพ์เลข tracking ผิด)
- [x] ค่าส่งถูกนับเป็นค่าใช้จ่าย + ลดกำไรของบิลที่ผูกไว้

### ค่าใช้จ่าย
- [x] บันทึกค่าใช้จ่าย (`/expenses/new`)
- [x] รายการค่าใช้จ่าย (`/expenses`)

### รายงาน
- [x] P&L รายเดือน + อัตรากำไร
- [x] กราฟยอดขายรายวัน
- [x] Export CSV (รองรับภาษาไทยใน Excel)
- [x] **แก้บัคกำไร** — ต้นทุนขาย (COGS) คิดจาก `sale_items` ของบิลที่ขายเดือนนั้น ไม่ใช่ยอดซื้อของเดือนนั้น
- [x] แยกการ์ด "ซื้อสินค้าเข้าเดือนนี้" ออกจากการคำนวณกำไร

### ตั้งค่า
- [x] หน้าตั้งค่า hub (`/settings`) — ย้ายเข้า bottom nav แล้ว (เดิมเป็นไอคอนเฟืองบน dashboard)
- [x] สมาชิกร้านค้า — ดูสมาชิก + ปุ่มไปหน้าเชิญ (`/settings/members`)
- [x] เชิญสมาชิก — คัดลอกลิงก์ + เพิ่มด้วย LINE UID (`/settings/members/invite`)
- [x] เปลี่ยนภาษาระบบ ไทย/อังกฤษ (`/settings/language`)
- [x] i18n ทั้งแอป (ไทย/อังกฤษ) — `src/lib/i18n.ts` + `src/store/langStore.ts` (persist localStorage `khaai_lang`)
- [x] หน่วยเงิน `฿` → "บาท" / "Baht" ตามภาษา (`bahtUnit()` ใน `format.ts`)
- [x] ช่องวันที่ทุกฟอร์ม (ขาย/ซื้อ/พัสดุ) default = วันนี้ ย้อนหลังได้ — `DateField.tsx` (แก้ปัญหา iOS โชว์ พ.ศ.)

### ลูกค้า
- [ ] รายการลูกค้า (`/customers`)
- [ ] รายละเอียดลูกค้า + ประวัติซื้อ (`/customers/[id]`)

> **khaai-web** track แยกที่ `khaai-web/goal-target-version.md`

---

## Database / Infra (ต้องทำก่อน deploy)

- [x] รัน SQL fix ใน Supabase SQL Editor — `current_line_uid()` + `is_shop_member()` + INSERT policies
- [ ] **รัน `supabase/storage-policies.sql`** — ไม่รัน = อัปโหลดรูปสินค้า/สลิปพัง (bucket public คุมแค่ "อ่าน")
- [ ] **รัน `supabase/fix-cogs.sql`** — เพิ่ม `sale_items.unit_cost` + backfill (ไม่รัน = แอปพัง)
- [ ] **รัน `supabase/add-delivery-method.sql`** — เพิ่ม `sales.delivery_method` (ไม่รัน = แอปพัง)
- [ ] แก้ `.env` — `LINE_CHANNEL_SECRET` กับ `LINE_CHANNEL_ACCESS_TOKEN` ค่าเหมือนกัน ทำให้ webhook verify signature ผิดพลาด

> `supabase/reset-shop-data.sql` — ใช้ตอนอยากล้างข้อมูลร้าน (เก็บสมาชิกไว้) ไม่ใช่ขั้นตอน deploy
