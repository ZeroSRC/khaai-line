# Goal & Target Version — Khaai

อัปเดตล่าสุด: 2026-07-06

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

### สินค้า
- [x] รายการสินค้า (`/products`)
- [x] เพิ่มสินค้าใหม่ (`/products/new`)
- [x] แก้ไข / toggle แสดง / ลบสินค้า (`/products/[id]`)

### ขาย
- [x] รายการบิล (`/sales`)
- [x] บันทึกการขาย + อัปโหลดสลิป (`/sales/new`)
- [x] รายละเอียดบิล (`/sales/[id]`)

### ซื้อ
- [x] รายการซื้อ (`/purchases`)
- [x] บันทึกซื้อ + อัปโหลดสลิป (`/purchases/new`)
- [x] รายละเอียดการซื้อ (`/purchases/[id]`)

### พัสดุ
- [x] รายการพัสดุ (`/shipments`)
- [x] สร้างพัสดุใหม่ (`/shipments/new`)
- [x] รายละเอียดพัสดุ (`/shipments/[id]`)

### ค่าใช้จ่าย
- [x] บันทึกค่าใช้จ่าย (`/expenses/new`)
- [x] รายการค่าใช้จ่าย (`/expenses`)

### รายงาน
- [x] P&L รายเดือน + อัตรากำไร
- [x] กราฟยอดขายรายวัน
- [x] Export CSV (รองรับภาษาไทยใน Excel)

### ลูกค้า
- [ ] รายการลูกค้า (`/customers`)
- [ ] รายละเอียดลูกค้า + ประวัติซื้อ (`/customers/[id]`)

> **khaai-web** track แยกที่ `khaai-web/goal-target-version.md`

---

## Database / Infra (ต้องทำก่อน deploy)

- [x] รัน SQL fix ใน Supabase SQL Editor — `current_line_uid()` + `is_shop_member()` + INSERT policies
- [ ] แก้ `.env` — `LINE_CHANNEL_SECRET` กับ `LINE_CHANNEL_ACCESS_TOKEN` ค่าเหมือนกัน ทำให้ webhook verify signature ผิดพลาด
