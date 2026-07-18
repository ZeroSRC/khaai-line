-- ─────────────────────────────────────────────────────────────
-- แก้ไขบิลซื้อ (ต้นทุน + จำนวน) แล้วปรับ stock/cost_price ให้ตรง
-- ─────────────────────────────────────────────────────────────
-- ทำไมต้องเป็น function:
--   การเปลี่ยน "จำนวนซื้อ" ต้องปรับ products.stock ตามส่วนต่าง (new - old) แบบ atomic
--   ถ้าทำจาก client (อ่าน stock แล้วเขียนทับ) จะแข่งกับการขายที่เกิดพร้อมกัน → stock หาย
--   ใน function ใช้ stock = stock + (delta) จึงปลอดภัยจาก race
--
-- p_items = [{"id": uuid, "unit_cost": number, "quantity": int}]
-- p_slip_url = URL สลิป (client อัปโหลดแล้วส่งมา หรือส่งของเดิมกลับมา)
--
-- หมายเหตุ: stock ติดลบได้ (ไม่มี CHECK) = สัญญาณ "ขายเกินจำนวนที่ซื้อ"
--   เช่น เคยซื้อ 10 ขาย 8 แล้วมาแก้จำนวนซื้อเป็น 5 → stock = 2 - 5 = -3 (ขายเกินไป 3)
-- ─────────────────────────────────────────────────────────────

create or replace function edit_purchase(p_purchase_id uuid, p_items jsonb, p_slip_url text, p_by text default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  it jsonb;
  v_shop uuid;
  v_prod uuid;
  v_old_qty int;
  v_unit numeric;
  v_qty int;
begin
  select shop_id into v_shop from purchases where id = p_purchase_id and sys_del_flag = 'N';
  if v_shop is null then raise exception 'purchase not found'; end if;
  if not is_shop_member(v_shop) then raise exception 'not a member'; end if;

  for it in select * from jsonb_array_elements(p_items) loop
    -- ต้องเป็นรายการของบิลนี้จริง (ยัง active)
    select product_id, quantity into v_prod, v_old_qty
    from purchase_items where id = (it->>'id')::uuid and purchase_id = p_purchase_id and sys_del_flag = 'N';
    if v_prod is null then continue; end if;

    v_unit := (it->>'unit_cost')::numeric;
    v_qty  := (it->>'quantity')::int;

    -- ปรับ stock ตามส่วนต่างจำนวน + แก้ cost_price ให้ตรง (trigger insert ไม่ยิงตอน update)
    update products
      set stock = stock + (v_qty - v_old_qty),
          cost_price = v_unit,
          updated_at = now(), last_upd_by = p_by
    where id = v_prod;

    update purchase_items
      set unit_cost = v_unit, quantity = v_qty, total_cost = v_unit * v_qty, last_upd_by = p_by
    where id = (it->>'id')::uuid;
  end loop;

  update purchases
    set total_amount = coalesce((select sum(total_cost) from purchase_items where purchase_id = p_purchase_id and sys_del_flag = 'N'), 0),
        slip_url = p_slip_url, last_upd_by = p_by
  where id = p_purchase_id;
end;
$$;

grant execute on function edit_purchase(uuid, jsonb, text, text) to anon, authenticated;
