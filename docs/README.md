# Khaai (ขาย) — Developer Documentation

ระบบ backoffice SaaS สำหรับร้านค้าขนาดเล็ก รันบน LINE LIFF (Line Front-end Framework)

---

## สารบัญ

1. [ภาพรวม](#ภาพรวม)
2. [Tech Stack](#tech-stack)
3. [โครงสร้างโปรเจกต์](#โครงสร้างโปรเจกต์)
4. [Architecture](#architecture)
5. [Database Schema](#database-schema)
6. [Auth Flow](#auth-flow)
7. [Row Level Security (RLS)](#row-level-security)
8. [LINE Bot Webhook](#line-bot-webhook)
9. [API Routes](#api-routes)
10. [หน้าต่างๆ (Pages)](#หน้าต่างๆ)
11. [Environment Variables](#environment-variables)
12. [การติดตั้งและ Setup](#การติดตั้งและ-setup)
13. [Deployment](#deployment)
14. [Known Limitations](#known-limitations)

---

## ภาพรวม

**Khaai** เป็น multi-tenant SaaS ที่ให้เจ้าของร้านค้าขนาดเล็กบริหารจัดการ:
- บันทึกการขาย / การซื้อ
- จัดการสินค้าและสต็อก
- ติดตามพัสดุและการจัดส่ง
- ดูรายงานกำไร/ขาดทุนรายเดือน
- รับ notification และ query ข้อมูลผ่าน LINE Bot

แอปออกแบบให้รันใน **LINE LIFF** (in-app browser ของ LINE) และใช้ LINE userId เป็น identity แทน email/password

---

## Tech Stack

| Layer | Technology | Version |
|---|---|---|
| Framework | Next.js (App Router) | 14.2.5 |
| Database | Supabase (PostgreSQL) | @supabase/supabase-js ^2.45 |
| Auth | LINE LIFF SDK | @line/liff ^2.24 |
| State Management | Zustand | ^5.0 |
| Form | React Hook Form + Zod | ^7.53 / ^3.23 |
| UI | Tailwind CSS | ^3.4 |
| Date | dayjs | ^1.11 |
| Utility | clsx | ^2.1 |
| Runtime | Node.js / Vercel Edge | — |

---

## โครงสร้างโปรเจกต์

```
khaai/
├── src/
│   ├── app/
│   │   ├── layout.tsx                    # Root layout
│   │   ├── page.tsx                      # หน้าเลือกร้านค้า (/)
│   │   ├── register/
│   │   │   └── page.tsx                  # สร้างร้านใหม่ (/register)
│   │   ├── api/
│   │   │   ├── webhook/route.ts          # LINE Bot webhook
│   │   │   ├── auth/line/route.ts        # Verify LINE idToken
│   │   │   └── ping/route.ts             # Supabase keep-alive
│   │   └── shop/[shopId]/
│   │       ├── layout.tsx                # LIFF init + auth guard
│   │       ├── page.tsx                  # Dashboard
│   │       ├── join/page.tsx             # เข้าร่วมร้านด้วยลิงก์เชิญ
│   │       ├── sales/
│   │       │   ├── page.tsx              # ประวัติการขาย
│   │       │   └── new/page.tsx          # บันทึกการขาย
│   │       ├── purchases/
│   │       │   └── page.tsx              # ประวัติการซื้อ
│   │       ├── products/
│   │       │   └── page.tsx              # จัดการสินค้า
│   │       ├── shipments/
│   │       │   ├── page.tsx              # ติดตามพัสดุ
│   │       │   └── new/page.tsx          # เพิ่มพัสดุใหม่
│   │       ├── reports/
│   │       │   └── page.tsx              # รายงานรายเดือน
│   │       └── settings/
│   │           └── members/page.tsx      # จัดการสมาชิกร้าน
│   ├── components/
│   │   └── BottomNav.tsx                 # Navigation bar 5 tabs
│   ├── hooks/
│   │   └── useShop.ts                    # LIFF init + shop/member fetch
│   ├── lib/
│   │   ├── liff.ts                       # LINE LIFF helpers
│   │   ├── supabase.ts                   # Supabase client factory
│   │   ├── format.ts                     # formatMoney, formatDate utils
│   │   └── types.ts                      # TypeScript interfaces ทั้งหมด
│   └── store/
│       └── shopStore.ts                  # Zustand global store
├── supabase/
│   └── schema.sql                        # Full DB schema (run once)
├── .env.local.example                    # ตัวอย่าง env vars
└── CLAUDE.md                             # คำแนะนำสำหรับ Claude Code
```

---

## Architecture

### Multi-tenancy

แต่ละร้านค้า (tenant) ระบุด้วย **slug** ใน URL:

```
https://app.com/shop/onestore   → ร้าน "onestore"
https://app.com/shop/myshop     → ร้าน "myshop"
```

ทุก table ใน DB มี `shop_id uuid` และถูกกรองด้วย RLS ทุกครั้ง

### Data Flow

```
User กดเปิดใน LINE
  └── /shop/[shopId]/layout.tsx
        └── useShopInit(slug)
              ├── initLiff() → liff.login() (ถ้ายังไม่ login)
              ├── liff.getProfile() → { userId, displayName, pictureUrl }
              ├── createSupabaseClient(userId) → client พร้อม x-line-uid header
              ├── SELECT shops WHERE slug = ?  → ตรวจ RLS
              ├── SELECT shop_members WHERE shop_id = ? AND line_uid = ?
              └── setShop() + setMember() → Zustand store

ทุกหน้าใต้ /shop/[shopId]
  └── useShopStore() → { shop, member, lineUid } (ไม่ต้อง fetch ซ้ำ)
```

### Supabase Client

```typescript
// ทุกครั้งที่ query ต้องสร้าง client พร้อม lineUid
const sb = createSupabaseClient(lineUid)

// Client จะส่ง header: { 'x-line-uid': lineUid }
// Supabase อ่านจาก current_setting('request.headers') → RLS ทำงาน
```

---

## Database Schema

### Tables หลัก

```
shops               — ข้อมูลร้านค้า (tenant root)
shop_members        — สมาชิกของร้าน (owner / staff / finance)
products            — สินค้า
tags                — tag สำหรับหมวดหมู่สินค้า
product_tag_map     — many-to-many products ↔ tags
customers           — ลูกค้า
customer_addresses  — ที่อยู่ลูกค้า
sales               — รายการขาย (header)
sale_items          — รายการสินค้าในบิล
serial_numbers      — serial number ของสินค้า (สำหรับสินค้า has_serial)
purchases           — รายการซื้อสินค้า
purchase_items      — รายการสินค้าที่ซื้อ
shipments           — พัสดุจัดส่ง
expenses            — ค่าใช้จ่ายอื่นๆ
bank_accounts       — บัญชีธนาคารของร้าน
audit_logs          — log การแก้ไขข้อมูล
```

### Triggers อัตโนมัติ

| Trigger | เงื่อนไข | ผลลัพธ์ |
|---|---|---|
| `trg_deduct_stock_on_sale` | INSERT sale_items | หัก products.stock |
| `trg_restore_stock_on_delete` | DELETE sale_items | คืน products.stock |
| `trg_warranty_on_delivered` | UPDATE shipments SET status='delivered' | set warranty_starts/ends_at ใน serial_numbers |

### pg_cron Job

```sql
-- รันทุกเที่ยงคืน UTC
-- อัปเดต warranty_status: active → expiring_soon → expired
cron.schedule('refresh-warranty-status', '0 0 * * *', ...)
```

### Enums (ใช้เป็น text)

```
Plan:            free | pro
MemberRole:      owner | staff | finance
SerialStatus:    in_stock | sold | shipped | delivered
WarrantyStatus:  pending | active | expiring_soon | expired
ShipmentStatus:  pending | shipped | delivered
SlipType:        transfer | cash | null
ExpenseCategory: fuel | shipping | other
```

---

## Auth Flow

Khaai **ไม่ใช้ Supabase Auth** — ใช้ LINE userId จาก LIFF แทน

```
1. User เปิด LIFF URL
2. liff.init({ liffId }) → initialize LIFF
3. liff.isLoggedIn() → false → liff.login() → redirect ไป LINE login
4. LINE login สำเร็จ → redirect กลับมา
5. liff.getProfile() → { userId, displayName, pictureUrl }
6. userId ส่งเป็น header 'x-line-uid' ทุก Supabase request
7. Supabase RLS อ่าน header นี้เพื่อตรวจสิทธิ์
```

### ข้อจำกัดด้านความปลอดภัย

- `x-line-uid` header ไม่ได้ถูก verify cryptographically — ใครที่รู้ userId และเรียก Supabase API โดยตรงสามารถปลอมได้
- สำหรับความปลอดภัยสูงขึ้น ควร verify `liff.getIDToken()` กับ LINE API ที่ server ก่อน
- ในทางปฏิบัติ: แอป LIFF ทำงานในสภาพแวดล้อม LINE ที่ควบคุมแล้ว ความเสี่ยงต่ำสำหรับ small shop SaaS

---

## Row Level Security

```sql
-- Helper function อ่าน line_uid จาก request header
create function is_shop_member(p_shop_id uuid)
returns boolean as $$
  select exists (
    select 1 from shop_members
    where shop_id = p_shop_id
      and line_uid = coalesce(
        current_setting('app.line_uid', true),
        current_setting('request.headers', true)::json->>'x-line-uid'
      )
  );
$$;

-- ทุก table ใช้ policy เดียวกัน
create policy "shop members only" on shops using (is_shop_member(id));
create policy "shop members only" on products using (is_shop_member(shop_id));
-- ... (ทุก table)
```

### INSERT Policies (สำหรับ register และ join)

```sql
-- ใครก็สร้างร้านได้ ถ้า owner_line_uid = ตัวเอง
create policy "anyone can create shop" on shops
  for insert with check (
    owner_line_uid = current_setting('request.headers', true)::json->>'x-line-uid'
  );

-- เพิ่ม member ได้ถ้าเป็นสมาชิกร้านอยู่แล้ว (สำหรับ owner invite)
create policy "members can insert shop_members" on shop_members
  for insert with check (is_shop_member(shop_id));

-- ลบ member ได้ถ้าเป็นสมาชิกร้าน
create policy "owner can remove members" on shop_members
  for delete using (is_shop_member(shop_id));
```

---

## LINE Bot Webhook

**Endpoint:** `POST /api/webhook`

### การทำงาน

1. ตรวจ HMAC-SHA256 signature จาก `x-line-signature` header ก่อนทุกครั้ง
2. Filter เฉพาะ event type `message` + `text`
3. ค้นหา shop จาก `shop_members` ด้วย `line_uid` ของผู้ส่ง
4. ตอบกลับตาม command

### Commands

| Command | ตอบกลับ |
|---|---|
| `/ยอด` หรือ `ยอด` | ยอดขายวันนี้ + จำนวนออเดอร์ |
| `/stock` หรือ `สต็อก` | รายการสินค้าที่สต็อก < 3 |
| `/ship` หรือ `พัสดุ` | พัสดุที่กำลังส่ง (status=shipped) สูงสุด 5 รายการ |
| อื่นๆ | help menu |

### ตั้งค่า Webhook URL

```
LINE Developers → Messaging API channel → Webhook settings
URL: https://your-domain.com/api/webhook
กด Verify ✅
```

---

## API Routes

### `GET /api/ping`
Keep-alive สำหรับ Supabase free tier ป้องกัน project pause

```json
{ "ok": true, "ts": "2026-01-01T00:00:00.000Z" }
```

### `POST /api/auth/line`
Verify LINE idToken กับ LINE API (ปัจจุบัน disabled ใน useShop.ts)

```json
// Request
{ "idToken": "eyJ..." }

// Response
{ "lineUid": "Uxxxx", "displayName": "ชื่อ", "pictureUrl": "https://..." }
```

### `POST /api/webhook`
LINE Bot webhook — ดู [LINE Bot Webhook](#line-bot-webhook)

---

## หน้าต่างๆ

### Public Pages

| URL | หน้า | คำอธิบาย |
|---|---|---|
| `/` | Shop Selector | พิมพ์ slug → redirect ไปร้าน |
| `/register` | Register | สร้างร้านใหม่ด้วย LINE account |
| `/shop/[slug]/join` | Join | เข้าร่วมร้านด้วยลิงก์เชิญ |

### Shop Pages (ต้อง login + เป็นสมาชิกร้าน)

| URL | หน้า | คำอธิบาย |
|---|---|---|
| `/shop/[slug]` | Dashboard | stats วันนี้/เดือนนี้, alert, quick actions |
| `/shop/[slug]/sales` | ประวัติขาย | รายการขาย 50 รายการล่าสุด |
| `/shop/[slug]/sales/new` | บันทึกขาย | เพิ่มสินค้าลง cart, เลือกชำระเงิน, upload สลิป |
| `/shop/[slug]/purchases` | ประวัติซื้อ | รายการซื้อสินค้า |
| `/shop/[slug]/products` | สินค้า | list + search + filter (all/S/N/low stock) |
| `/shop/[slug]/shipments` | พัสดุ | ติดตามสถานะ, ยืนยันส่งถึง |
| `/shop/[slug]/shipments/new` | เพิ่มพัสดุ | เลือกขนส่ง, ใส่เลขพัสดุ |
| `/shop/[slug]/reports` | รายงาน | P&L รายเดือน เลือก month ได้ |
| `/shop/[slug]/settings/members` | สมาชิก | เชิญ, เพิ่มด้วย userId, ลบสมาชิก |

### Bottom Navigation (5 tabs)

```
🏠 หน้าแรก  →  /shop/[slug]
💰 ขาย      →  /shop/[slug]/sales
📦 ซื้อ      →  /shop/[slug]/purchases
🚚 พัสดุ     →  /shop/[slug]/shipments
📊 รายงาน   →  /shop/[slug]/reports
```

### หน้าที่ยังไม่มี (TODO)

- `/shop/[slug]/products/new` — เพิ่มสินค้าใหม่
- `/shop/[slug]/products/[id]` — แก้ไขสินค้า
- `/shop/[slug]/purchases/new` — บันทึกการซื้อ
- `/shop/[slug]/sales/[id]` — รายละเอียดบิล
- `/shop/[slug]/settings` — ตั้งค่าร้าน (VAT, ชื่อร้าน ฯลฯ)

---

## Environment Variables

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# LINE LIFF (LINE Login channel)
NEXT_PUBLIC_LIFF_ID=1234567890-AbCdEfGh

# LINE Messaging API (Bot)
LINE_CHANNEL_ID=1234567890          # Channel ID ของ LINE Login channel
LINE_CHANNEL_SECRET=abc123...       # Channel Secret ของ Messaging API
LINE_CHANNEL_ACCESS_TOKEN=AbCd...   # Long-lived token ของ Messaging API

# App
NEXT_PUBLIC_APP_URL=https://your-app.vercel.app
```

### หา Keys จากที่ไหน

| Variable | ที่มา |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase Dashboard → Project Settings → API → Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → API → Legacy anon key (JWT format `eyJ...`) |
| `NEXT_PUBLIC_LIFF_ID` | LINE Developers → LINE Login channel → LIFF tab → LIFF ID |
| `LINE_CHANNEL_ID` | LINE Developers → LINE Login channel → Basic settings → Channel ID |
| `LINE_CHANNEL_SECRET` | LINE Developers → Messaging API channel → Basic settings → Channel secret |
| `LINE_CHANNEL_ACCESS_TOKEN` | LINE Developers → Messaging API channel → Messaging API tab → Issue token |

---

## การติดตั้งและ Setup

### ขั้นที่ 1 — Clone และ Install

```bash
git clone https://github.com/ZeroSRC/khaai.git
cd khaai
npm install
```

### ขั้นที่ 2 — Supabase

1. สร้าง project ที่ [supabase.com](https://supabase.com)
2. ไปที่ **SQL Editor** → paste ทั้งหมดจาก `supabase/schema.sql` → Run
3. Copy URL และ anon key (Legacy) → ใส่ใน `.env.local`

### ขั้นที่ 3 — LINE Developers

สร้าง Provider แล้วสร้าง 2 channels:

**Channel 1: LINE Login** (สำหรับ LIFF)
- Type: LINE Login
- LIFF tab → Add → Size: Full → Endpoint URL: `http://localhost:3000`
- Copy LIFF ID → `NEXT_PUBLIC_LIFF_ID`
- Copy Channel ID → `LINE_CHANNEL_ID`

**Channel 2: Messaging API** (สำหรับ Bot)
- Type: Messaging API
- Basic settings → Copy Channel secret → `LINE_CHANNEL_SECRET`
- Messaging API tab → Issue token → `LINE_CHANNEL_ACCESS_TOKEN`

### ขั้นที่ 4 — ตั้งค่า .env.local

```bash
cp .env.local.example .env.local
# แก้ค่าทุก variable ด้วยค่าจริง
```

### ขั้นที่ 5 — สร้างร้านแรก

รัน SQL ใน Supabase SQL Editor:

```sql
INSERT INTO shops (slug, name, owner_line_uid, plan)
VALUES ('myshop', 'ชื่อร้าน', 'Uxxxxxxxx', 'free');

INSERT INTO shop_members (shop_id, line_uid, display_name, role)
VALUES (
  (SELECT id FROM shops WHERE slug = 'myshop'),
  'Uxxxxxxxx',
  'เจ้าของ',
  'owner'
);
```

หรือสร้างผ่านหน้า `/register` หลัง deploy แล้ว

### ขั้นที่ 6 — รัน Dev Server

```bash
npm run dev
# เปิด http://localhost:3000
```

> หมายเหตุ: LIFF login จะทำงานได้จริงเฉพาะใน LINE app — browser ปกติจะ redirect loop

---

## Deployment

### Vercel (แนะนำ)

1. Push ขึ้น GitHub
2. [vercel.com](https://vercel.com) → Import repo
3. Settings → Environment Variables → เพิ่มทุกตัวจาก `.env.local`
4. Deploy
5. อัปเดต LIFF Endpoint URL → `https://your-app.vercel.app`
6. ตั้ง Webhook URL → `https://your-app.vercel.app/api/webhook`

### npm Scripts

```bash
npm run dev          # dev server
npm run build        # production build
npm run lint         # ESLint
npm run db:types     # generate TypeScript types จาก Supabase schema
```

### Supabase Keep-Alive

Supabase free tier pause หลัง 7 วันไม่มี activity

ตั้ง cron job ที่ [cron-job.org](https://cron-job.org) → GET `https://your-app.vercel.app/api/ping` ทุก 3 วัน

---

## Known Limitations

| ข้อจำกัด | รายละเอียด |
|---|---|
| LIFF ใช้ได้ใน LINE app เท่านั้น | Browser ปกติ login ได้แต่ไม่ได้รับประสบการณ์เต็ม |
| Supabase free tier pause | แก้ด้วย keep-alive ping |
| LINE userId ไม่ verified | ดู [Auth Flow](#auth-flow) — ใช้ idToken verify เพิ่มความปลอดภัยได้ |
| ไม่มี push notification | ต้อง user เปิดแอปเองเพื่อดูข้อมูล (Bot ตอบ query ได้) |
| UI width 430px | ออกแบบสำหรับมือถือเท่านั้น |
| Serial number ยังไม่ครบ | หน้า assign serial ยังไม่มี |
