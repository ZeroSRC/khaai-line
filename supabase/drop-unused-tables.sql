-- ─────────────────────────────────────────────────────────────
-- ลบตารางที่สร้างไว้แต่ยังไม่ได้ใช้
-- ─────────────────────────────────────────────────────────────
-- ⚠️ ลบตารางกู้คืนไม่ได้ — สำรอง (pg_dump) ก่อนถ้ากังวล
-- ตรวจแล้ว: ไม่มีโค้ดแอปเรียกตารางเหล่านี้เลย (from()/rpc()/join = 0)
--
-- ❗ NOT dropping `serial_numbers` — เป็นแกนระบบประกัน
--    (trg_warranty_on_delivered เขียนลงมัน · pg_cron อัปเดต · ฟังก์ชันลบ cascade อ้างถึง)
-- ─────────────────────────────────────────────────────────────

-- ── ส่วนที่ 1: ลบได้ปลอดภัย (leaf tables ไม่มีใครอ้างถึง) ──────
drop table if exists product_tag_map;   -- ลบก่อน (อ้าง products + tags)
drop table if exists tags;
drop table if exists bank_accounts;
drop table if exists audit_logs;

-- ── ส่วนที่ 2: ระบบลูกค้า (ตัดออกจาก roadmap แล้ว) ─────────────
-- ต้องปลดคอลัมน์ FK ที่ตายแล้วก่อน (app ไม่เคย set ค่าพวกนี้)
alter table sales     drop column if exists customer_id;
alter table shipments drop column if exists address_id;

drop table if exists customer_addresses;  -- ลบก่อน (อ้าง customers)
drop table if exists customers;

-- ─────────────────────────────────────────────────────────────
-- ตรวจผล: ควรเหลือเฉพาะตารางที่ใช้จริง
-- ─────────────────────────────────────────────────────────────
select tablename from pg_tables
where schemaname = 'public'
order by tablename;
