# Khaai (ขาย)

ระบบบันทึกซื้อขายสำหรับร้านค้าขนาดเล็ก ผ่าน LINE LIFF

## Stack

- **Frontend**: Next.js 14 (App Router) + TypeScript + Tailwind CSS
- **Backend**: Supabase (PostgreSQL + RLS + Storage + pg_cron)
- **Auth**: LINE LIFF (userId) → ตรวจสอบผ่าน shop_members table
- **Bot**: LINE Messaging API webhook (`/api/webhook`)
- **Deploy**: Vercel (frontend) + Supabase (backend)

## โครงสร้างโปรเจค

```
src/
├── app/
│   ├── page.tsx                    # landing page
│   ├── shop/[shopId]/
│   │   ├── layout.tsx              # LIFF init + auth guard
│   │   ├── page.tsx                # dashboard
│   │   ├── sales/page.tsx          # ประวัติขาย
│   │   ├── sales/new/page.tsx      # บันทึกขาย
│   │   ├── purchases/page.tsx      # ประวัติซื้อ
│   │   ├── products/page.tsx       # รายการสินค้า
│   │   ├── shipments/page.tsx      # พัสดุ
│   │   └── reports/page.tsx        # รายงาน P&L
│   └── api/webhook/route.ts        # LINE Bot webhook
├── components/
│   └── BottomNav.tsx
├── hooks/
│   └── useShop.ts                  # LIFF init + shop auth
├── lib/
│   ├── supabase.ts
│   ├── liff.ts
│   ├── types.ts
│   └── format.ts
└── store/
    └── shopStore.ts                # Zustand global state
```

## Setup

### 1. Clone & install

```bash
cd line-backoffice
npm install
cp .env.local.example .env.local
```

### 2. Supabase

1. สร้าง project ใหม่ที่ [supabase.com](https://supabase.com)
2. รัน `supabase/schema.sql` ใน SQL Editor
3. เปิด Storage bucket ชื่อ `slips` (public)
4. คัดลอก URL และ anon key ใส่ `.env.local`

### 3. LINE LIFF

1. เข้า [LINE Developers Console](https://developers.line.biz)
2. สร้าง Provider → Channel (LINE Login)
3. เพิ่ม LIFF app → type: **Full** → Endpoint URL: `https://your-app.vercel.app/shop/{shopId}`
4. คัดลอก LIFF ID ใส่ `NEXT_PUBLIC_LIFF_ID`

### 4. LINE Bot (Messaging API)

1. สร้าง Messaging API channel ใน LINE Developers
2. Webhook URL: `https://your-app.vercel.app/api/webhook`
3. เปิด "Use webhook"
4. คัดลอก Channel Secret และ Access Token

### 5. Deploy to Vercel

```bash
npx vercel --prod
```

ใส่ environment variables ทั้งหมดใน Vercel Dashboard

### 6. สร้างร้านแรก (SQL)

```sql
-- ใส่ใน Supabase SQL Editor
insert into shops (slug, name, owner_line_uid) values ('my-shop', 'ร้านของฉัน', 'Uxxxxxxxxxxxxxxxx');
insert into shop_members (shop_id, line_uid, role) values ((select id from shops where slug = 'my-shop'), 'Uxxxxxxxxxxxxxxxx', 'owner');
```

จากนั้นเปิด: `https://liff.line.me/{LIFF_ID}?shopId=my-shop`

## คำสั่ง LINE Bot

| คำสั่ง | ผลลัพธ์ |
|--------|---------|
| `/ยอด` | ยอดขายวันนี้ |
| `/stock` | รายการสินค้าสต็อกต่ำ |
| `/ship` | พัสดุที่กำลังส่ง |

## RLS (Row Level Security)

ทุก table ป้องกันด้วย `is_shop_member()` function  
ต้องตั้งค่า `app.line_uid` ผ่าน Supabase client header ก่อนทุก query
