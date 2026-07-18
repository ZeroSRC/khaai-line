-- ─────────────────────────────────────────────────────────────
-- SOFT-DELETE แบบ cascade (set sys_del_flag='Y' ไม่ลบจริง)
-- ─────────────────────────────────────────────────────────────
-- ⚠️ เปลี่ยนจาก DELETE จริง → UPDATE sys_del_flag='Y'
--    trigger คืนสต็อก (trg_restore_stock_on_delete) ยิงตอน DELETE เท่านั้น
--    → พอเป็น soft-delete มันไม่ยิง ฟังก์ชันนี้จึงจัดการ stock เอง
-- p_by = LINE uid ของคนเรียก API (ลงใน last_upd_by)
-- ต้องรัน add-soft-delete.sql ก่อน (ต้องมีคอลัมน์ sys_del_flag/last_upd_by)
-- ─────────────────────────────────────────────────────────────

-- ── ลบบิลขาย ──────────────────────────────────────────────────
create or replace function delete_sale_cascade(p_sale_id uuid, p_by text default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare v_shop uuid;
begin
  select shop_id into v_shop from sales where id = p_sale_id and sys_del_flag = 'N';
  if v_shop is null then raise exception 'sale not found'; end if;
  if not is_shop_member(v_shop) then raise exception 'not a member'; end if;

  -- คืนสต็อกจากรายการที่ยัง active (trigger ไม่ยิงตอน soft-delete)
  update products p set stock = stock + agg.qty, updated_at = now()
  from (select product_id, sum(quantity) qty from sale_items
        where sale_id = p_sale_id and sys_del_flag = 'N' group by product_id) agg
  where p.id = agg.product_id;

  -- serial กลับเป็นของในสต็อก
  update serial_numbers
    set sale_item_id = null, shipment_id = null, status = 'in_stock',
        warranty_starts_at = null, warranty_ends_at = null, warranty_status = 'pending', last_upd_by = p_by
  where sale_item_id in (select id from sale_items where sale_id = p_sale_id);

  update sale_items set sys_del_flag = 'Y', last_upd_by = p_by where sale_id = p_sale_id;
  update shipments  set sys_del_flag = 'Y', last_upd_by = p_by where sale_id = p_sale_id;
  update sales      set sys_del_flag = 'Y', last_upd_by = p_by where id = p_sale_id;
end;
$$;

-- ── ลบสินค้า ──────────────────────────────────────────────────
create or replace function delete_product_cascade(p_product_id uuid, p_by text default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare v_shop uuid;
begin
  select shop_id into v_shop from products where id = p_product_id and sys_del_flag = 'N';
  if v_shop is null then raise exception 'product not found'; end if;
  if not is_shop_member(v_shop) then raise exception 'not a member'; end if;

  -- บิลขายที่มีสินค้านี้ (ยัง active)
  create temp table _aff_sales on commit drop as
    select distinct sale_id from sale_items
    where product_id = p_product_id and sys_del_flag = 'N';

  -- คืนสต็อกให้ทุกสินค้าในบิลเหล่านั้น (สินค้านี้จะถูกลบอยู่แล้ว แต่สินค้าอื่นต้องคืน)
  update products p set stock = stock + agg.qty, updated_at = now()
  from (select product_id, sum(quantity) qty from sale_items
        where sale_id in (select sale_id from _aff_sales) and sys_del_flag = 'N'
        group by product_id) agg
  where p.id = agg.product_id;

  update serial_numbers
    set sale_item_id = null, shipment_id = null, status = 'in_stock',
        warranty_starts_at = null, warranty_ends_at = null, warranty_status = 'pending', last_upd_by = p_by
  where sale_item_id in (select id from sale_items where sale_id in (select sale_id from _aff_sales));

  update sale_items set sys_del_flag = 'Y', last_upd_by = p_by where sale_id in (select sale_id from _aff_sales);
  update shipments  set sys_del_flag = 'Y', last_upd_by = p_by where sale_id in (select sale_id from _aff_sales);
  update sales      set sys_del_flag = 'Y', last_upd_by = p_by where id in (select sale_id from _aff_sales);

  -- ประวัติซื้อที่มีสินค้านี้
  update purchase_items set sys_del_flag = 'Y', last_upd_by = p_by
    where purchase_id in (select distinct purchase_id from purchase_items where product_id = p_product_id and sys_del_flag = 'N');
  update purchases set sys_del_flag = 'Y', last_upd_by = p_by
    where id in (select distinct purchase_id from purchase_items where product_id = p_product_id);

  update serial_numbers set sys_del_flag = 'Y', last_upd_by = p_by where product_id = p_product_id;
  update products       set sys_del_flag = 'Y', last_upd_by = p_by where id = p_product_id;
end;
$$;

-- ── ลบพัสดุ ───────────────────────────────────────────────────
create or replace function delete_shipment_cascade(p_shipment_id uuid, p_by text default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare v_shop uuid;
begin
  select shop_id into v_shop from shipments where id = p_shipment_id and sys_del_flag = 'N';
  if v_shop is null then raise exception 'shipment not found'; end if;
  if not is_shop_member(v_shop) then raise exception 'not a member'; end if;

  update serial_numbers
    set shipment_id = null, status = 'sold',
        warranty_starts_at = null, warranty_ends_at = null, warranty_status = 'pending', last_upd_by = p_by
  where shipment_id = p_shipment_id;

  update shipments set sys_del_flag = 'Y', last_upd_by = p_by where id = p_shipment_id;
  -- บิลขาย (sale_id) ไม่ถูกแตะ → กลับไปโผล่ใน picker "สร้างพัสดุ"
end;
$$;

-- ── ลบการซื้อ (cascade แรง) ───────────────────────────────────
create or replace function delete_purchase_cascade(p_purchase_id uuid, p_by text default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare v_shop uuid;
begin
  select shop_id into v_shop from purchases where id = p_purchase_id and sys_del_flag = 'N';
  if v_shop is null then raise exception 'purchase not found'; end if;
  if not is_shop_member(v_shop) then raise exception 'not a member'; end if;

  create temp table _aff_sales on commit drop as
    select distinct sale_id from sale_items
    where product_id in (select product_id from purchase_items where purchase_id = p_purchase_id and sys_del_flag = 'N')
      and sys_del_flag = 'N';

  -- คืนสต็อกจากบิลขายที่จะถูกลบ
  update products p set stock = stock + agg.qty, updated_at = now()
  from (select product_id, sum(quantity) qty from sale_items
        where sale_id in (select sale_id from _aff_sales) and sys_del_flag = 'N'
        group by product_id) agg
  where p.id = agg.product_id;

  update serial_numbers
    set sale_item_id = null, shipment_id = null, status = 'in_stock',
        warranty_starts_at = null, warranty_ends_at = null, warranty_status = 'pending', last_upd_by = p_by
  where sale_item_id in (select id from sale_items where sale_id in (select sale_id from _aff_sales));

  update sale_items set sys_del_flag = 'Y', last_upd_by = p_by where sale_id in (select sale_id from _aff_sales);
  update shipments  set sys_del_flag = 'Y', last_upd_by = p_by where sale_id in (select sale_id from _aff_sales);
  update sales      set sys_del_flag = 'Y', last_upd_by = p_by where id in (select sale_id from _aff_sales);

  -- ถอน stock ที่บิลซื้อนี้เพิ่มเข้าไป
  update products p set stock = greatest(0, p.stock - agg.qty), updated_at = now()
  from (select product_id, sum(quantity) qty from purchase_items
        where purchase_id = p_purchase_id and sys_del_flag = 'N' group by product_id) agg
  where p.id = agg.product_id;

  update purchase_items set sys_del_flag = 'Y', last_upd_by = p_by where purchase_id = p_purchase_id;
  update purchases      set sys_del_flag = 'Y', last_upd_by = p_by where id = p_purchase_id;
end;
$$;

grant execute on function delete_sale_cascade(uuid, text)     to anon, authenticated;
grant execute on function delete_product_cascade(uuid, text)  to anon, authenticated;
grant execute on function delete_shipment_cascade(uuid, text) to anon, authenticated;
grant execute on function delete_purchase_cascade(uuid, text) to anon, authenticated;
