# Khaai — User Flow Library

เอกสารนี้อธิบาย flow การเดินทางของ user ผ่านทุกหน้าในแอพ
อัปเดตทุกครั้งที่เพิ่มหน้าใหม่หรือเปลี่ยน navigation

---

## ภาพรวม Navigation

```
LINE LIFF
    │
    ▼
/ (root)
    │── มี khaai_last_shop ใน localStorage ──► /shop/[slug]
    │
    └── ไม่มี ──► กรอก slug ──► /shop/[slug]
                                      │
                          layout.tsx ──► useShopInit(slug)
                                      │── เป็น member ──► โหลด Dashboard
                                      └── ไม่ใช่ member ──► Error / /join
```

### Bottom Navigation (5 tabs ตลอดเวลา)

```
หน้าแรก  |  ขาย  |  ซื้อ  |  พัสดุ  |  รายงาน
   🏠         💰       📦       🚚         📊
```

> ⚠️ **หมายเหตุ:** หน้า `/products` (สินค้า) **ไม่อยู่ใน bottom nav**  
> เข้าได้ผ่าน: Dashboard alert สต็อกต่ำ หรือ link ภายในแอพเท่านั้น  
> ควรพิจารณาเพิ่มทางเข้าให้ชัดเจนขึ้นในอนาคต

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
แสดงฟอร์มกรอก slug ร้านค้า
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
เปิด LIFF URL
    │
    ▼
/ ── initLiff() ── ดึง khaai_last_shop จาก localStorage
    │
    ▼ มีค่า
    │
    ▼
redirect อัตโนมัติไป /shop/[slug] ── ไม่ต้องกรอกอะไร
```

---

## 2. Dashboard — หน้าแรก

**Path:** `/shop/[shopId]`

### สิ่งที่เห็นบนหน้า

| ส่วน | เนื้อหา |
|------|---------|
| Header สีเขียว | รูป profile + ชื่อ + ชื่อร้าน + วันที่ |
| Card ยอดขายวันนี้ | ยอดเงิน + จำนวนออเดอร์ |
| Grid 2 ช่อง | ยอดขายเดือนนี้ / ค่าใช้จ่ายเดือนนี้ |
| Alert (ถ้ามี) | สต็อกใกล้หมด (< 3 ชิ้น) / พัสดุรอส่ง |
| เมนูด่วน | 4 ปุ่ม shortcut |

### Actions และปลายทาง

```
รูป profile ──► bottom sheet
    ├── ชื่อ + LINE UID (แสดงอย่างเดียว)
    └── ปุ่ม "เปลี่ยนร้านค้า"
            │
            ▼
            ล้าง localStorage + Zustand store
            redirect ไป / (หน้ากรอก slug)

⚙️ (settings) ──► /shop/[shopId]/settings/members

Alert สต็อกต่ำ ──► /shop/[shopId]/products?filter=low_stock
Alert พัสดุรอส่ง ──► /shop/[shopId]/shipments

เมนูด่วน:
  💰 บันทึกขาย  ──► /shop/[shopId]/sales/new
  📦 บันทึกซื้อ  ──► /shop/[shopId]/purchases/new
  🚚 ส่งพัสดุ   ──► /shop/[shopId]/shipments/new
  💸 ค่าใช้จ่าย ──► /shop/[shopId]/expenses/new
```

---

## 3. สินค้า

> เข้าได้จาก: Alert สต็อกต่ำ หรือ link ภายใน (ไม่มีใน bottom nav)

### 3a. รายการสินค้า

**Path:** `/shop/[shopId]/products`

```
รายการสินค้า (ค้นหา / filter: ทั้งหมด / มี S/N / สต็อกต่ำ)
    │
    ├── กด card สินค้า ──► /products/[id]  (แก้ไข)
    │
    └── "+ เพิ่มสินค้า" ──► /products/new
```

### 3b. เพิ่มสินค้าใหม่

**Path:** `/shop/[shopId]/products/new`

```
กรอก: ชื่อ / SKU / ราคาขาย / ราคาทุน / สต็อก / ประกัน(วัน)
    │
    ▼ บันทึก
    │
    INSERT products
    │
    ▼
redirect ──► /products
```

### 3c. แก้ไขสินค้า

**Path:** `/shop/[shopId]/products/[productId]`

```
แสดงข้อมูลเดิม พร้อมแก้ไขได้
    │
    ├── toggle "แสดงสินค้า" ── toggle is_active
    │
    ├── บันทึกการแก้ไข ──► UPDATE products ──► /products
    │
    └── ปุ่ม "ลบ" ──► confirm dialog ──► DELETE products ──► /products
```

---

## 4. ขาย

### 4a. รายการบิล

**Path:** `/shop/[shopId]/sales`

```
รายการบิลทั้งหมด (เรียงล่าสุดก่อน)
    │
    ├── กด card บิล ──► /sales/[id]  (รายละเอียด)
    │
    └── "+ บันทึกขาย" ──► /sales/new
```

### 4b. บันทึกการขาย

**Path:** `/shop/[shopId]/sales/new`

```
1. ค้นหา + เลือกสินค้า (เฉพาะ is_active=true, stock>0)
       │
       ▼ กดสินค้า
       เพิ่มลง cart (กดซ้ำ = เพิ่มจำนวน)

2. เลือกวิธีชำระ
       ├── 💳 โอนเงิน ──► แสดงช่อง upload รูปสลิป
       └── 💵 เงินสด

3. หมายเหตุ (optional)

4. กด "บันทึกขาย ฿X"
       │
       ▼
       ถ้ามีสลิป: upload ไป Supabase Storage → ได้ slip_url
       │
       INSERT sales (ref: SO-YYYYMMDD-XXX)
       INSERT sale_items (แต่ละสินค้าใน cart)
       │
       🔄 TRIGGER: trg_deduct_stock_on_sale
          UPDATE products.stock -= quantity (อัตโนมัติ)
       │
       ▼
       redirect ──► /sales
```

### 4c. รายละเอียดบิล

**Path:** `/shop/[shopId]/sales/[saleId]`

```
แสดง:
  - ยอดรวม + VAT + วันที่ + วิธีชำระ
  - รายการสินค้า (ชื่อ / ราคา × จำนวน)
  - รูปสลิป (ถ้ามี)
  - หมายเหตุ (ถ้ามี)

Actions: ← กลับ (ไม่มีแก้ไข/ลบ)
```

---

## 5. ซื้อ

### 5a. รายการซื้อ

**Path:** `/shop/[shopId]/purchases`

```
รายการซื้อทั้งหมด (เรียงล่าสุดก่อน)
    │
    ├── กด card ──► [ยังไม่มีหน้า /purchases/[id]]
    │
    └── "+ บันทึกซื้อ" ──► /purchases/new
```

### 5b. บันทึกการซื้อ

**Path:** `/shop/[shopId]/purchases/new`

```
1. ชื่อ Supplier (optional)

2. ค้นหา + เลือกสินค้า
       ▼ กดสินค้า
       เพิ่มลง cart พร้อมราคาทุนเดิม

3. ในแต่ละ item: ปรับจำนวน / แก้ราคาทุน

4. สลิปโอนเงิน (optional) ──► upload รูป

5. หมายเหตุ (optional)

6. กด "บันทึกการซื้อ ฿X"
       │
       ▼
       ถ้ามีสลิป: upload ไป Storage
       │
       INSERT purchases (ref: PO-YYYYMMDD-XXX)
       INSERT purchase_items (unit_cost, total_cost)
       UPDATE products.stock += quantity  (ต่อละรายการ)
       UPDATE products.cost_price = ราคาทุนใหม่
       │
       ▼
       redirect ──► /purchases
```

---

## 6. พัสดุ

### 6a. รายการพัสดุ

**Path:** `/shop/[shopId]/shipments`

```
รายการพัสดุ แบ่งตาม status (pending / shipped / delivered)
    │
    ├── กด card ──► [ยังไม่มีหน้า /shipments/[id]]
    │
    └── "+ สร้างพัสดุ" ──► /shipments/new
```

### 6b. สร้างพัสดุใหม่

**Path:** `/shop/[shopId]/shipments/new`

```
กรอก: เลข tracking / ผู้ให้บริการ / ที่อยู่ / ลิงก์บิล (sale)
    │
    ▼ บันทึก
    INSERT shipments (status = 'pending')
    │
    ▼
    เมื่อ update status → 'delivered' ในภายหลัง:
    🔄 TRIGGER: trg_warranty_on_delivered
       UPDATE serial_numbers: warranty_starts_at / warranty_ends_at / warranty_status = 'active'
```

---

## 7. ค่าใช้จ่าย

### 7a. บันทึกค่าใช้จ่าย

**Path:** `/shop/[shopId]/expenses/new`

> เข้าได้จาก: Dashboard quick action เท่านั้น

```
เลือกประเภท: 🚚 ค่าขนส่ง / ⛽ ค่าน้ำมัน / 📋 อื่นๆ
กรอก: จำนวนเงิน / วันที่ / รายละเอียด
    │
    ▼ บันทึก
    INSERT expenses
    │
    ▼
    redirect ──► /reports

[ยังไม่มีหน้ารายการค่าใช้จ่าย]
```

---

## 8. รายงาน

**Path:** `/shop/[shopId]/reports`

```
เลือกเดือน ←/→ (ไปข้างหน้าได้ถึงเดือนปัจจุบัน)
    │
    ▼
แสดง:
  - กำไรสุทธิ (ขาย − ซื้อ − ค่าใช้จ่าย)
  - กราฟยอดขายรายวัน (bar chart)
  - รายรับ / รายจ่ายซื้อสินค้า / ค่าใช้จ่ายอื่น / กำไรขั้นต้น
  - อัตรากำไร (%)

Actions:
  📥 Export CSV ──► download file: sales-YYYY-MM.csv
                    (มี BOM สำหรับภาษาไทยใน Excel)
```

---

## 9. Settings

**Path:** `/shop/[shopId]/settings/members`

```
รายการสมาชิกในร้าน (line_uid + role)
    │
    └── [ฟีเจอร์เพิ่มสมาชิก ขึ้นอยู่กับ implementation]
```

---

## Side Effects อัตโนมัติ (Triggers)

| Event | Trigger | ผล |
|-------|---------|-----|
| INSERT sale_items | trg_deduct_stock_on_sale | products.stock -= quantity |
| DELETE sale_items | trg_restore_stock_on_delete | products.stock += quantity |
| UPDATE shipments → delivered | trg_warranty_on_delivered | serial_numbers ได้ warranty dates |
| ทุกวัน 00:00 UTC | pg_cron | serial_numbers.warranty_status อัปเดต |

---

## หน้าที่ยังไม่มี (ต้องสร้าง)

| Path | หน้าที่ |
|------|---------|
| `/purchases/[id]` | รายละเอียดการซื้อ + ดูสลิป |
| `/shipments/[id]` | รายละเอียดพัสดุ + อัปเดต status |
| `/expenses` | รายการค่าใช้จ่ายย้อนหลัง |
| `/customers` | รายการลูกค้า |
| `/customers/[id]` | ประวัติการซื้อของลูกค้า |
