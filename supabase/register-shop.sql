-- ─────────────────────────────────────────────────────────────
-- register_shop() — สร้างร้าน + owner membership แบบ atomic, bypass ปัญหา RLS insert
-- ─────────────────────────────────────────────────────────────
-- ปัญหาที่เจอ (ทั้ง khaai และ khaai-web): insert เข้า shops ตรงๆ จาก client โดน
-- "new row violates row-level security policy" ทั้งที่ current_line_uid() คืนค่าถูกต้อง
-- (ยืนยันแล้วผ่าน RPC ตรงๆ) — ไล่หาสาเหตุจริงไม่เจอ หลังจากดีบักกันไปหลายรอบ
--
-- แก้โดยย้าย insert ไปทำใน security-definer function แทน (แพทเทิร์นเดียวกับ
-- delete_*_cascade / edit_purchase ที่ใช้อยู่แล้วทั้งระบบ) — ข้าม RLS insert check
-- ที่มีปัญหาไปเลย โดยยังปลอดภัยเพราะ owner ดึงจาก current_line_uid() ของผู้เรียกเอง
-- ไม่รับเป็น parameter จาก client (กัน spoofing เป็นเจ้าของร้านคนอื่น)
-- ─────────────────────────────────────────────────────────────

create or replace function register_shop(p_slug text, p_name text, p_owner_display_name text default null)
returns shops
language plpgsql
security definer
set search_path = public
as $$
declare
  v_shop shops;
  v_owner text := current_line_uid();
begin
  if v_owner is null then
    raise exception 'not authenticated';
  end if;
  if exists (select 1 from shops where slug = p_slug and sys_del_flag = 'N') then
    raise exception 'slug already taken';
  end if;

  insert into shops (slug, name, owner_line_uid, plan, default_warranty_days, vat_enabled, vat_rate, last_upd_by)
  values (p_slug, p_name, v_owner, 'free', 0, false, 7.00, v_owner)
  returning * into v_shop;

  insert into shop_members (shop_id, line_uid, display_name, role, last_upd_by)
  values (v_shop.id, v_owner, p_owner_display_name, 'owner', v_owner);

  return v_shop;
end;
$$;

grant execute on function register_shop(text, text, text) to anon, authenticated;

-- ─────────────────────────────────────────────────────────────
-- ตรวจผล (แทน 'testslug123' ด้วยชื่อที่ไม่ซ้ำใคร — ฟังก์ชันนี้ derive owner จาก JWT
-- ของผู้เรียกเอง รันตรงใน SQL Editor จะ error "not authenticated" เพราะไม่มี JWT context)
-- ─────────────────────────────────────────────────────────────
-- select * from register_shop('testslug123', 'Test Shop');
