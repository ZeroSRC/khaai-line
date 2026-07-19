-- ─────────────────────────────────────────────────────────────
-- เพิ่ม updated_at ให้ทุกตาราง + trigger อัปเดตอัตโนมัติ
-- ─────────────────────────────────────────────────────────────
-- shops/products มี updated_at อยู่แล้ว (ตั้งค่า now() เองในบาง trigger เฉพาะจุด เช่น
-- ตอนหักสต็อก) แต่ไม่ครอบคลุมการ update ทั่วไป (เช่น แก้ชื่อสินค้าตรงๆ) — เลยใส่ trigger
-- กลางให้ทุกตารางแทน กัน "ลืมตั้งค่า" แบบเดียวกับที่แก้ sys_del_flag ไปก่อนหน้านี้
--
-- ⚠️ ALTER TABLE ADD COLUMN ต่อคอลัมน์ท้ายตารางเสมอ ย้ายตำแหน่งให้อยู่ "ถัดจาก created_at"
--    ทางกายภาพไม่ได้ (ต้อง rebuild ตาราง ไม่คุ้ม) — ลำดับคอลัมน์ไม่กระทบการทำงานใดๆ
--    (แก้ให้ถูกตำแหน่งใน schema.sql สำหรับติดตั้งใหม่ตั้งแต่ต้นแล้ว)
-- ─────────────────────────────────────────────────────────────

do $$
declare
  t text;
  tables text[] := array[
    'shops', 'shop_members', 'products', 'sales', 'sale_items',
    'serial_numbers', 'purchases', 'purchase_items', 'shipments', 'expenses'
  ];
begin
  foreach t in array tables loop
    execute format('alter table %I add column if not exists updated_at timestamptz default now()', t);
  end loop;
end $$;

-- Trigger กลาง: ตั้ง updated_at = now() ทุกครั้งที่ update แถวไหนก็ตาม
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

do $$
declare
  t text;
  tables text[] := array[
    'shops', 'shop_members', 'products', 'sales', 'sale_items',
    'serial_numbers', 'purchases', 'purchase_items', 'shipments', 'expenses'
  ];
begin
  foreach t in array tables loop
    execute format('drop trigger if exists trg_set_updated_at on %I', t);
    execute format(
      'create trigger trg_set_updated_at before update on %I for each row execute function set_updated_at()', t);
  end loop;
end $$;

-- ─────────────────────────────────────────────────────────────
-- ตรวจผล
-- ─────────────────────────────────────────────────────────────
select table_name, column_name
from information_schema.columns
where table_schema = 'public' and column_name = 'updated_at'
order by table_name;
