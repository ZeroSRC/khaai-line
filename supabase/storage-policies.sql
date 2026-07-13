-- ─────────────────────────────────────────────────────────────
-- STORAGE: bucket `slips` + RLS policies
-- ─────────────────────────────────────────────────────────────
-- ⚠️ กับดัก: ตั้ง bucket เป็น "public" ไม่ได้แปลว่าอัปโหลดได้
--    public  → คุมแค่การ "อ่าน" (เปิด URL ดูรูปได้โดยไม่ต้อง login)
--    upload  → ยังต้องมี RLS policy บน storage.objects เสมอ
--    ถ้าไม่มี policy จะได้ error: "new row violates row-level security policy"
--
-- bucket นี้เก็บ:
--   {shop_id}/slips/*          สลิปการขาย
--   {shop_id}/purchase-slips/* สลิปการซื้อ
--   {shop_id}/products/*       รูปสินค้า
-- ─────────────────────────────────────────────────────────────

-- 1) สร้าง bucket (ถ้ายังไม่มี) และตั้งเป็น public เพื่อให้เปิดรูปดูได้
insert into storage.buckets (id, name, public)
values ('slips', 'slips', true)
on conflict (id) do update set public = true;

-- 2) ล้าง policy เดิมของ bucket นี้ (รันซ้ำได้ปลอดภัย)
drop policy if exists "slips_public_read"   on storage.objects;
drop policy if exists "slips_insert"        on storage.objects;
drop policy if exists "slips_update"        on storage.objects;
drop policy if exists "slips_delete"        on storage.objects;

-- 3) อ่าน — เปิดสาธารณะ (path มี shop_id เป็น uuid อยู่แล้ว เดาไม่ได้)
create policy "slips_public_read"
on storage.objects for select
using (bucket_id = 'slips');

-- 4) เขียน — อนุญาตทั้ง anon และ authenticated
--    แอปส่ง JWT จาก Edge Function verify-line แต่ถ้า verify ล้มเหลวจะ fallback
--    เป็น anon key → ถ้าใส่แค่ authenticated อัปโหลดจะพังแบบเงียบๆ
create policy "slips_insert"
on storage.objects for insert
to anon, authenticated
with check (bucket_id = 'slips');

create policy "slips_update"
on storage.objects for update
to anon, authenticated
using (bucket_id = 'slips');

create policy "slips_delete"
on storage.objects for delete
to anon, authenticated
using (bucket_id = 'slips');

-- ─────────────────────────────────────────────────────────────
-- ตรวจผล: ควรเห็น 4 policies
-- ─────────────────────────────────────────────────────────────
select policyname, cmd, roles
from pg_policies
where schemaname = 'storage' and tablename = 'objects'
  and policyname like 'slips_%';
