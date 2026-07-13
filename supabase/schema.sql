-- Enable extensions
create extension if not exists "uuid-ossp";
create extension if not exists "pg_cron";

-- ─────────────────────────────────────────────
-- SHOPS (tenants)
-- ─────────────────────────────────────────────
create table shops (
  id          uuid primary key default uuid_generate_v4(),
  slug        text unique not null,          -- URL-friendly: abc-shop
  name        text not null,
  description text,
  logo_url    text,
  line_oa_id  text,
  owner_line_uid text not null,
  plan        text not null default 'free',  -- free | pro
  plan_expires_at timestamptz,
  slip_template text default 'minimal',
  default_warranty_days int default 0,
  vat_enabled boolean default false,
  vat_rate    numeric(5,2) default 7.00,
  tax_id      text,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

-- ─────────────────────────────────────────────
-- SHOP MEMBERS (team)
-- ─────────────────────────────────────────────
create table shop_members (
  id          uuid primary key default uuid_generate_v4(),
  shop_id     uuid not null references shops(id) on delete cascade,
  line_uid    text not null,
  display_name text,
  role        text not null default 'staff',  -- owner | staff | finance
  created_at  timestamptz default now(),
  unique(shop_id, line_uid)
);

-- ─────────────────────────────────────────────
-- BANK ACCOUNTS
-- ─────────────────────────────────────────────
create table bank_accounts (
  id          uuid primary key default uuid_generate_v4(),
  shop_id     uuid not null references shops(id) on delete cascade,
  bank_name   text not null,
  account_name text not null,
  account_number text not null,
  is_default  boolean default false,
  created_at  timestamptz default now()
);

-- ─────────────────────────────────────────────
-- TAGS
-- ─────────────────────────────────────────────
create table tags (
  id          uuid primary key default uuid_generate_v4(),
  shop_id     uuid not null references shops(id) on delete cascade,
  name        text not null,
  color       text default '#6b7280',
  created_at  timestamptz default now(),
  unique(shop_id, name)
);

-- ─────────────────────────────────────────────
-- PRODUCTS
-- ─────────────────────────────────────────────
create table products (
  id           uuid primary key default uuid_generate_v4(),
  shop_id      uuid not null references shops(id) on delete cascade,
  name         text not null,
  sku          text,
  description  text,
  image_url    text,
  sell_price   numeric(12,2) not null default 0,
  cost_price   numeric(12,2) not null default 0,
  stock        int not null default 0,
  has_serial   boolean default false,
  warranty_days int default 0,
  is_active    boolean default true,
  created_at   timestamptz default now(),
  updated_at   timestamptz default now()
);

create table product_tag_map (
  product_id  uuid not null references products(id) on delete cascade,
  tag_id      uuid not null references tags(id) on delete cascade,
  primary key (product_id, tag_id)
);

-- ─────────────────────────────────────────────
-- CUSTOMERS
-- ─────────────────────────────────────────────
create table customers (
  id           uuid primary key default uuid_generate_v4(),
  shop_id      uuid not null references shops(id) on delete cascade,
  line_uid     text,
  name         text not null,
  phone        text,
  note         text,
  is_vip       boolean default false,
  total_spent  numeric(14,2) default 0,
  order_count  int default 0,
  last_order_at timestamptz,
  created_at   timestamptz default now()
);

create table customer_addresses (
  id           uuid primary key default uuid_generate_v4(),
  shop_id      uuid not null references shops(id) on delete cascade,
  customer_id  uuid references customers(id) on delete cascade,
  recipient    text not null,
  phone        text not null,
  address      text not null,
  district     text,
  amphoe       text,
  province     text not null,
  postcode     text not null,
  is_default   boolean default false,
  created_at   timestamptz default now()
);

-- ─────────────────────────────────────────────
-- SALES
-- ─────────────────────────────────────────────
create table sales (
  id           uuid primary key default uuid_generate_v4(),
  shop_id      uuid not null references shops(id) on delete cascade,
  customer_id  uuid references customers(id),
  ref_number   text,                         -- e.g. SO-20240601-001
  total_amount numeric(12,2) not null default 0,
  vat_amount   numeric(12,2) default 0,
  slip_url     text,
  slip_type    text,                         -- transfer | cash | null
  note         text,
  created_by   text,                         -- line_uid of staff
  created_at   timestamptz default now()
);

create table sale_items (
  id           uuid primary key default uuid_generate_v4(),
  shop_id      uuid not null references shops(id) on delete cascade,
  sale_id      uuid not null references sales(id) on delete cascade,
  product_id   uuid not null references products(id),
  serial_id    uuid,                         -- filled if has_serial
  quantity     int not null default 1,
  unit_price   numeric(12,2) not null,
  total_price  numeric(12,2) not null
);

-- ─────────────────────────────────────────────
-- SERIAL NUMBERS
-- ─────────────────────────────────────────────
create table serial_numbers (
  id                  uuid primary key default uuid_generate_v4(),
  shop_id             uuid not null references shops(id) on delete cascade,
  product_id          uuid not null references products(id),
  serial_code         text not null,
  status              text not null default 'in_stock', -- in_stock | sold | shipped | delivered
  sale_item_id        uuid references sale_items(id),
  shipment_id         uuid,                              -- filled after linking shipment
  warranty_starts_at  timestamptz,
  warranty_ends_at    timestamptz,
  warranty_status     text default 'pending',            -- pending | active | expiring_soon | expired
  created_at          timestamptz default now(),
  unique(shop_id, product_id, serial_code)
);

-- ─────────────────────────────────────────────
-- PURCHASES
-- ─────────────────────────────────────────────
create table purchases (
  id           uuid primary key default uuid_generate_v4(),
  shop_id      uuid not null references shops(id) on delete cascade,
  supplier     text,
  ref_number   text,
  total_amount numeric(12,2) not null default 0,
  slip_url     text,
  note         text,
  created_at   timestamptz default now()
);

create table purchase_items (
  id           uuid primary key default uuid_generate_v4(),
  shop_id      uuid not null references shops(id) on delete cascade,
  purchase_id  uuid not null references purchases(id) on delete cascade,
  product_id   uuid not null references products(id),
  quantity     int not null default 1,
  unit_cost    numeric(12,2) not null,
  total_cost   numeric(12,2) not null
);

-- ─────────────────────────────────────────────
-- SHIPMENTS
-- ─────────────────────────────────────────────
create table shipments (
  id             uuid primary key default uuid_generate_v4(),
  shop_id        uuid not null references shops(id) on delete cascade,
  sale_id        uuid references sales(id),
  tracking_number text,
  carrier        text,                         -- thaipost | flash | kerry | j&t
  shipping_cost  numeric(10,2) default 0,
  address_id     uuid references customer_addresses(id),
  status         text not null default 'pending', -- pending | shipped | delivered
  shipped_at     timestamptz,
  delivered_at   timestamptz,
  note           text,
  created_at     timestamptz default now()
);

-- ─────────────────────────────────────────────
-- EXPENSES
-- ─────────────────────────────────────────────
create table expenses (
  id           uuid primary key default uuid_generate_v4(),
  shop_id      uuid not null references shops(id) on delete cascade,
  category     text not null,               -- fuel | shipping | other
  amount       numeric(10,2) not null,
  note         text,
  slip_url     text,
  expense_date date not null default current_date,
  created_at   timestamptz default now()
);

-- ─────────────────────────────────────────────
-- AUDIT LOG
-- ─────────────────────────────────────────────
create table audit_logs (
  id           uuid primary key default uuid_generate_v4(),
  shop_id      uuid not null references shops(id) on delete cascade,
  actor_uid    text not null,
  actor_name   text,
  action       text not null,               -- create_sale | edit_product | export | etc.
  entity_type  text,
  entity_id    uuid,
  meta         jsonb,
  created_at   timestamptz default now()
);

-- ─────────────────────────────────────────────
-- INDEXES
-- ─────────────────────────────────────────────
create index on sales(shop_id, created_at desc);
create index on sale_items(sale_id);
create index on serial_numbers(shop_id, warranty_status);
create index on serial_numbers(warranty_ends_at);
create index on purchases(shop_id, created_at desc);
create index on shipments(shop_id, status);
create index on expenses(shop_id, expense_date desc);
create index on audit_logs(shop_id, created_at desc);
create index on customers(shop_id, is_vip);

-- ─────────────────────────────────────────────
-- TRIGGER: warranty starts when shipment delivered
-- ─────────────────────────────────────────────
create or replace function fn_warranty_on_delivered()
returns trigger language plpgsql as $$
begin
  if new.status = 'delivered' and old.status != 'delivered' then
    -- update serial_numbers linked to this shipment
    update serial_numbers sn
    set
      warranty_starts_at = new.delivered_at,
      warranty_ends_at = new.delivered_at + (
        (select warranty_days from products p where p.id = sn.product_id) || ' days'
      )::interval,
      warranty_status = 'active',
      status = 'delivered'
    where sn.shipment_id = new.id;
  end if;
  return new;
end;
$$;

create trigger trg_warranty_on_delivered
after update on shipments
for each row execute function fn_warranty_on_delivered();

-- ─────────────────────────────────────────────
-- TRIGGER: update product stock on sale
-- ─────────────────────────────────────────────
create or replace function fn_deduct_stock_on_sale()
returns trigger language plpgsql as $$
begin
  update products
  set stock = stock - new.quantity,
      updated_at = now()
  where id = new.product_id;
  return new;
end;
$$;

create trigger trg_deduct_stock_on_sale
after insert on sale_items
for each row execute function fn_deduct_stock_on_sale();

-- ─────────────────────────────────────────────
-- TRIGGER: add stock when purchase item inserted
-- ─────────────────────────────────────────────
create or replace function fn_add_stock_on_purchase()
returns trigger language plpgsql as $$
begin
  update products
  set stock      = stock + new.quantity,
      cost_price = new.unit_cost,
      updated_at = now()
  where id = new.product_id;
  return new;
end;
$$;

create trigger trg_add_stock_on_purchase
after insert on purchase_items
for each row execute function fn_add_stock_on_purchase();

-- ─────────────────────────────────────────────
-- TRIGGER: restore stock if sale item deleted
-- ─────────────────────────────────────────────
create or replace function fn_restore_stock_on_delete()
returns trigger language plpgsql as $$
begin
  update products
  set stock = stock + old.quantity,
      updated_at = now()
  where id = old.product_id;
  return old;
end;
$$;

create trigger trg_restore_stock_on_delete
after delete on sale_items
for each row execute function fn_restore_stock_on_delete();

-- ─────────────────────────────────────────────
-- pg_cron: daily warranty status refresh (runs 00:00 UTC)
-- ─────────────────────────────────────────────
select cron.schedule(
  'refresh-warranty-status',
  '0 0 * * *',
  $$
    update serial_numbers
    set warranty_status = case
      when warranty_ends_at < now() then 'expired'
      when warranty_ends_at < now() + interval '7 days' then 'expiring_soon'
      else 'active'
    end
    where warranty_status in ('active', 'expiring_soon')
      and warranty_ends_at is not null;
  $$
);

-- ─────────────────────────────────────────────
-- ROW LEVEL SECURITY
-- ─────────────────────────────────────────────
alter table shops             enable row level security;
alter table shop_members      enable row level security;
alter table bank_accounts     enable row level security;
alter table tags              enable row level security;
alter table products          enable row level security;
alter table product_tag_map   enable row level security;
alter table customers         enable row level security;
alter table customer_addresses enable row level security;
alter table sales             enable row level security;
alter table sale_items        enable row level security;
alter table serial_numbers    enable row level security;
alter table purchases         enable row level security;
alter table purchase_items    enable row level security;
alter table shipments         enable row level security;
alter table expenses          enable row level security;
alter table audit_logs        enable row level security;

-- Helper: read LINE userId from request header or pg setting
create or replace function current_line_uid()
returns text language sql security definer as $$
  select coalesce(
    nullif(current_setting('app.line_uid', true), ''),
    (current_setting('request.headers', true)::json->>'x-line-uid')
  );
$$;

-- Helper: check if current user is member of shop
create or replace function is_shop_member(p_shop_id uuid)
returns boolean language sql security definer as $$
  select exists (
    select 1 from shop_members
    where shop_id = p_shop_id
      and line_uid = current_line_uid()
  );
$$;

-- RLS policies
-- shops: members can read/write; anyone can INSERT (to register)
create policy "shop members read/write" on shops
  using (is_shop_member(id))
  with check (is_shop_member(id));

create policy "allow register shop" on shops
  for insert with check (owner_line_uid = current_line_uid());

-- shop_members: members can read; insert allowed (join via link or owner add)
create policy "shop members read/write" on shop_members
  using (is_shop_member(shop_id))
  with check (is_shop_member(shop_id));

create policy "allow join shop" on shop_members
  for insert with check (line_uid = current_line_uid());

-- all other tables: members only (read + write)
create policy "shop members only" on bank_accounts
  using (is_shop_member(shop_id))
  with check (is_shop_member(shop_id));

create policy "shop members only" on tags
  using (is_shop_member(shop_id))
  with check (is_shop_member(shop_id));

create policy "shop members only" on products
  using (is_shop_member(shop_id))
  with check (is_shop_member(shop_id));

create policy "shop members only" on product_tag_map
  using (is_shop_member((select shop_id from products where id = product_id)))
  with check (is_shop_member((select shop_id from products where id = product_id)));

create policy "shop members only" on customers
  using (is_shop_member(shop_id))
  with check (is_shop_member(shop_id));

create policy "shop members only" on customer_addresses
  using (is_shop_member(shop_id))
  with check (is_shop_member(shop_id));

create policy "shop members only" on sales
  using (is_shop_member(shop_id))
  with check (is_shop_member(shop_id));

create policy "shop members only" on sale_items
  using (is_shop_member(shop_id))
  with check (is_shop_member(shop_id));

create policy "shop members only" on serial_numbers
  using (is_shop_member(shop_id))
  with check (is_shop_member(shop_id));

create policy "shop members only" on purchases
  using (is_shop_member(shop_id))
  with check (is_shop_member(shop_id));

create policy "shop members only" on purchase_items
  using (is_shop_member(shop_id))
  with check (is_shop_member(shop_id));

create policy "shop members only" on shipments
  using (is_shop_member(shop_id))
  with check (is_shop_member(shop_id));

create policy "shop members only" on expenses
  using (is_shop_member(shop_id))
  with check (is_shop_member(shop_id));

create policy "shop members only" on audit_logs
  using (is_shop_member(shop_id))
  with check (is_shop_member(shop_id));
