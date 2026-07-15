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
- [x] เส้นกราฟ + % เทียบช่วงก่อนหน้า ในการ์ดสถิติ (`Sparkline.tsx`)
- [x] ตัวกรองเดือนใช้ร่วมกัน 4 หน้า (ขาย/ซื้อ/พัสดุ/รายงาน) — `MonthFilter.tsx`
- [x] หน้า Loading วงแหวนหมุนรอบมาสคอต

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
- [x] เชิญสมาชิก — คัดลอกลิงก์ + เพิ่มด้วย LINE UID (`/settings/members/invite`) ⚠️ **ยังใช้งานจริงไม่ได้ — ดู v-next ข้อ 4**
- [x] เปลี่ยนภาษาระบบ ไทย/อังกฤษ (`/settings/language`)
- [x] เปลี่ยนรูปร้าน — เฉพาะ owner (`/settings` การ์ดร้าน)
- [x] ตั้งค่าการแจ้งเตือน — toggle "สต๊อกใกล้หมด" (`/settings/notifications`)
- [x] i18n ทั้งแอป (ไทย/อังกฤษ) — `src/lib/i18n.ts` + `src/store/langStore.ts` (persist localStorage `khaai_lang`)
- [x] หน่วยเงิน `฿` → "บาท" / "Baht" ตามภาษา (`bahtUnit()` ใน `format.ts`)
- [x] ช่องวันที่ทุกฟอร์ม (ขาย/ซื้อ/พัสดุ) default = วันนี้ ย้อนหลังได้ — `DateField.tsx` (แก้ปัญหา iOS โชว์ พ.ศ.)

### ลูกค้า
- [ ] รายการลูกค้า (`/customers`)
- [ ] รายละเอียดลูกค้า + ประวัติซื้อ (`/customers/[id]`)

> **khaai-web** track แยกที่ `khaai-web/goal-target-version.md`

---

## 🎯 Target — เวอร์ชันถัดไป

### 1. แนบสลิปได้ทุกที่ที่มีเงินออก ✅ เสร็จทั้งข้อ
- [x] ~~ค่าส่งพัสดุ (`shipments`) แนบสลิปได้~~ ✅ แนบตอนสร้าง + เพิ่ม/เปลี่ยนในโหมด edit + ดูรูปเต็มในหน้ารายละเอียด
- [x] ~~ค่าใช้จ่าย (`expenses`) แนบสลิปได้~~ ✅ แนบตอนสร้าง + thumbnail กดดูเต็มในลิสต์

> ทำเสร็จ: `uploadSlip()` ใน `src/lib/storage.ts` (pattern `{shop_id}/slips/`) ใช้ร่วมกันทั้งพัสดุ + ค่าใช้จ่าย
> `expenses.slip_url` **มีในสคีมาอยู่แล้ว** ไม่ต้องรัน SQL · `shipments.slip_url` ต้องรัน `add-shipment-slip.sql`
> กับดัก: ถ้า upload สลิปล้มเหลว → **ไม่บันทึก record** (กันเคสสร้างสำเร็จแต่สลิปหายเงียบๆ)

### 2. การ์ดร้านในหน้าตั้งค่า — เปลี่ยนพื้นน้ำเงิน → เทา ✅ เสร็จ
- [x] ~~`/settings` การ์ดชื่อร้าน+รูป เปลี่ยนจาก `bg-[#1877F2]` เป็นโทนเทา/ขาว~~

> **เหตุผล:** พอ owner ใส่รูปร้านที่มีสีน้ำเงิน (ซึ่งเป็นสีแบรนด์ยอดฮิต) รูปจะ **กลืนหายไปกับพื้นหลังการ์ด** จนดูไม่ออกว่ามีรูป
> ทำแล้ว: การ์ด `bg-white` + กรอบรูปมี `ring-gray-200` (กันโลโก้สีอ่อนหายในพื้นขาวด้วย) + ปุ่มกล้องพลิกเป็นวงน้ำเงินไอคอนขาว (เดิมวงขาวจะหายบนพื้นขาว)

### 3. เช็คสถานะพัสดุให้ครบทุกเจ้า + ย้ายตัวกรองเดือนขึ้นบนสุด
- [ ] ผูก tracking API ของขนส่งที่เหลือ (ตอนนี้มีแค่ **Flash**) — Kerry / J&T / ไปรษณีย์ไทย / SPX / Best
- [x] ~~ย้ายตัวกรองเดือนขึ้นบนสุด~~ ✅ ทำแล้ว (เดือน → สถานะ → Flash sync)
- [x] ~~แสดงสินค้าที่อยู่ในพัสดุ~~ ✅ ทำแล้ว — ดึงชื่อสินค้าจากบิลที่ผูก (`sale_id`) มาโชว์บนการ์ด + หน้ารายละเอียด

> ตอนนี้ปุ่ม sync สถานะทำงานเฉพาะ Flash (`syncFlash()` ใน `shipments/page.tsx`) ร้านที่ใช้เจ้าอื่นต้องกดอัปเดตสถานะเองทุกชิ้น
> เรื่องลำดับตัวกรอง: เดือนเป็นตัวกรองที่ **"กว้าง" กว่า** สถานะ — ตัวกรองที่ตัดข้อมูลออกเยอะกว่าควรอยู่ก่อน (ทำแล้ว)
>
> **แสดงสินค้าในพัสดุ — บันทึกกันหลงทางซ้ำ:** เคยลองทำ "ชื่อผู้รับ" ก่อน แต่ `shipments` ไม่มีที่เก็บชื่อผู้รับ
> (`shipments.recipient` ไม่มีจริง — ที่เห็นคือ `CustomerAddress.recipient` คนละตาราง) และชื่อผู้รับก็ไม่ได้กรอกทุกครั้ง
> เปลี่ยนมาโชว์ **ชื่อสินค้า** แทน — ดีกว่าเพราะ **ไม่ต้องกรอกเพิ่ม** ดึงจากบิลที่ผูกอยู่แล้ว (`sale_id → sale_items → products`)
> ไม่ต้องแก้ DB เลย · การ์ดที่ไม่ได้ผูกบิล fallback ไปโชว์เลข tracking เหมือนเดิม

### 4. 🔴 บั๊ก — เชิญสมาชิก ✅ แก้แล้ว (ต้องรัน SQL + เทสใน LINE จริง)
- [x] ~~ลิงก์เชิญ (`/shop/[slug]/join`)~~ ✅ แก้ chicken-and-egg ที่ RLS
- [x] ~~ชื่อไลน์ไม่ขึ้นในหน้าสมาชิก~~ ✅ backfill display_name ทุกครั้งที่ login
- [x] ~~เพิ่มด้วย LINE UID~~ ✅ ที่จริง insert สำเร็จอยู่แล้ว (owner เป็นสมาชิก → policy `FOR ALL` ผ่าน) — ที่ดูพังคือชื่อขึ้น "unnamed" เพราะ display_name เป็น null

> **สรุปสาเหตุจริง (ตรวจโค้ดแล้ว แก้บันทึกที่เดาไว้):**
> - **ลิงก์เชิญพัง = chicken-and-egg** — หน้า join อ่าน `shops` ด้วย RLS `is_shop_member(id)`
>   → คนใหม่ยังไม่ใช่สมาชิก อ่านร้านไม่ได้ → "ไม่พบร้าน" → สมัครไม่ได้ วนไม่จบ
>   แก้: ฟังก์ชัน `shop_public_by_slug()` (security definer) resolve ร้านจาก slug โดยไม่ต้องเป็นสมาชิก → `supabase/fix-invite-join.sql`
> - **owner add-by-UID ไม่ได้พังที่ insert** — policy `"shop members read/write"` เป็น `FOR ALL` → owner (เป็นสมาชิก) insert แถวคนอื่นได้อยู่แล้ว
>   ที่ดูพังคือ 2 เรื่อง: (1) ชื่อขึ้น "unnamed" เพราะไม่ได้ set display_name (2) ไม่มีใครรู้ LINE UID ของตัวเอง → **ลิงก์เชิญคือทางหลัก**
> - **บั๊กแฝง:** หน้า join เดิม insert ไม่เช็ค error + ถ้า verify-line ล้มเหลว (jwt undefined) จะขึ้น "สำเร็จ" ทั้งที่ RLS ปัดตก → แก้ให้ error ออกจริง

### 5. 💰 ระบบสมาชิก + ชำระเงินต่ออายุร้าน
- [ ] แพ็กเกจ / ราคา / รอบบิล (รายเดือน–รายปี)
- [ ] หน้าชำระเงิน + ต่ออายุ
- [ ] บังคับสิทธิ์ตาม plan จริง — ตอนนี้ `shops.plan` มีแค่ `free | pro` แต่ **ไม่มีอะไรบังคับใช้เลย** (แสดงเป็น pill บน dashboard เฉยๆ)
- [ ] จัดการร้านหมดอายุ — `shops.plan_expires_at` มีคอลัมน์อยู่แล้วแต่ไม่มีใครอ่าน

> **ต้องตัดสินใจก่อนเริ่ม:** ทำที่ LIFF หรือที่ `khaai-web`?
> LIFF อยู่ใน LINE in-app browser → ผูก payment gateway ยุ่งและ redirect กลับยาก
> ผมเอนไปทาง **ทำหน้าชำระเงินที่ khaai-web** แล้ว LIFF แค่โชว์สถานะ + ปุ่มลิงก์ออกไป (ใช้ `liff.openWindow()` external)
> **ต้องคิดเรื่องกันโกงด้วย:** การเช็ค plan ต้องอยู่ที่ **RLS / server** ไม่ใช่ที่ UI — ซ่อนปุ่มใน client กันได้แค่คนที่ไม่ตั้งใจ (บทเรียนเดียวกับ `shops-owner-update.sql`)

### 6. 📷 เชิญเพื่อนด้วย QR code ✅ ทำแล้ว (เทสใน LINE จริง + เปิด scan permission)
- [x] ~~หน้าเชิญแสดง QR code~~ ✅ QR **ชั่วคราว หมดอายุ 3 นาที** + นับถอยหลัง + ปุ่มสร้างใหม่ (owner only)
- [x] ~~สแกนแล้วเข้าร้านได้เลย~~ ✅ ปุ่มสแกนที่หน้าเข้าร้าน (`liff.scanCodeV2`, เฉพาะใน LINE) → เด้งเข้า join

> **สถาปัตยกรรม token ชั่วคราว (ไม่ใช้ DB):**
> - `POST /api/invite-token` action `sign` (owner-only, เช็คสิทธิ์ผ่าน JWT+RLS) → คืน `{exp, sig}` โดย `sig = HMAC(slug.exp)` TTL 180 วิ
> - QR encode `https://liff.line.me/{LIFF_ID}/shop/{slug}/join?e=..&s=..`
> - หน้า join action `verify` → ตรวจ sig + exp ก่อน insert · หมดอายุ = state `expired` (ไม่เข้าร่วม)
> - **ลายเซ็นคือหลักฐาน** ไม่ต้อง lookup DB · ปลอม/หมดอายุถูกปัดด้วยคณิต
> ⚠️ **ลิงก์เชิญธรรมดา (ไม่มี token) ยังใช้ได้ = ถาวร** — QR เท่านั้นที่ชั่วคราว ถ้าอยากให้ลิงก์ถาวรหายไปด้วยต้องบังคับ token ทุกทาง (ยังไม่ทำ)
> lib ใหม่: `qrcode` (สร้าง QR เป็น data-URL แบบ offline ไม่พึ่ง CDN)

### 7. 🤖 AI วิเคราะห์ข้อมูลร้าน
- [ ] สรุปภาพรวมร้านเป็นภาษาคน ("เดือนนี้กำไรลด 12% เพราะค่าส่งขึ้น ไม่ใช่ยอดขายตก")
- [ ] เตือนของที่ควรสั่งเพิ่ม / ของที่ค้างสต๊อกนาน
- [ ] ตอบคำถามจากข้อมูลจริง ("สินค้าไหนกำไรดีสุด")

> **ข้อมูลพร้อมแล้ว** — `sale_items.unit_cost` snapshot ทำให้คำนวณกำไรรายสินค้าย้อนหลังได้จริง (ถ้าไม่มีอันนี้ AI จะวิเคราะห์กำไรผิดทั้งหมด)
> **ห้าม** ส่ง API key ไปฝั่ง client เด็ดขาด → ต้องยิงผ่าน **Edge Function / API route** เท่านั้น
> **ห้าม** ให้ AI ตอบตัวเลขจากการเดา → ให้ query ตัวเลขจริงมาก่อนแล้วส่งเป็น context ไม่ใช่ให้มันคำนวณเอง (เลขการเงินผิดไม่ได้)
> เริ่มจาก **สรุปรายเดือน 1 การ์ดบนหน้า reports** ก่อน จะได้ประเมินคุณค่าจริงก่อนลงทุนทำ chat

---

## Database / Infra (ต้องทำก่อน deploy)

- [x] รัน SQL fix ใน Supabase SQL Editor — `current_line_uid()` + `is_shop_member()` + INSERT policies
- [ ] **รัน `supabase/storage-policies.sql`** — ไม่รัน = อัปโหลดรูปสินค้า/สลิปพัง (bucket public คุมแค่ "อ่าน")
- [ ] **รัน `supabase/fix-cogs.sql`** — เพิ่ม `sale_items.unit_cost` + backfill (ไม่รัน = แอปพัง)
- [ ] **รัน `supabase/add-delivery-method.sql`** — เพิ่ม `sales.delivery_method` (ไม่รัน = แอปพัง)
- [ ] **รัน `supabase/shops-owner-update.sql`** — ปิดช่องโหว่: policy เดิมเป็น `FOR ALL` ทำให้ staff แก้ข้อมูลร้านได้
- [ ] **รัน `supabase/add-shipment-slip.sql`** — เพิ่ม `shipments.slip_url` (ไม่รัน = บันทึกพัสดุพัง เพราะโค้ด insert คอลัมน์นี้)
- [ ] **รัน `supabase/fix-invite-join.sql`** — เพิ่มฟังก์ชัน `shop_public_by_slug()` (ไม่รัน = ลิงก์เชิญยังขึ้น "ไม่พบร้าน")
- [ ] แก้ `.env` — `LINE_CHANNEL_SECRET` กับ `LINE_CHANNEL_ACCESS_TOKEN` ค่าเหมือนกัน ทำให้ webhook verify signature ผิดพลาด

> `supabase/reset-shop-data.sql` — ใช้ตอนอยากล้างข้อมูลร้าน (เก็บสมาชิกไว้) ไม่ใช่ขั้นตอน deploy
