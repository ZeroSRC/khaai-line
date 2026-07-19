-- ─────────────────────────────────────────────────────────────
-- FIX: shop_members RLS ไม่กรอง sys_del_flag แล้ว (สมาชิกที่ลบยังโผล่ในลิสต์)
-- ─────────────────────────────────────────────────────────────
-- อาการ (พบจาก khaai-web 2026-07-19): ลบสมาชิกแล้ว (soft-delete) ยังเห็นในหน้าสมาชิกอยู่
-- เช็คตรงผ่าน REST API เจอแถว sys_del_flag='Y' หลุดออกมาจาก SELECT ปกติ
--
-- สาเหตุ: policy "shop members read/write" ตอนนี้ไม่มีเงื่อนไข sys_del_flag='N' แล้ว
-- ทั้งที่ add-soft-delete.sql เคยใส่ไว้ — สงสัยโดน migration/แก้มือหลังจากนั้นเขียนทับ
-- (เนื้อหาไฟล์นี้เหมือนส่วน shop_members ใน add-soft-delete.sql เป๊ะ แค่แยกมาให้รันซ้ำง่ายๆ)
--
-- กระทบทั้ง khaai (LIFF) และ khaai-web เพราะใช้ policy เดียวกัน
-- ─────────────────────────────────────────────────────────────

create or replace function is_shop_member(p_shop_id uuid)
returns boolean language sql security definer as $$
  select exists (
    select 1 from shop_members
    where shop_id = p_shop_id
      and line_uid = current_line_uid()
      and sys_del_flag = 'N'
  );
$$;

drop policy if exists "shop members read/write" on shop_members;
create policy "shop members read/write" on shop_members
  using (is_shop_member(shop_id) and sys_del_flag = 'N')
  with check (is_shop_member(shop_id));

-- ─────────────────────────────────────────────────────────────
-- ตรวจผล — ควรเห็นแค่แถวที่ sys_del_flag='N' เท่านั้น (แก้ shop_id ให้ตรงร้านจริง)
-- ─────────────────────────────────────────────────────────────
-- select id, line_uid, display_name, role, sys_del_flag from shop_members where shop_id = '...';
