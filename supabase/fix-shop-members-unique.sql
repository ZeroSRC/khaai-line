-- ─────────────────────────────────────────────────────────────
-- FIX: shop_members ยังใช้ unique constraint แบบเดิม (ไม่ผ่าน soft-delete)
-- ─────────────────────────────────────────────────────────────
-- add-soft-delete.sql แก้ปัญหานี้ให้ serial_numbers แล้ว แต่พลาด shop_members ไป
-- อาการ: ลบสมาชิก (soft-delete) แล้วเพิ่ม LINE UID เดิมกลับเข้ามาใหม่ (ผ่านปุ่ม
-- "เพิ่มด้วย LINE UID" หรือ join ผ่านลิงก์/QR อีกครั้ง) → insert ชนกับแถวเดิมที่ยัง
-- ฝังอยู่จริงในตาราง (แค่ sys_del_flag='Y') → error "duplicate key value violates
-- unique constraint" แต่ RLS กรองแถวนั้นออกจาก SELECT ไปแล้ว จึงมองไม่เห็นว่ามีอยู่
-- ─────────────────────────────────────────────────────────────

alter table shop_members drop constraint if exists shop_members_shop_id_line_uid_key;

create unique index if not exists shop_members_uq_active
  on shop_members (shop_id, line_uid) where sys_del_flag = 'N';
