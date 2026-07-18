-- ─────────────────────────────────────────────────────────────
-- SOFT DELETE — ทุกตารางเพิ่ม sys_del_flag ('N'/'Y') + last_upd_by
-- ─────────────────────────────────────────────────────────────
-- แนวคิด:
--   • ทุก query ที่ "ค้นหา/อ่าน" ต้อง where sys_del_flag = 'N'
--   • การ "ลบ" = update sys_del_flag 'N' → 'Y' (ไม่ลบจริง)
--   • last_upd_by = LINE uid ของคนแก้ล่าสุด
--
-- ⚠️ trigger stock (trg_restore_stock_on_delete) ยิงตอน DELETE จริงเท่านั้น
--    พอเปลี่ยนเป็น soft-delete มันจะไม่ยิง → ฟังก์ชัน soft-delete จัดการ stock เอง
--    (ดู delete-cascade.sql เวอร์ชันใหม่)
-- ─────────────────────────────────────────────────────────────

do $$
declare
  t text;
  tables text[] := array[
    'shops','shop_members','products','sales','sale_items',
    'serial_numbers','purchases','purchase_items','shipments','expenses'
  ];
begin
  foreach t in array tables loop
    execute format('alter table %I add column if not exists sys_del_flag char(1) not null default ''N''', t);
    execute format('alter table %I add column if not exists last_upd_by text', t);
    -- ดัชนีให้ filter sys_del_flag เร็ว
    execute format('create index if not exists %I on %I (sys_del_flag)', t || '_del_flag_idx', t);
    -- จำกัดค่าให้เป็น N/Y เท่านั้น
    begin
      execute format('alter table %I add constraint %I check (sys_del_flag in (''N'',''Y''))', t, t || '_del_flag_chk');
    exception when duplicate_object then null;
    end;
  end loop;
end $$;

-- ── serial_numbers: unique เดิมกันซ้ำแม้แถวถูก soft-delete แล้ว ──
-- เปลี่ยนเป็น partial unique เฉพาะแถวที่ยัง active (sys_del_flag='N')
-- เพื่อให้ลบแล้วยังเพิ่ม serial เดิมซ้ำได้
alter table serial_numbers drop constraint if exists serial_numbers_shop_id_product_id_serial_code_key;
create unique index if not exists serial_numbers_uq_active
  on serial_numbers (shop_id, product_id, serial_code) where sys_del_flag = 'N';

-- ─────────────────────────────────────────────────────────────
-- กรองอัตโนมัติที่ RLS: ทุก SELECT จะไม่เห็นแถวที่ soft-delete แล้ว
-- ─────────────────────────────────────────────────────────────
-- ใส่ sys_del_flag='N' ใน "using" (คุมการอ่าน/อัปเดต) แต่ "with check" ไม่ใส่
--   → อ่าน = เห็นเฉพาะ active · แต่ยัง update N→Y ได้ (soft-delete ผ่าน)
-- ข้อดี: ไม่ต้องแก้ query ในแอปทีละจุด กันลืมกรอง

-- is_shop_member ต้องไม่นับสมาชิกที่ถูกลบ (soft-delete) ด้วย
create or replace function is_shop_member(p_shop_id uuid)
returns boolean language sql security definer as $$
  select exists (
    select 1 from shop_members
    where shop_id = p_shop_id
      and line_uid = current_line_uid()
      and sys_del_flag = 'N'
  );
$$;

-- ตารางข้อมูลหลัก (ใช้ is_shop_member(shop_id) เหมือนกันหมด)
do $$
declare
  t text;
  data_tables text[] := array[
    'products','sales','sale_items','serial_numbers',
    'purchases','purchase_items','shipments','expenses'
  ];
begin
  foreach t in array data_tables loop
    execute format('drop policy if exists "shop members only" on %I', t);
    execute format(
      'create policy "shop members only" on %I using (is_shop_member(shop_id) and sys_del_flag = ''N'') with check (is_shop_member(shop_id))', t);
  end loop;
end $$;

-- shop_members: ลบสมาชิก = soft-delete → ต้องหายจากลิสต์
drop policy if exists "shop members read/write" on shop_members;
create policy "shop members read/write" on shop_members
  using (is_shop_member(shop_id) and sys_del_flag = 'N')
  with check (is_shop_member(shop_id));

-- (shops ไม่มีฟีเจอร์ลบร้านในแอป จึงไม่ต้องกรอง sys_del_flag)

-- ตรวจผล
select tablename from pg_tables where schemaname = 'public' order by tablename;
