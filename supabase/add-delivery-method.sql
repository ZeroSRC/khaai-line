-- ─────────────────────────────────────────────────────────────
-- sales.delivery_method
-- ─────────────────────────────────────────────────────────────
-- ปัญหา: หน้า "เพิ่มพัสดุ" เลือกได้เฉพาะบิลที่ยังไม่ถูกผูกพัสดุ
-- แต่บิลที่ส่งมือ/รับหน้าร้านจะไม่มีวันถูกผูก → ค้างใน dropdown ตลอดไป
--
-- ระบบเดิมเดาจาก "ไม่มีพัสดุ = รอส่ง" ซึ่งเหมารวม 2 กรณีที่ต่างกัน
-- คอลัมน์นี้แยกให้ชัด:
--   ship   = ต้องจัดส่ง (ยังไม่ผูกพัสดุ = รอสร้างพัสดุจริง)
--   pickup = รับเอง / ส่งมือ (ไม่ต้องมีพัสดุ ไม่ต้องโผล่ใน dropdown)
-- ─────────────────────────────────────────────────────────────

alter table sales
  add column if not exists delivery_method text not null default 'ship';

alter table sales
  drop constraint if exists sales_delivery_method_check;

alter table sales
  add constraint sales_delivery_method_check
  check (delivery_method in ('ship', 'pickup'));

-- บิลเก่าทั้งหมดจะเป็น 'ship' (ค่า default)
-- ถ้ามีบิลเก่าที่รู้แน่ว่ารับเอง ให้เคลียร์ทีเดียวได้จากหน้ารายละเอียดบิลในแอป
-- หรือถ้าอยากปิดของเก่าทั้งหมดรวดเดียว (ระวัง: กระทบทุกบิลก่อนวันนี้):
--
--   update sales set delivery_method = 'pickup'
--   where shop_id = (select id from shops where slug = 'onestore')
--     and created_at < '2026-07-01'
--     and id not in (select sale_id from shipments where sale_id is not null);

create index if not exists sales_pending_shipment_idx
  on sales(shop_id, delivery_method);
