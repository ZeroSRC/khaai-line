-- ─────────────────────────────────────────────────────────────
-- SHOPS: จำกัดการ "แก้ไขข้อมูลร้าน" ให้เฉพาะ owner
-- ─────────────────────────────────────────────────────────────
-- ปัญหาเดิม (schema.sql):
--   create policy "shop members read/write" on shops
--     using (is_shop_member(id)) with check (is_shop_member(id));
--
--   ไม่ได้ระบุ `for` → มีผลเป็น FOR ALL
--   = สมาชิก "ทุก role" (staff / finance) UPDATE ตาราง shops ได้
--   → เปลี่ยนชื่อร้าน, เปลี่ยน slug, เปลี่ยน plan, เปลี่ยน owner_line_uid ได้ด้วยซ้ำ
--
--   การซ่อนปุ่มใน UI กันได้แค่คนที่ไม่ตั้งใจ — ยิง API ตรงก็ทะลุ
--
-- แก้เป็น: อ่าน = สมาชิกทุกคน · แก้/ลบ = เฉพาะ owner
-- ─────────────────────────────────────────────────────────────

drop policy if exists "shop members read/write" on shops;
drop policy if exists "shops read by members"   on shops;
drop policy if exists "shops update by owner"   on shops;
drop policy if exists "shops delete by owner"   on shops;

-- อ่าน — สมาชิกทุกคนในร้าน
create policy "shops read by members"
on shops for select
using (is_shop_member(id));

-- แก้ไข — เฉพาะเจ้าของร้าน
-- with check กันไม่ให้ owner โยน owner_line_uid ให้คนอื่นแล้วล็อกตัวเองออก
create policy "shops update by owner"
on shops for update
using (owner_line_uid = current_line_uid())
with check (owner_line_uid = current_line_uid());

-- ลบ — เฉพาะเจ้าของร้าน
create policy "shops delete by owner"
on shops for delete
using (owner_line_uid = current_line_uid());

-- (policy "allow register shop" for insert ยังใช้ของเดิม ไม่ต้องแตะ)

-- ─────────────────────────────────────────────────────────────
-- ตรวจผล
-- ─────────────────────────────────────────────────────────────
select policyname, cmd, roles
from pg_policies
where schemaname = 'public' and tablename = 'shops';
