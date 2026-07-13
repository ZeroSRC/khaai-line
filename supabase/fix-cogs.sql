-- ─────────────────────────────────────────────────────────────
-- FIX: ต้นทุนขาย (COGS) — sale_items.unit_cost
-- ─────────────────────────────────────────────────────────────
-- ปัญหา:
--   1) sale_items เก็บแต่ราคา "ขาย" (unit_price) ไม่เก็บราคา "ทุน" ณ วันขาย
--   2) trigger fn_add_stock_on_purchase ทับ products.cost_price ทุกครั้งที่ซื้อของเข้า
--   → กำไรของบิลเก่าคำนวณจาก cost_price ปัจจุบัน = เปลี่ยนย้อนหลังทุกครั้งที่ซื้อของใหม่
--     และถ้าซื้อย้อนหลัง (back-date) ต้นทุนปัจจุบันจะถูกทับด้วยราคาล็อตเก่าไปเลย
--
-- แก้: snapshot ต้นทุนลงในบรรทัดขาย ตอนที่ขาย — ตัวเลขจะนิ่งถาวร ไม่ขยับตามการซื้อภายหลัง
-- ─────────────────────────────────────────────────────────────

alter table sale_items
  add column if not exists unit_cost numeric(12,2) not null default 0;

-- Backfill บิลเก่า: ใช้ cost_price ปัจจุบันเป็นค่าประมาณที่ดีที่สุดเท่าที่มี
-- (ของเดิมไม่ได้เก็บไว้ กู้ต้นทุนจริง ณ วันนั้นไม่ได้แล้ว)
update sale_items si
set unit_cost = p.cost_price
from products p
where p.id = si.product_id
  and si.unit_cost = 0;

create index if not exists sale_items_sale_idx on sale_items(sale_id);
