# Khaai — User Flow Library

เอกสารนี้อธิบาย flow การเดินทางของ user ผ่านทุกหน้าในแอพ
อัปเดตทุกครั้งที่เพิ่มหน้าใหม่หรือเปลี่ยน navigation

อัปเดตล่าสุด: 2026-07-13

---

## ภาพรวม Navigation

```
LINE LIFF
    │
    ▼
/ (root)  ── LoadingScreen (มาสคอตลอย) ระหว่าง initLiff()
    │── มี khaai_last_shop ใน localStorage ──► /shop/[slug]
    │
    └── ไม่มี ──► กรอก slug ──► /shop/[slug]
                                      │
                          layout.tsx ──► useShopInit(slug)
                                      │── เป็น member ──► โหลด Dashboard
                                      └── ไม่ใช่ member ──► Error / /join
```

> ⚠️ **แก้ไข 2026-07-19:** หน้านี้เคยเขียนไว้ว่า "ไม่มีลิงก์สร้างร้านใหม่แล้ว" — **ไม่จริง** `/register` ยังอยู่
> และหน้าแรกยังลิงก์ไปหาอยู่ ("ยังไม่มีร้าน? คลิกสร้างร้านใหม่ที่นี่") ผู้ใช้แค่**วางแผน**จะปิดฝั่ง LIFF ทีหลัง
> หลังจาก `khaai-web` (`/dashboard/new`) ใช้งานได้เต็มที่แล้ว — ยังไม่ได้ทำจริง ห้ามลบ `/register` จนกว่าจะบอกชัดเจน

### Bottom Navigation — 4 tabs + FAB กลาง

```
 หน้าแรก    สินค้า      (+)      รายงาน    ตั้งค่า
    🏠         🏷️        ⊕          📊        ⚙️
                         │
                  กด FAB ──► เมนู radial กางเป็นวงรอบปุ่ม
                         │
                    ┌────┴────┐
              🧾 ขาย   📦 ซื้อ   🚚 พัสดุ
              (ฟ้า)   (indigo)  (ส้ม)
```

- tab ที่ active จะเปลี่ยน icon จาก **outline → fill** (ใช้ path เดียวกัน เพิ่ม `fill` แต่คง `stroke` ไว้ ขนาดจึงไม่กระตุก)
- FAB active เมื่ออยู่ในหน้า `/sales`, `/purchases`, `/shipments`
- สีของเมนู FAB = สีเดียวกับ **เมนูด่วนบน Dashboard** เป๊ะๆ (ทั้งสองที่ให้ action เดียวกัน ต้องอ่านเป็นระบบสีเดียวกัน)

---

## 1. Entry Flow

### 1a. ครั้งแรก (ไม่มีร้านในหน่วยความจำ)

```
เปิด LIFF URL
    │
    ▼
/ ── initLiff() ── LINE login (ถ้ายังไม่ได้ login)
    │
    ▼
แสดงโลโก้มาสคอต + ฟอร์มกรอก slug ร้านค้า
    │
    ▼ กรอก slug แล้วกด "เข้าร้านค้า"
    │
    ▼
/shop/[slug] ── useShopInit()
    │── ✅ เป็น member ──► บันทึก slug ใน localStorage ──► Dashboard
    └── ❌ ไม่ใช่ member ──► แสดง error
```

### 1b. กลับมาซ้ำ (มีร้านในหน่วยความจำ)

```
เปิด LIFF URL ──► ดึง khaai_last_shop ──► redirect /shop/[slug] อัตโนมัติ
```

### 1c. เข้าจากลิงก์เชิญ

```
/shop/[slug]/join
    │ LIFF login → verify-line → JWT (ถ้าไม่ได้ JWT = error ไม่ปล่อยผ่าน)
    │ resolve ร้าน: rpc('shop_public_by_slug', slug)  ⚠️ ไม่ใช่ select shops ตรงๆ
    │ เช็คว่าเป็นสมาชิกอยู่แล้วไหม (pre-check ผ่าน RLS — แค่ optimization ไม่ใช่ความจริงสุดท้าย)
    ▼ INSERT shop_members (line_uid = ตัวเอง, display_name จาก LINE, role='staff')
    │   ⚠️ insert ชน unique index (23505) → ถือว่า "เป็นสมาชิกอยู่แล้ว" ไม่ใช่ error (กัน race ลิงก์+QR ซ้อนกัน)
    ▼ redirect /shop/[slug]  (window.location.replace — full page load ไม่ใช่ router.push)
```

> ⚠️ **กับดัก chicken-and-egg (บั๊กที่แก้ไปแล้ว):** policy อ่าน `shops` คือ `is_shop_member(id)`
> คนใหม่ยังไม่ใช่สมาชิก → อ่านร้านตรงๆ ไม่ได้ → เดิมขึ้น "ไม่พบร้าน" เข้าไม่ได้ตลอดกาล
> แก้ด้วยฟังก์ชัน `shop_public_by_slug()` (security definer) — resolve ร้านจาก slug โดยไม่ต้องเป็นสมาชิก (ต้องรัน `fix-invite-join.sql`)
> และ join ต้องมี JWT ก่อน insert — ไม่งั้น RLS ปัดตกเงียบๆ แล้วขึ้น "สำเร็จ" หลอกๆ
>
> ⚠️ **กับดัก chicken-and-egg รอบ 2 — คนละจุดกับข้างบน (แก้ 2026-07-19):** `/shop/[shopId]/layout.tsx`
> ครอบทุก route ใต้ `/shop/[shopId]/*` **รวมถึง `/join` ด้วย** และเรียก `useShopInit()` ที่ query
> `shops` ตรงๆ (ผ่าน RLS `is_shop_member`) ก่อนจะยอมเรนเดอร์ children เลย — คนใหม่ที่ยังไม่ใช่สมาชิก
> โดน layout เด้ง "ไม่พบร้านค้านี้" ของตัวเอง **ก่อน** ที่โค้ดจริงของหน้า `/join` (ที่ resolve ร้านถูกต้อง
> ด้วย `shop_public_by_slug`) จะได้รันเลยด้วยซ้ำ — แก้ `sys_del_flag`/JWT secret/RPC ไปเท่าไหร่ก็ไม่มีผล
> เพราะโค้ดจุดนั้นไม่เคยถูกเรียกจริง แก้โดยให้ `layout.tsx` เช็ค pathname ลงท้ายด้วย `/join` แล้ว
> render children ตรงๆ ข้าม guard ของ `useShopInit` ไปเลย (หน้า join จัดการ auth/RLS เองอยู่แล้ว)
>
> ⚠️ **ภาคต่อ — แค่ "ไม่แสดงผล" ไม่พอ ต้อง "ไม่รัน" ด้วย:** ตอนแรกแก้แค่ให้ layout ไม่ render guard บน `/join`
> แต่ `useShopInit()` ยังรันอยู่เบื้องหลัง → query พลาด (ยังไม่เป็นสมาชิก) → **error ค้างใน state** →
> join สำเร็จแล้ว redirect แบบ client-side ไป dashboard → Next **ไม่ remount layout** และ effect ไม่รันใหม่
> (slug เดิม) → เรนเดอร์ error เก่าค้าง "ไม่พบร้านค้านี้" ทั้งที่ join สำเร็จ (รีเฟรชแล้วหาย = อาการชี้ตัว)
> แก้จริง: `useShopInit(slug, { skip: isJoin })` — skip = ไม่รันเลยบน `/join` และ effect depend on `skip`
> พอ redirect ออกจาก join → skip พลิกเป็น false → รันใหม่สดๆ ตอนที่เป็นสมาชิกแล้ว
>
> ⚠️ **redirect หลัง join ต้องเป็น full page load** (`window.location.replace`) ไม่ใช่ `router.push` —
> เส้นทางสแกน QR ยังเจออาการเดิมแม้แก้ skip แล้ว (webview ของ LINE cache bundle/state เก่าไว้)
> การ reload เต็มหน้า = การรีเฟรชที่ผู้ใช้กดเองแล้วหายทุกครั้ง แต่ทำให้อัตโนมัติ — อย่าเปลี่ยนกลับเป็น router.push
>
> ⚠️ **insert ซ้ำได้ถ้าเช็คก่อนอินเสิร์ตด้วย SELECT ผ่าน RLS (แก้ 2026-07-19):** pre-check
> `select ... maybeSingle()` อ่านผ่าน RLS ซึ่งกรอง `is_shop_member(shop_id)` ของ**ผู้ขอเอง** —
> คนที่กำลัง join ครั้งแรกยังไม่ใช่สมาชิก เพิ่งจะกลายเป็นหลัง insert สำเร็จ ดังนั้นถ้ากดลิงก์เชิญ +
> สแกน QR ใกล้ๆ กัน (หรือ retry ระหว่าง debug) pre-check ทั้งสอง request อาจไม่เห็นกันและกัน →
> insert 2 แถวซ้อน ป้องกันด้วย unique partial index (`fix-shop-members-unique.sql`) เป็นตัวตัดสินจริง
> — โค้ด join จับ error code **`23505`** (unique violation) แล้วตีความเป็น "เป็นสมาชิกอยู่แล้ว" แทนที่
> จะโชว์ error กลายเป็น idempotent join จริงๆ ไม่ใช่แค่ optimization
>
> ทั้งหน้า error ของ `/join` และของ `layout.tsx` (guard ปกติ เช่น "คุณไม่มีสิทธิ์เข้าถึงร้านนี้") มีปุ่ม
> **"กลับหน้าแรก"** แล้ว (ล้าง `khaai_last_shop` + store ก่อน) ให้ login ร้านอื่น/บัญชีอื่นใหม่ได้โดยไม่ต้องปิดแอป

### ชื่อสมาชิก (display_name)

`useShopInit` **backfill `display_name` จาก LINE ทุกครั้งที่ login** — สมาชิกที่ owner เพิ่มด้วย UID จะเป็น null
จนกว่าจะเข้าครั้งแรก (หน้าสมาชิกโชว์ "รอเข้าร่วมครั้งแรก") พอ login ปุ๊บชื่อจะเด้งขึ้นและอัปเดตให้ตรงชื่อ LINE ปัจจุบัน

---

## 2. Dashboard — หน้าแรก

**Path:** `/shop/[shopId]`

### สิ่งที่เห็นบนหน้า

| ส่วน | เนื้อหา |
|------|---------|
| Header (น้ำเงินไล่เฉด + ลูกเล่น) | รูป profile · ทักทาย + ชื่อ + **pill แสดง `shop.plan`** · ชื่อร้าน · ชิปวันที่ |
| Card ยอดขายวันนี้ | ยอดเงิน + จำนวนออเดอร์ (ซ้อนขึ้นทับ header ด้วย `-mt-6`) |
| Grid 2 ช่อง | ยอดขายเดือนนี้ / ค่าใช้จ่ายเดือนนี้ (รวมค่าส่งพัสดุ) |
| Alert (ถ้ามี) | สต็อกใกล้หมด (< 3 ชิ้น) / พัสดุรอส่ง |
| เมนูด่วน | 4 ปุ่ม shortcut (badge ไล่เฉด) |
| กิจกรรมล่าสุด | รวม 5 ตาราง เรียงตามเวลา เอา 6 รายการล่าสุด — กดแล้วเด้งไปหน้ารายการนั้น |

**Header decoration** — `src/components/HeaderDecor.tsx`
เลเยอร์ `pointer-events-none` ทับบน gradient `#3D8DFF → #1877F2 → #0A3A93`
ประกอบด้วย glow orbs, ริบบิ้นแสง SVG (blur), และประกายดาว 4 แฉก 7 จุด (`twinkle` keyframe, respect `prefers-reduced-motion`)

> ⚠️ **กับดัก CSS:** header เป็น `position: relative` → ถ้า content ข้างล่างเป็น static แล้วดึงขึ้นด้วย `-mt-6` มันจะถูก header ทับ
> ต้องใส่ `relative z-10` ที่ content wrapper เสมอ

### Actions และปลายทาง

```
รูป profile ──► bottom sheet
    ├── ชื่อ + LINE UID (แสดงอย่างเดียว)
    └── ปุ่ม "เปลี่ยนร้านค้า" ──► ล้าง localStorage + store ──► /

Alert สต็อกต่ำ ──► /products?filter=low_stock
Alert พัสดุรอส่ง ──► /shipments

เมนูด่วน:
  🧾 บันทึกขาย  ──► /sales/new       (ฟ้า #1877F2)
  📦 บันทึกซื้อ  ──► /purchases/new   (indigo #4F46E5)
  🚚 ส่งพัสดุ   ──► /shipments/new   (ส้ม #F97316)
  💸 ค่าใช้จ่าย ──► /expenses/new    (แดง)

กิจกรรมล่าสุด (แต่ละแถวเป็น Link):
  ขาย ──► /sales/[id]   ซื้อ ──► /purchases/[id]
  พัสดุ ──► /shipments/[id]   ค่าใช้จ่าย ──► /expenses
  สินค้าใหม่ ──► /products/[id]
```

---

## 3. สินค้า

**เข้าได้จาก bottom nav (tab ที่ 2) แล้ว** — ไม่ต้องพึ่ง alert เหมือนเดิม

### 3a. รายการสินค้า

**Path:** `/shop/[shopId]/products`

```
รายการสินค้า (ค้นหา / filter: ทั้งหมด / มี S/N / สต็อกต่ำ)
    │  แต่ละแถว: ProductThumb (รูปจริง หรือ monogram สีตาม hash ชื่อ) + ชื่อ + badge SKU
    │
    ├── กด card สินค้า ──► /products/[id]  (แก้ไข)
    └── "+ เพิ่มสินค้า" ──► /products/new
```

### 3b. เพิ่มสินค้าใหม่ · 3c. แก้ไขสินค้า

**Path:** `/products/new` · `/products/[productId]`

```
รูปสินค้า (ProductImagePicker) ──► เลือกไฟล์ (≤ 5MB)
    │   preview ทันที ── กด "บันทึก" ──► uploadProductImage()
    │   upload ไป Storage bucket `slips` path {shop_id}/products/{ts}.{ext}
    │   ได้ public URL ──► เก็บใน products.image_url
    │
กรอก: ชื่อ / SKU / ราคาขาย / ราคาทุน / สต็อก / ประกัน(วัน)
    │
    ├── [แก้ไข] toggle "แสดงสินค้า" ── is_active
    ├── บันทึก ──► INSERT / UPDATE products ──► /products
    └── [แก้ไข] ลบ ──► confirm ──► DELETE ──► /products
```

> ⚠️ **ต้องรัน `supabase/storage-policies.sql` ก่อน** — bucket public คุมแค่ "อ่าน"
> การ **upload ยังต้องมี RLS policy บน `storage.objects`** ไม่งั้นจะพังเงียบๆ

---

## 4. ขาย

### 4a. รายการบิล

**Path:** `/shop/[shopId]/sales`

```
รายการบิล (ล่าสุดก่อน) — แสดง "ชื่อสินค้า" เป็นหลัก + badge เลขบิลตัวเล็ก
    │  หลายรายการ → "ชื่อสินค้าแรก +N รายการ"
    │
    ├── กด card ──► /sales/[id]
    └── "+ บันทึกขาย" ──► /sales/new
```

### 4b. บันทึกการขาย

**Path:** `/shop/[shopId]/sales/new`

```
1. วันที่ทำรายการ (DateField — default = วันนี้, ย้อนหลังได้)

2. ค้นหา + เลือกสินค้า (is_active=true, stock>0)
       ▼ กดสินค้า → เพิ่มลง cart (กดซ้ำ = เพิ่มจำนวน)

3. วิธีรับสินค้า
       ├── 🚚 จัดส่ง  (delivery_method = 'ship')   → ไปโผล่ในตัวเลือกผูกพัสดุ
       └── 🤝 รับเอง (delivery_method = 'pickup')  → ไม่ต้องผูกพัสดุ

4. วิธีชำระ
       ├── 💳 โอนเงิน ──► upload รูปสลิป
       └── 💵 เงินสด

5. หมายเหตุ (optional)

6. กด "บันทึกขาย X บาท"
       │
       ▼
       ถ้ามีสลิป: upload ไป Storage → slip_url
       │
       INSERT sales (ref: SO-YYYYMMDD-XXX, sale_date, delivery_method)
       INSERT sale_items (+ unit_cost = snapshot ราคาทุน ณ วันที่ขาย — เก็บไว้เป็นข้อมูล ไม่ได้ใช้คิดกำไรแล้ว)
       │
       🔄 TRIGGER trg_deduct_stock_on_sale → products.stock -= qty
       │
       ▼
       redirect ──► /sales
```

> ⭐ **กำไรใช้ `products.cost_price` (ปัจจุบัน) ไม่ใช่ `sale_items.unit_cost` (snapshot):**
> ตั้งใจ (ผู้ใช้ยืนยันแล้ว 2026-07-18) — แก้ราคาทุนของสินค้าเมื่อไหร่ กำไรของ**บิลขายเก่าทุกบิล**และ
> รายงานของ**เดือนที่ปิดไปแล้ว**จะขยับตามทันที ไม่ใช่ตรึงไว้ที่ราคาวันที่ขาย
> ก่อนหน้านี้เคย snapshot ไว้กันกำไรเก่าไม่ให้เปลี่ยน แต่ผู้ใช้ต้องการให้ตัวเลขสะท้อนทุนปัจจุบันเสมอ
> `sale_items.unit_cost` ยังถูกเขียนไว้เหมือนเดิม (เผื่อใช้งานอื่นในอนาคต) แต่**ไม่มีจุดไหนอ่านมาคิดกำไรแล้ว**

### 4c. รายละเอียดบิล

**Path:** `/shop/[shopId]/sales/[saleId]`
แสดงยอดรวม / วันที่ / วิธีชำระ / วิธีรับ / รายการสินค้า / สลิป / หมายเหตุ · **ปุ่มลบบิล** (มุมขวาบน)

**ลบบิล** → `rpc delete_sale_cascade(sale_id)`
```
warning: สินค้าคืนสต็อก · (ถ้ามีพัสดุ) พัสดุถูกลบด้วย
    ▼ DB function (1 transaction): คืน serial → in_stock · DELETE shipments · DELETE sales (cascade sale_items → trg คืนสต็อก)
    ▼ redirect /sales
```

---

## 3d. ลบสินค้า (cascade) — `rpc delete_product_cascade(product_id)`

**Path:** ปุ่มลบใน `/products/[id]`

```
กดลบ ──► เช็คก่อนว่าจะกระทบกี่บิล/กี่พัสดุ → warning บอกจำนวนจริง
    ▼ ยืนยัน
    DB function (1 transaction):
      บิลขายที่ "มีสินค้านี้" ถูกลบทั้งใบ (รวมสินค้าอื่นในบิล) + พัสดุของบิลนั้น
      + ประวัติซื้อที่มีสินค้านี้ + serial + ตัวสินค้า
    ▼ redirect /products
```

> ⚠️ **ทำไมลบสินค้าถึงลบบิลทั้งใบ:** FK `sale_items.product_id` เป็น RESTRICT — ลบสินค้าที่เคยขายไม่ได้เลยถ้าไม่ลบ sale_items ก่อน
> เลือกลบทั้งบิล (ไม่ใช่แค่ sale_item ของสินค้านี้) เพราะบิลที่เหลือ item ไม่ครบจะทำให้ยอด/กำไรเพี้ยน
> เป็นการ **hard-delete** — ถ้าอยากเก็บประวัติให้ใช้ toggle "แสดงสินค้า" (`is_active`) ซ่อนแทน
> ต้องรัน `supabase/delete-cascade.sql` · ลบทีละตารางจาก client ไม่ได้ (RESTRICT FK บล็อกกลางคัน)

---

## 5. ซื้อ

### 5a. รายการซื้อ — `/purchases`

```
แสดง "ชื่อสินค้า" เป็นหลัก + badge เลข PO ตัวเล็ก
    ├── กด card ──► /purchases/[id]
    └── "+ บันทึกซื้อ" ──► /purchases/new
```

### 5b. บันทึกการซื้อ — `/purchases/new`

```
1. วันที่ทำรายการ (default = วันนี้, ย้อนหลังได้)
2. เลือก Supplier — picker แสดง **โลโก้แบรนด์**
3. ค้นหา + เลือกสินค้า → cart (ปรับจำนวน / แก้ราคาทุน ได้)
4. สลิปโอนเงิน (optional)
5. หมายเหตุ
6. บันทึก
       INSERT purchases (ref: PO-YYYYMMDD-XXX, purchase_date)
       INSERT purchase_items
       🔄 stock += qty  และ  products.cost_price = ราคาทุนใหม่
       ▼ redirect ──► /purchases
```

### 5c. รายละเอียดการซื้อ — `/purchases/[id]` · **ปุ่มแก้ไข + ลบ** (มุมขวาบน)

**แก้ไข** (แก้ต้นทุน + จำนวน + สลิปย้อนหลัง) → `rpc edit_purchase(id, items[], slip_url)`
```
กด "แก้ไข" → แก้ "จำนวน × ราคา/ชิ้น" ของแต่ละรายการ (ยอดรวมคำนวณสดขณะพิมพ์) + เปลี่ยนสลิปได้
    ▼ DB function (atomic):
      แต่ละรายการ: products.stock += (จำนวนใหม่ − จำนวนเดิม) · cost_price = ราคาใหม่
                    purchase_items (unit_cost, quantity, total_cost)
      purchases.total_amount = Σ total_cost, slip_url
```

> **คำนวณใหม่หลังแก้ (ครบทุกทาง):**
> - **stock ปรับตามส่วนต่างจำนวน** — เคยซื้อ 10 ขาย 8 (stock 2) แก้จำนวนเป็น 5 → stock = 2 + (5−10) = −3 (ขายเกิน 3, stock ติดลบได้ ไม่มี CHECK)
> - `products.cost_price` = ต้นทุนใหม่ → ต้นทุนของ**การขายในอนาคต**ถูกต้อง
> - รายงาน "ซื้อสินค้าเข้าเดือนนี้" (Σ purchases.total_amount) → อัปเดตเอง (query สด)
> - **⭐ กำไรบิลขายเก่า/รายงานเดือนที่ปิดไปแล้วก็เปลี่ยนด้วย** — รายงานอ่าน `products.cost_price` (ปัจจุบัน) ไม่ใช่ `sale_items.unit_cost` (snapshot) แล้ว ตั้งใจ (ผู้ใช้ยืนยัน 2026-07-18)
> - **ทำไมเป็น DB function:** ปรับ stock ต้องใช้ `stock = stock + delta` แบบ atomic — ถ้าอ่านแล้วเขียนทับจาก client จะแข่งกับการขายที่เกิดพร้อมกัน → stock หาย · ต้องรัน `edit-purchase.sql`



**ลบบิลซื้อ (cascade แรง)** → `rpc delete_purchase_cascade(purchase_id)`
```
warning: ถอน stock ที่ซื้อเข้า · ลบบิลขาย N บิล + พัสดุ ของสินค้าในบิลนี้
    ▼ DB function (1 transaction):
      reset serial · DELETE shipments · DELETE sales (cascade → trg คืนสต็อก)
      · ถอน stock ที่ซื้อเข้ากลับ (ไม่มี trigger คืนตอนลบซื้อ ทำเองใน function)
      · DELETE purchase
    ▼ redirect /purchases
```

> ⚠️ **cascade แรง — ลบเยอะเกินจริง (ผู้ใช้ยืนยันแล้ว):** ลบบิลซื้อ → ลบบิลขาย**ทั้งหมด**ของสินค้าในบิลนั้น
> แม้ของที่ขายจะมาจาก stock ล็อตอื่น (ระบบไม่ track ล็อต) · `cost_price` **ไม่ถูกกู้กลับ** เป็นราคาก่อนบิลนี้ — เพราะกำไรอ่าน `cost_price` ปัจจุบันเสมอแล้ว (ไม่ snapshot) ค่านี้จึงมีผลต่อกำไรของบิลขายทุกบิลที่ยังไม่ถูกลบไปด้วย
> ต้องรัน `delete-cascade.sql` (มี `delete_purchase_cascade` รวมอยู่แล้ว)

---

## 6. พัสดุ

### 6a. รายการพัสดุ — `/shipments`

```
ตัวกรอง (เรียงจากกว้าง→แคบ): เดือน (MonthFilter) → สถานะ (pending/shipped/delivered) → ปุ่ม Flash sync
    │  การ์ดโชว์: ชื่อสินค้าในพัสดุ (ถ้าผูกบิล) · เลข tracking + สถานะ · ขนส่ง + ค่าส่ง · วันที่
    ├── กด card ──► /shipments/[id]
    └── "+ สร้างพัสดุ" ──► /shipments/new
```

> ลำดับตัวกรอง: **เดือนอยู่บนสุด** เพราะเป็นตัวกรองที่กว้างกว่าสถานะ (ตัดข้อมูลออกเยอะกว่าควรมาก่อน)
> ไม่งั้น user เลือกสถานะเสร็จค่อยพบว่าดูผิดเดือน
>
> **ชื่อสินค้าบนการ์ด:** ดึงจากบิลที่ผูก (`sale_id → sale_items → products`) — ร้านจำสินค้าได้ ไม่ใช่เลข tracking
> ถ้าพัสดุไม่ได้ผูกบิล fallback ไปโชว์เลข tracking เหมือนเดิม · ไม่ต้องกรอกอะไรเพิ่ม ไม่แตะ DB
> (เคยลองทำ "ชื่อผู้รับ" ก่อน แต่ shipments ไม่มีที่เก็บ และผู้รับก็ไม่ได้กรอกทุกครั้ง — เลยเปลี่ยนมาใช้ชื่อสินค้า)

> ⚠️ **ปุ่ม sync เช็คสถานะพัสดุอัตโนมัติ — Flash ใช้งานได้ ส่วน J&T ยังไม่ (พยายามทำ 2026-07-19):**
> `syncTracking()` ยิง `/api/flash-track` (endpoint สาธารณะ ไม่มี auth) สำหรับพัสดุ carrier = Flash/ไม่ระบุ carrier
> **J&T ทำไม่ได้** — endpoint tracking สาธารณะของ J&T (`/api/jt-track` มีโครงไว้แล้ว) ต้องมี `verifyCode`
> ที่ได้จากการแก้ slide-puzzle captcha บนเว็บ ทดสอบแล้วว่า token ที่จับมาจาก network tab ใช้ครั้งเดียวก็หมดอายุ
> (ยิงซ้ำ error `code:20005 验证码不正确`) — **ไม่ทำระบบแก้ captcha อัตโนมัติ** (เป็นการข้าม anti-bot ที่ J&T ตั้งใจใส่ไว้)
> ทางแก้จริง: ต้องขอ API key จาก J&T merchant program (คนละ endpoint กับเว็บสาธารณะ ไม่มี captcha)
> ตอนนี้ `isJTCarrier`/`/api/jt-track` เป็นโครงพร้อมใช้เฉยๆ ไม่ได้ต่อเข้า UI (กันไม่ให้ยิง request ด้วย token ที่รู้อยู่แล้วว่าพัง)

### 6b. สร้างพัสดุใหม่ — `/shipments/new`

```
1. วันที่ (default = วันนี้)
2. เลือกผู้ให้บริการ — picker แสดง **โลโก้ขนส่ง**
3. เลข tracking / ค่าส่ง / สลิปค่าส่ง (optional)
4. ผูกกับบิลขาย — **เห็นเฉพาะบิลที่ delivery_method = 'ship' และยังไม่มีพัสดุ**
       (บิลที่ลูกค้ารับเองจะไม่ค้างอยู่ใน picker ตลอดกาลอีกต่อไป)
    ▼
    ถ้ามีสลิป: uploadSlip() → slips bucket ({shop_id}/slips/) → slip_url
    INSERT shipments (status = 'pending', slip_url)
```

> **สลิปค่าส่ง (`shipments.slip_url`):** ค่าส่งเป็นเงินจ่ายออกจริง แนบหลักฐานได้เหมือนขาย/ซื้อ
> ถ้า upload สลิปล้มเหลว จะ **ไม่บันทึกพัสดุ** (กันเคสพัสดุถูกสร้างแต่สลิปหลุดหายเงียบๆ)
> ดู/เพิ่ม/เปลี่ยนสลิปได้ภายหลังที่ `/shipments/[id]` (โหมด edit)

### 6c. รายละเอียด / แก้ไข / ลบ — `/shipments/[id]`

```
แสดงข้อมูลพัสดุ + บิลที่ผูกไว้
    ├── ปุ่ม "แก้ไข" ──► ฟอร์ม inline (tracking / ผู้ให้บริการ / ค่าส่ง / หมายเหตุ)
    │      ช่อง tracking ตั้ง autoCapitalize="characters" autoCorrect="off"
    │      → UPDATE shipments
    │
    └── ปุ่ม "ลบ" ──► confirm ──► rpc delete_shipment_cascade(id) ──► /shipments

เมื่อ status → 'delivered':
🔄 TRIGGER trg_warranty_on_delivered
   serial_numbers ได้ warranty_starts_at / ends_at / status = 'active'
```

**ลบพัสดุ** → `rpc delete_shipment_cascade(shipment_id)`
```
warning: บิลกลับไปรอผูกพัสดุใหม่ · ประกันที่เริ่มนับถูกยกเลิก
    ▼ DB function: reset serial (shipment_id=null, status='sold', ล้างประกัน) · DELETE shipment
    ▼ บิลขาย (sale_id) ไม่ถูกแตะ → กลับมาโผล่ใน picker "สร้างพัสดุ"
```

> **ความสัมพันธ์การลบ 3 ทิศ (asymmetric):**
> - ลบ **สินค้า** → ลบบิล + พัสดุ + ประวัติซื้อ (ทั้งหมดที่มีสินค้านั้น)
> - ลบ **บิล** → คืนสต็อก + ลบพัสดุที่ผูก
> - ลบ **พัสดุ** → บิล/สินค้าไม่หาย (กลับมาผูกใหม่ได้) + ยกเลิกประกันที่ start ไว้
> เคสที่แก้: พิมพ์เลขพัสดุผิด (เช่น `aa xs245`) เดิม **แก้ไม่ได้ ลบไม่ได้** และบิลก็หายจาก picker แล้ว → ตัน

---

## 7. ค่าใช้จ่าย

**Path:** `/expenses` (รายการ) · `/expenses/new` (บันทึก)

```
เลือกประเภท: 🚚 ค่าขนส่ง / ⛽ ค่าน้ำมัน / 📋 อื่นๆ
กรอก: จำนวนเงิน / วันที่ / รายละเอียด / สลิป-ใบเสร็จ (optional)
    ▼ ถ้ามีสลิป: uploadSlip() → slip_url  (ล้มเหลว = ไม่บันทึก)
    ▼ INSERT expenses (slip_url) ──► redirect /reports
    รายการ /expenses โชว์ thumbnail สลิป กดดูรูปเต็มได้
```

> สลิป: `expenses.slip_url` มีในสคีมาอยู่แล้ว ไม่ต้องรัน SQL · ใช้ `uploadSlip()` ตัวเดียวกับพัสดุ

> **ค่าส่งพัสดุไม่ถูกสร้างเป็นแถวใน `expenses`** — แต่ถูก **sum จากตาราง `shipments`** ตอนคำนวณ
> (เลือก aggregate แทน duplicate เพื่อไม่ให้ข้อมูลเพี้ยนเวลาแก้/ลบพัสดุ)

---

## 8. รายงาน

**Path:** `/shop/[shopId]/reports`

```
เลือกช่วงเวลา — pill สลับโหมด "รายเดือน" / "กำหนดเอง" (เพิ่ม 2026-07-18)
    ├── รายเดือน   → MonthFilter ←/→ (ไปข้างหน้าได้ถึงเดือนปัจจุบัน)
    └── กำหนดเอง   → DateField จากวันที่ / ถึงวันที่ (ถึงวันที่ ≤ วันนี้, จากวันที่ ≤ ถึงวันที่ — สลับกันไม่ได้ ชนกันจะดันอีกฝั่งตาม)
    ▼
ทุกอย่างด้านล่างคำนวณจากช่วง [dateStart, dateEnd] เดียวกัน ไม่ว่าจะมาจากโหมดไหน
    ▼
กำไรสุทธิ = ยอดขาย − ต้นทุนขาย(COGS) − ค่าใช้จ่ายอื่น − ค่าส่งพัสดุ

  ยอดขาย       Σ sales.total_amount                    (ของช่วงนั้น)
  ต้นทุนขาย     Σ sale_items.qty × products.cost_price  ⭐ ของบิลที่ขายในช่วงนั้น — ใช้ทุน**ปัจจุบัน** ไม่ใช่ทุน ณ วันที่ขาย
  ค่าใช้จ่าย     Σ expenses.amount
  ค่าส่งพัสดุ    Σ shipments.cost

+ การ์ดแยกต่างหาก "ซื้อสินค้าเข้าในช่วงนี้" (Σ purchases) — **ไม่นำไปคิดกำไร**
+ **ตารางสินค้าที่ซื้อเข้าในช่วงนี้** — อิง `purchases.created_at` (วันที่ซื้อเข้า) ว่าอยู่ในช่วงไหม
    แต่ละแถว: ชื่อสินค้า · จำนวนซื้อเข้า · จำนวนขายออก · badge สถานะ
    สถานะ: `ยังไม่ขาย` (soldQty=0) / `ขายบางส่วน` (0<sold<bought) / `ขายแล้ว` (sold≥bought)
    เรียง "ยังไม่ขาย" ขึ้นก่อน (ของที่ต้องดูแล) · soldQty นับ "ตลอดเวลา" แต่ของที่ซื้อเข้าในช่วงนี้ขายได้เร็วสุดก็ในช่วงนี้
+ กราฟยอดขายรายวัน (bar chart) — 1 แท่ง/วัน ตลอดช่วงที่เลือก (ไม่ใช่ fix 1-31 อีกต่อไป) แกน x โชว์วันที่จริง (ต้น/กลาง/ท้ายช่วง)
+ อัตรากำไร (%)
```

> ⚠️ **ไม่มี Export CSV แล้ว (เอาออก 2026-07-18)** — เคยมีปุ่ม CSV ที่ header ผู้ใช้ขอเอาออก โค้ด export (`handleExport`, i18n `reports.csvRef/csvTotal/csvPayType/csvNote/csvDate/exporting`) ถูกลบทิ้งทั้งหมด ไม่ใช่แค่ซ่อน — ถ้าจะทำใหม่ต้องเขียนใหม่

> ⭐ **ช่วงวันที่กำหนดเอง (เพิ่ม 2026-07-18):** เดิม fix เป็นรายเดือนเท่านั้น ผู้ใช้ขอให้เลือกช่วงวันที่ได้อิสระ
> - `MonthFilter` (component ที่ sales/purchases/shipments ใช้ร่วมกัน) **ไม่ถูกแตะ** — เพิ่มเป็นโหมดคู่ขนานเฉพาะหน้า reports เท่านั้น ไม่กระทบหน้าอื่น
> - กราฟรายวันเดิม fix 1-31 ตาม `daysInMonth()` ของเดือนนั้น เปลี่ยนเป็น generate ทีละวันจาก `dateEnd - dateStart` ได้ทุกความยาวช่วง (แท่งจะถี่ขึ้นถ้าเลือกช่วงยาว เพราะไม่ได้ทำ aggregation เป็นสัปดาห์/เดือน)
> - ช่วงกำหนดเอง: "ถึงวันที่" ปิด max ที่วันนี้ (ห้ามดูอนาคต เหมือนเดือนที่ปิด max ที่เดือนปัจจุบัน)

> ⭐ **บัคเดิมที่แก้ไปแล้ว:** เคยเอา `purchases.total_amount` ของเดือนนั้นมาเป็นต้นทุน
> → ซื้อเดือน มิ.ย. 10,000 แล้วขายเดือน ก.ค. 15,000 จะได้ **มิ.ย. −10,000 / ก.ค. +15,000**
> ทั้งที่ควรเป็น **มิ.ย. 0 / ก.ค. +5,000**
> **COGS ≠ เงินที่จ่ายซื้อของ** — ต้นทุนต้องเดินตาม "ของที่ขายออกไป" ไม่ใช่ "ของที่ซื้อเข้ามา"
>
> ⭐ **ทุนใช้ `products.cost_price` ปัจจุบัน ไม่ snapshot (เปลี่ยน 2026-07-18):**
> เดิม COGS ใช้ `sale_items.unit_cost` (ทุน ณ วันที่ขาย) เพื่อกันไม่ให้กำไรเดือนเก่าขยับ
> ผู้ใช้ทดสอบแล้วพบว่าแก้ราคาซื้อ (เช่น 1500→1800) แล้วกำไรในรายงานไม่ลด เพราะยังอ่าน snapshot เดิม
> จึงเปลี่ยนให้ COGS อ่าน `products.cost_price` สด แทน — **ผลคือ:**
> - แก้ต้นทุนสินค้าเมื่อไหร่ กำไรของ**บิลขายเก่าทุกบิล**และ**รายงานเดือนที่ปิดไปแล้ว**ขยับตามทันที (ตั้งใจ)
> - `sale_items.unit_cost` ยังถูกเขียน (INSERT ตอนขาย) ไว้เหมือนเดิมเป็นข้อมูลดิบ แต่**ไม่มีจุดไหนอ่านมาคิดกำไรแล้ว** (ทั้งหน้ารายงานและหน้ารายละเอียดบิลขาย)
> - สินค้าที่ถูกลบ (soft-delete) ออกจากบิลขายเก่า → join `products` ไม่เจอ → หน้ารายละเอียดบิลขาย fallback ไปใช้ `unit_cost` เดิมแทน (กันกำไรเพี้ยนเป็น 0)

---

## 9. ตั้งค่า

**Path:** `/shop/[shopId]/settings` — **อยู่ใน bottom nav (tab ขวาสุด)** แล้ว

```
Settings hub
    ├── การ์ดข้อมูลร้าน (ชื่อ + slug)
    │
    ├── [ร้านค้า]
    │     └── สมาชิกร้านค้า ──► /settings/members
    │             │  รายการสมาชิก (ชื่อ + line_uid + role badge)
    │             │  owner ลบสมาชิกคนอื่นได้
    │             └── "เชิญสมาชิกใหม่" (เฉพาะ owner) ──► /settings/members/invite
    │                     ├── คัดลอกลิงก์เชิญ ( {origin}/shop/[slug]/join )
    │                     └── QR ชั่วคราว (หมดอายุ 3 นาที) — สแกนแล้วเข้า /join ทันที
    │
    ├── [ทั่วไป]
    │     └── ภาษา ──► /settings/language ──► ไทย 🇹🇭 / English 🇬🇧
    │
    └── [บัญชี]
          └── เปลี่ยนร้านค้า ──► ล้าง store + localStorage ──► /
```

> ⚠️ **"เพิ่มด้วย LINE UID" ถูกตัดออกแล้ว (2026-07-19):** เคยมีช่องให้ owner พิมพ์ LINE `userId` ของอีกฝ่าย
> เพิ่มเป็นสมาชิกตรงๆ แต่ **ใช้งานจริงไม่ได้** — `userId` ภายในของ LINE (ขึ้นต้น `U` + hex 32 ตัว) เป็นคนละอย่างกับ
> "LINE ID" ที่คนตั้งเองไว้ให้เพื่อนเพิ่ม (หา/มองเห็นได้) และ **ไม่มีหน้าจอไหนใน LINE ให้คนทั่วไปดูค่า `userId` ของตัวเอง**
> เจ้าของร้านเลยไม่มีทางรู้ค่าที่ต้องกรอกจริงๆ ตัดออกเหลือแค่ลิงก์เชิญ/QR ซึ่งดึง `userId` ให้อัตโนมัติผ่าน LIFF ตอน login

---

## Soft delete (ทุกตาราง)

ทุกตารางมี `sys_del_flag` ('N'/'Y') + `last_upd_by` (LINE uid คนเรียก API)

- **อ่าน:** ไม่ต้องกรองในแอป — **RLS `using` clause กรอง `sys_del_flag='N'` ให้อัตโนมัติ** (กันลืมกรองที่จุดใดจุดหนึ่ง)
- **ลบ:** `update sys_del_flag 'N'→'Y'` ไม่ลบจริง · ทุกฟังก์ชัน cascade เป็น soft-delete แล้ว
- **is_shop_member** กรอง `sys_del_flag='N'` ด้วย → สมาชิกที่ถูกลบหมดสิทธิ์ทันที
- ⚠️ **trigger คืนสต็อก (trg_restore_stock_on_delete) ยิงตอน DELETE จริงเท่านั้น** → soft-delete ไม่ยิง ฟังก์ชัน cascade จึงคืน/ปรับ stock เอง
- ต้องรัน `add-soft-delete.sql` **ก่อน** `delete-cascade.sql` / `edit-purchase.sql`
- ⚠️ **unique constraint เดิมต้องแปลงเป็น partial unique index ด้วย ไม่งั้นแถวที่ soft-delete แล้วยังกันซ้ำอยู่** —
  `add-soft-delete.sql` ทำให้ `serial_numbers` แล้ว แต่ **พลาด `shop_members` ไป** (บัคที่เจอจริง 2026-07-18:
  ลบสมาชิกแล้วเพิ่ม LINE UID เดิมกลับเข้ามาใหม่ → insert ชนกับแถวเก่าที่ soft-delete ไว้ (unique เดิมยังมองเห็น
  แม้ RLS จะกรองไม่ให้ query เห็น) → "เพิ่มผ่าน LINE UID ไม่ได้" แบบไม่มี error ที่เข้าใจง่าย)
  แก้ด้วย `supabase/fix-shop-members-unique.sql` — ถ้าจะเพิ่มตารางที่มี unique constraint อื่นในอนาคต ต้องเช็คแบบเดียวกันทุกครั้ง

> ⚠️⚠️ **policy `shop_members` หลุด sys_del_flag filter ไปจริงๆ (พบจาก khaai-web 2026-07-19):** เช็คตรงผ่าน
> REST API เจอแถวที่ `sys_del_flag='Y'` (สมาชิกที่ลบไปแล้ว) ยังถูกคืนมาจาก SELECT ปกติ — แปลว่า policy
> `"shop members read/write"` ตอนนี้ **ไม่มีเงื่อนไข `sys_del_flag='N'` แล้ว** ทั้งที่ `add-soft-delete.sql` เคยใส่ไว้
> สงสัยว่ามี migration อื่นหลังจากนั้น (เช่น `fix-shop-members-unique.sql` หรือการแก้มือใน SQL Editor) เผลอ
> `drop`/`create` policy ทับโดยไม่ได้ใส่เงื่อนไขนี้กลับเข้าไป — **กระทบหน้าสมาชิกของ LIFF ด้วย** (ลบสมาชิกแล้วน่าจะยังโผล่ในลิสต์)
> แก้ด้วย `supabase/fix-shop-members-rls.sql` (ต้องรัน) — ระหว่างนี้ทั้ง khaai และ khaai-web กรอง
> `.eq('sys_del_flag', 'N')` เพิ่มเองในหน้า members list แล้วเป็นการชั่วคราว ไม่ต้องพึ่ง RLS อย่างเดียว

## Cross-cutting

### i18n
- dictionary: `src/lib/i18n.ts` (th ต้นทาง, en mirror) — `const t = useT()` แล้ว `t('section.key')`
- interpolation: `t('common.moreItems', { n: 3 })`
- ภาษาเก็บใน `src/store/langStore.ts` (zustand persist → localStorage `khaai_lang`) เปลี่ยนแล้วทั้งแอปอัปเดตทันที

### หน่วยเงิน
`฿` → **"บาท" / "Baht"** ตามภาษา — `bahtUnit()` / `formatMoneyFull()` ใน `src/lib/format.ts`
(อ่าน store ผ่าน `getState()` ทำให้ call site เดิมไม่ต้องแก้)

### วันที่
- ทุกฟอร์มบันทึก (ขาย/ซื้อ/พัสดุ/ค่าใช้จ่าย) มีช่องวันที่ **default = วันนี้ ย้อนหลังได้**
- ใช้ `src/components/DateField.tsx` — native `<input type="date">` โปร่งใสทับอยู่ (เปิด picker ได้ปกติ)
  แต่ **ข้อความที่เห็นเรนเดอร์เอง** ตามภาษาของแอป
- ⚠️ ถ้าปล่อยให้ native แสดงเอง: iOS/LINE จะโชว์ **พ.ศ. 2569** ตามปฏิทินของเครื่อง แม้แอปตั้งเป็น EN
  (ค่าใน `.value` เป็น `YYYY-MM-DD` ค.ศ. เสมอ — ไม่ใช่บัค แต่คุม UI ไม่ได้)

### Loading
`src/components/LoadingScreen.tsx` — มาสคอตลอย + เงาพื้นหด + จุดเด้ง 3 จุด (CSS ล้วน ไม่ใช่วิดีโอ/Lottie)

### updated_at (ทุกตาราง, เพิ่ม 2026-07-19)
ทุกตารางมี `updated_at timestamptz` — **ไม่ต้องตั้งค่าเองในแอป** มี trigger กลาง `set_updated_at()`
(`trg_set_updated_at`, before update) ตั้งให้อัตโนมัติทุกครั้งที่ update แถวไหนก็ตาม รวมถึงตอน soft-delete
(`sys_del_flag` N→Y ก็นับเป็น update → `updated_at` ขยับด้วย ใช้ดูได้ว่า "ลบเมื่อไหร่" ถ้าไม่มีคอลัมน์ deleted_at แยก)
ต้องรัน `supabase/add-updated-at.sql` — คอลัมน์จะไปต่อท้ายตารางทางกายภาพ (ALTER TABLE ย้ายตำแหน่งไม่ได้)
ถึงแม้ `schema.sql` จะประกาศไว้ถัดจาก `created_at` ก็ตาม (มีผลแค่ตอนติดตั้งใหม่จากศูนย์)

---

## Side Effects อัตโนมัติ (Triggers)

| Event | Trigger | ผล |
|-------|---------|-----|
| INSERT sale_items | trg_deduct_stock_on_sale | products.stock -= quantity |
| DELETE sale_items | trg_restore_stock_on_delete | products.stock += quantity |
| INSERT purchase_items | fn_add_stock_on_purchase | stock += qty **และเขียนทับ cost_price** ⚠️ |
| UPDATE shipments → delivered | trg_warranty_on_delivered | serial_numbers ได้ warranty dates |
| UPDATE ตารางไหนก็ตาม | trg_set_updated_at | `updated_at` = now() อัตโนมัติ |
| ทุกวัน 00:00 UTC | pg_cron | serial_numbers.warranty_status อัปเดต |

---

## SQL ที่ต้องรันใน Supabase SQL Editor

| ไฟล์ | จำเป็น? |
|------|---------|
| `supabase/storage-policies.sql` | ✅ ไม่รัน = **อัปโหลดรูปสินค้า/สลิปพัง** |
| `supabase/fix-cogs.sql` | ✅ ไม่รัน = แอปพัง (`sale_items.unit_cost`) |
| `supabase/add-delivery-method.sql` | ✅ ไม่รัน = แอปพัง (`sales.delivery_method`) |
| `supabase/shops-owner-update.sql` | ✅ ปิดช่องโหว่ staff แก้ข้อมูลร้านได้ (policy เดิม `FOR ALL`) |
| `supabase/add-shipment-slip.sql` | ✅ ไม่รัน = **บันทึกพัสดุพัง** (โค้ด insert `slip_url`) |
| `supabase/fix-invite-join.sql` | ✅ ไม่รัน = **ลิงก์เชิญขึ้น "ไม่พบร้าน"** (`shop_public_by_slug()`) |
| `supabase/delete-cascade.sql` | ✅ ไม่รัน = **ลบสินค้า/ลบบิล/ลบพัสดุ/ลบซื้อพัง** (4 ฟังก์ชัน) |
| `supabase/register-shop.sql` | ✅ ไม่รัน = **สร้างร้านค้าใหม่พัง** ทั้ง `/register` (LIFF) และ `/dashboard/new` (khaai-web) — RLS insert บล็อกตรงๆ |
| `supabase/add-soft-delete.sql` | ✅ **รันก่อน 2 ไฟล์ล่าง** — เพิ่ม `sys_del_flag`/`last_upd_by` + RLS กรองอัตโนมัติ |
| `supabase/edit-purchase.sql` | ✅ ไม่รัน = **แก้ไขบิลซื้อพัง** (`edit_purchase`) |
| `supabase/fix-shop-members-unique.sql` | ✅ ไม่รัน = **เพิ่มสมาชิกที่เคยถูกลบกลับเข้ามาใหม่ไม่ได้** (unique constraint เก่ายังกันซ้ำอยู่) |
| `supabase/fix-shop-members-rls.sql` | ✅ ไม่รัน = **ลบสมาชิกแล้วยังโผล่ในลิสต์** (RLS ไม่กรอง sys_del_flag) |
| `supabase/add-updated-at.sql` | ✅ ไม่รัน = ทุกตารางไม่มีคอลัมน์ `updated_at` + trigger อัปเดตอัตโนมัติ (ไม่ทำให้แอปพัง แต่ฟีเจอร์ที่ต้องใช้ `updated_at` จะไม่มีข้อมูล) |
| `supabase/reset-shop-data.sql` | ⬜ ใช้ตอนอยากล้างข้อมูลร้าน (เก็บสมาชิกไว้) |
