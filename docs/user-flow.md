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

> หน้าแรกแสดงโลโก้มาสคอต **ไม่มีลิงก์ "สร้างร้านใหม่"** แล้ว — การสร้างร้านย้ายไปทำที่ `khaai-web`

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
/shop/[slug]/join ──► ยืนยันเข้าร่วม ──► INSERT shop_members ──► /shop/[slug]
```

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
       INSERT sale_items (+ unit_cost = snapshot ราคาทุน ณ วันที่ขาย)  ⭐
       │
       🔄 TRIGGER trg_deduct_stock_on_sale → products.stock -= qty
       │
       ▼
       redirect ──► /sales
```

> ⭐ **`sale_items.unit_cost` สำคัญมาก:** trigger ตอนซื้อจะ **เขียนทับ** `products.cost_price`
> ถ้าไม่ snapshot ทุนไว้ที่บิล กำไรของบิลเก่าจะถูกเขียนใหม่ทุกครั้งที่ซื้อของเข้า

### 4c. รายละเอียดบิล

**Path:** `/shop/[shopId]/sales/[saleId]`
แสดงยอดรวม / วันที่ / วิธีชำระ / วิธีรับ / รายการสินค้า / สลิป / หมายเหตุ

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

### 5c. รายละเอียดการซื้อ — `/purchases/[id]`

---

## 6. พัสดุ

### 6a. รายการพัสดุ — `/shipments`

```
แบ่งตาม status (pending / shipped / delivered)
    ├── กด card ──► /shipments/[id]
    └── "+ สร้างพัสดุ" ──► /shipments/new
```

### 6b. สร้างพัสดุใหม่ — `/shipments/new`

```
1. วันที่ (default = วันนี้)
2. เลือกผู้ให้บริการ — picker แสดง **โลโก้ขนส่ง**
3. เลข tracking / ที่อยู่ / ค่าส่ง
4. ผูกกับบิลขาย — **เห็นเฉพาะบิลที่ delivery_method = 'ship' และยังไม่มีพัสดุ**
       (บิลที่ลูกค้ารับเองจะไม่ค้างอยู่ใน picker ตลอดกาลอีกต่อไป)
    ▼
    INSERT shipments (status = 'pending')
```

### 6c. รายละเอียด / แก้ไข / ลบ — `/shipments/[id]`

```
แสดงข้อมูลพัสดุ + บิลที่ผูกไว้
    ├── ปุ่ม "แก้ไข" ──► ฟอร์ม inline (tracking / ผู้ให้บริการ / ค่าส่ง / หมายเหตุ)
    │      ช่อง tracking ตั้ง autoCapitalize="characters" autoCorrect="off"
    │      → UPDATE shipments
    │
    └── ปุ่ม "ลบ" ──► confirm ──► DELETE ──► /shipments

เมื่อ status → 'delivered':
🔄 TRIGGER trg_warranty_on_delivered
   serial_numbers ได้ warranty_starts_at / ends_at / status = 'active'
```

> เคสที่แก้: พิมพ์เลขพัสดุผิด (เช่น `aa xs245`) เดิม **แก้ไม่ได้ ลบไม่ได้** และบิลก็หายจาก picker แล้ว → ตัน

---

## 7. ค่าใช้จ่าย

**Path:** `/expenses` (รายการ) · `/expenses/new` (บันทึก)

```
เลือกประเภท: 🚚 ค่าขนส่ง / ⛽ ค่าน้ำมัน / 📋 อื่นๆ
กรอก: จำนวนเงิน / วันที่ / รายละเอียด
    ▼ INSERT expenses ──► redirect /reports
```

> **ค่าส่งพัสดุไม่ถูกสร้างเป็นแถวใน `expenses`** — แต่ถูก **sum จากตาราง `shipments`** ตอนคำนวณ
> (เลือก aggregate แทน duplicate เพื่อไม่ให้ข้อมูลเพี้ยนเวลาแก้/ลบพัสดุ)

---

## 8. รายงาน

**Path:** `/shop/[shopId]/reports`

```
เลือกเดือน ←/→ (ไปข้างหน้าได้ถึงเดือนปัจจุบัน)
    ▼
กำไรสุทธิ = ยอดขาย − ต้นทุนขาย(COGS) − ค่าใช้จ่ายอื่น − ค่าส่งพัสดุ

  ยอดขาย       Σ sales.total_amount            (ของเดือนนั้น)
  ต้นทุนขาย     Σ sale_items.unit_cost × qty    ⭐ ของบิลที่ขายในเดือนนั้น
  ค่าใช้จ่าย     Σ expenses.amount
  ค่าส่งพัสดุ    Σ shipments.cost

+ การ์ดแยกต่างหาก "ซื้อสินค้าเข้าเดือนนี้" (Σ purchases) — **ไม่นำไปคิดกำไร**
+ กราฟยอดขายรายวัน (bar chart)
+ อัตรากำไร (%)
📥 Export CSV ──► sales-YYYY-MM.csv (มี BOM สำหรับ Excel ไทย)
```

> ⭐ **บัคเดิมที่แก้ไปแล้ว:** เคยเอา `purchases.total_amount` ของเดือนนั้นมาเป็นต้นทุน
> → ซื้อเดือน มิ.ย. 10,000 แล้วขายเดือน ก.ค. 15,000 จะได้ **มิ.ย. −10,000 / ก.ค. +15,000**
> ทั้งที่ควรเป็น **มิ.ย. 0 / ก.ค. +5,000**
> **COGS ≠ เงินที่จ่ายซื้อของ** — ต้นทุนต้องเดินตาม "ของที่ขายออกไป" ไม่ใช่ "ของที่ซื้อเข้ามา"

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
    │                     └── เพิ่มด้วย LINE User ID + role (staff/finance)
    │
    ├── [ทั่วไป]
    │     └── ภาษา ──► /settings/language ──► ไทย 🇹🇭 / English 🇬🇧
    │
    └── [บัญชี]
          └── เปลี่ยนร้านค้า ──► ล้าง store + localStorage ──► /
```

---

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

---

## Side Effects อัตโนมัติ (Triggers)

| Event | Trigger | ผล |
|-------|---------|-----|
| INSERT sale_items | trg_deduct_stock_on_sale | products.stock -= quantity |
| DELETE sale_items | trg_restore_stock_on_delete | products.stock += quantity |
| INSERT purchase_items | fn_add_stock_on_purchase | stock += qty **และเขียนทับ cost_price** ⚠️ |
| UPDATE shipments → delivered | trg_warranty_on_delivered | serial_numbers ได้ warranty dates |
| ทุกวัน 00:00 UTC | pg_cron | serial_numbers.warranty_status อัปเดต |

---

## SQL ที่ต้องรันใน Supabase SQL Editor

| ไฟล์ | จำเป็น? |
|------|---------|
| `supabase/storage-policies.sql` | ✅ ไม่รัน = **อัปโหลดรูปสินค้า/สลิปพัง** |
| `supabase/fix-cogs.sql` | ✅ ไม่รัน = แอปพัง (`sale_items.unit_cost`) |
| `supabase/add-delivery-method.sql` | ✅ ไม่รัน = แอปพัง (`sales.delivery_method`) |
| `supabase/reset-shop-data.sql` | ⬜ ใช้ตอนอยากล้างข้อมูลร้าน (เก็บสมาชิกไว้) |

---

## หน้าที่ยังไม่มี (ต้องสร้าง)

| Path | หน้าที่ |
|------|---------|
| `/customers` | รายการลูกค้า |
| `/customers/[id]` | ประวัติการซื้อของลูกค้า |
