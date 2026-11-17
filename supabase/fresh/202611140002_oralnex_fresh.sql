-- OralNex fresh-project bundle. Run only on a new, empty Supabase project.
-- No catalog/customer/order data or historical storefront settings are included.
-- Do not also apply supabase/migrations to this project.
-- Historical migrations build and then remove retired objects; final schema is current.

-- Source: 202609080001_initial_storefront.sql
-- OralNex production schema scaffold. Review in a staging project before applying to production.
create extension if not exists pgcrypto;

create type public.product_status as enum ('draft', 'active', 'archived');
create type public.order_status as enum ('pending', 'paid', 'processing', 'packed', 'shipped', 'delivered', 'cancelled', 'refunded');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  first_name text not null default '',
  last_name text not null default '',
  phone text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique check (char_length(name) between 2 and 100),
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  description text not null default '',
  image_path text,
  display_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.products (
  id uuid primary key default gen_random_uuid(),
  category_id uuid references public.categories(id) on delete set null,
  name text not null check (char_length(name) between 2 and 160),
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  sku text not null unique,
  summary text not null default '',
  description text not null default '',
  price_cents integer not null check (price_cents >= 0),
  compare_at_price_cents integer check (compare_at_price_cents >= price_cents),
  stock_quantity integer not null default 0 check (stock_quantity >= 0),
  low_stock_threshold integer not null default 5 check (low_stock_threshold >= 0),
  status public.product_status not null default 'draft',
  is_featured boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.product_variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  options jsonb not null default '{}'::jsonb,
  sku text not null unique,
  stock_quantity integer not null default 0 check (stock_quantity >= 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (jsonb_typeof(options) = 'object' and options <> '{}'::jsonb)
);

create unique index product_variants_options_unique_idx
  on public.product_variants (product_id, options);

create table public.product_images (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  storage_path text not null,
  alt_text text not null default '',
  display_order integer not null default 0,
  unique (product_id, display_order)
);

create table public.product_features (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  feature text not null check (char_length(feature) between 1 and 300),
  display_order integer not null default 0
);

create table public.product_specifications (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  label text not null check (char_length(label) between 1 and 100),
  value text not null check (char_length(value) between 1 and 300),
  display_order integer not null default 0
);

create table public.product_bulk_pricing_tiers (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  min_quantity integer not null check (min_quantity >= 2),
  discount_percent integer not null check (discount_percent between 1 and 99),
  created_at timestamptz not null default now(),
  unique (product_id, min_quantity)
);

create table public.merchandising_slots (
  slot_key text primary key check (slot_key in ('hero-primary', 'hero-secondary', 'hero-tertiary', 'side-primary', 'side-secondary', 'offer-primary', 'offer-secondary')),
  product_id uuid references public.products(id) on delete set null,
  updated_at timestamptz not null default now()
);

create table public.daily_deals (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  deal_price_cents integer not null check (deal_price_cents >= 0),
  starts_at timestamptz not null,
  ends_at timestamptz not null check (ends_at > starts_at),
  is_active boolean not null default true
);

create table public.addresses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  recipient_name text not null,
  line_1 text not null,
  line_2 text,
  city text not null,
  state text not null,
  postal_code text not null,
  country_code text not null default 'US' check (char_length(country_code) = 2),
  phone text,
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  order_number text not null unique,
  user_id uuid references auth.users(id) on delete set null,
  guest_email text,
  status public.order_status not null default 'pending',
  currency text not null default 'usd' check (currency ~ '^[a-z]{3}$'),
  subtotal_cents integer not null check (subtotal_cents >= 0),
  shipping_cents integer not null default 0 check (shipping_cents >= 0),
  tax_cents integer not null default 0 check (tax_cents >= 0),
  total_cents integer not null check (total_cents >= 0),
  stripe_checkout_session_id text unique,
  stripe_payment_intent_id text unique,
  shipping_address jsonb not null,
  tracking_number text,
  carrier text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (user_id is not null or guest_email is not null)
);

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  product_variant_id uuid references public.product_variants(id) on delete set null,
  product_name text not null,
  sku text not null,
  selected_options jsonb not null default '{}'::jsonb check (jsonb_typeof(selected_options) = 'object'),
  unit_price_cents integer not null check (unit_price_cents >= 0),
  quantity integer not null check (quantity between 1 and 999)
);

create table public.admin_audit_log (
  id bigint generated always as identity primary key,
  actor_id uuid references auth.users(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id text,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index products_category_id_idx on public.products(category_id);
create index products_status_idx on public.products(status);
create index product_images_product_id_idx on public.product_images(product_id);
create index product_features_product_id_idx on public.product_features(product_id);
create index product_specifications_product_id_idx on public.product_specifications(product_id);
create index orders_user_id_created_at_idx on public.orders(user_id, created_at desc);
create index order_items_order_id_idx on public.order_items(order_id);
create unique index addresses_one_default_per_user_idx on public.addresses(user_id) where is_default;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin', false)
$$;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, first_name, last_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'first_name', ''),
    coalesce(new.raw_user_meta_data ->> 'last_name', '')
  );
  return new;
end;
$$;

create trigger profiles_updated_at before update on public.profiles for each row execute function public.set_updated_at();
create trigger categories_updated_at before update on public.categories for each row execute function public.set_updated_at();
create trigger products_updated_at before update on public.products for each row execute function public.set_updated_at();
create trigger product_variants_updated_at before update on public.product_variants for each row execute function public.set_updated_at();
create trigger addresses_updated_at before update on public.addresses for each row execute function public.set_updated_at();
create trigger orders_updated_at before update on public.orders for each row execute function public.set_updated_at();
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

alter table public.profiles enable row level security;
alter table public.categories enable row level security;
alter table public.products enable row level security;
alter table public.product_variants enable row level security;
alter table public.product_images enable row level security;
alter table public.product_features enable row level security;
alter table public.product_specifications enable row level security;
alter table public.product_bulk_pricing_tiers enable row level security;
alter table public.merchandising_slots enable row level security;
alter table public.daily_deals enable row level security;
alter table public.addresses enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.admin_audit_log enable row level security;

create policy "active categories are public" on public.categories for select using (is_active or public.is_admin());
create policy "active products are public" on public.products for select using (status = 'active' or public.is_admin());
create policy "active product variants follow product visibility" on public.product_variants for select using (is_active and exists (select 1 from public.products p where p.id = product_id and (p.status = 'active' or public.is_admin())) or public.is_admin());
create policy "product images follow product visibility" on public.product_images for select using (exists (select 1 from public.products p where p.id = product_id and (p.status = 'active' or public.is_admin())));
create policy "product features follow product visibility" on public.product_features for select using (exists (select 1 from public.products p where p.id = product_id and (p.status = 'active' or public.is_admin())));
create policy "product specifications follow product visibility" on public.product_specifications for select using (exists (select 1 from public.products p where p.id = product_id and (p.status = 'active' or public.is_admin())));
create policy "bulk pricing follows product visibility" on public.product_bulk_pricing_tiers for select using (exists (select 1 from public.products p where p.id = product_id and (p.status = 'active' or public.is_admin())));
create policy "merchandising is public read" on public.merchandising_slots for select using (true);
create policy "active deals are public" on public.daily_deals for select using ((is_active and now() between starts_at and ends_at) or public.is_admin());

create policy "admins manage categories" on public.categories for all using (public.is_admin()) with check (public.is_admin());
create policy "admins manage products" on public.products for all using (public.is_admin()) with check (public.is_admin());
create policy "admins manage product variants" on public.product_variants for all using (public.is_admin()) with check (public.is_admin());
create policy "admins manage product images" on public.product_images for all using (public.is_admin()) with check (public.is_admin());
create policy "admins manage product features" on public.product_features for all using (public.is_admin()) with check (public.is_admin());
create policy "admins manage specifications" on public.product_specifications for all using (public.is_admin()) with check (public.is_admin());
create policy "admins manage bulk pricing" on public.product_bulk_pricing_tiers for all using (public.is_admin()) with check (public.is_admin());
create policy "admins manage merchandising" on public.merchandising_slots for all using (public.is_admin()) with check (public.is_admin());
create policy "admins manage deals" on public.daily_deals for all using (public.is_admin()) with check (public.is_admin());

create policy "users read own profile" on public.profiles for select using (auth.uid() = id or public.is_admin());
create policy "users update own profile" on public.profiles for update using (auth.uid() = id) with check (auth.uid() = id);
create policy "users manage own addresses" on public.addresses for all using (auth.uid() = user_id or public.is_admin()) with check (auth.uid() = user_id or public.is_admin());
create policy "users read own orders" on public.orders for select using (auth.uid() = user_id or public.is_admin());
create policy "admins manage orders" on public.orders for all using (public.is_admin()) with check (public.is_admin());
create policy "users read own order items" on public.order_items for select using (exists (select 1 from public.orders o where o.id = order_id and (o.user_id = auth.uid() or public.is_admin())));
create policy "admins manage order items" on public.order_items for all using (public.is_admin()) with check (public.is_admin());
create policy "admins read audit log" on public.admin_audit_log for select using (public.is_admin());

revoke all on public.admin_audit_log from anon, authenticated;
grant select on public.admin_audit_log to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'product-media',
  'product-media',
  true,
  8388608,
  array['image/jpeg', 'image/png', 'image/webp', 'image/avif']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "product media is public read"
on storage.objects for select
using (bucket_id = 'product-media');

create policy "admins upload product media"
on storage.objects for insert to authenticated
with check (bucket_id = 'product-media' and public.is_admin());

create policy "admins update product media"
on storage.objects for update to authenticated
using (bucket_id = 'product-media' and public.is_admin())
with check (bucket_id = 'product-media' and public.is_admin());

create policy "admins delete product media"
on storage.objects for delete to authenticated
using (bucket_id = 'product-media' and public.is_admin());

-- Source: 202609110001_buyer_address_details.sql
-- Preserve checkout address fields without lossy name parsing.
alter table public.addresses
  add column if not exists label text not null default 'Shipping address',
  add column if not exists first_name text not null default '',
  add column if not exists last_name text not null default '',
  add column if not exists company text;

update public.addresses
set
  first_name = case
    when first_name = '' then split_part(recipient_name, ' ', 1)
    else first_name
  end,
  last_name = case
    when last_name = '' then trim(substr(recipient_name, length(split_part(recipient_name, ' ', 1)) + 1))
    else last_name
  end;

create or replace function public.set_default_address(target_address_id uuid)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if not exists (
    select 1 from public.addresses
    where id = target_address_id and user_id = auth.uid()
  ) then
    raise exception 'Address not found';
  end if;

  update public.addresses set is_default = false where user_id = auth.uid();
  update public.addresses set is_default = true
  where id = target_address_id and user_id = auth.uid();
end;
$$;

grant execute on function public.set_default_address(uuid) to authenticated;

-- Source: 202609110003_admin_rbac.sql
-- Database-backed administrator roles and JWT custom claims.
begin;

create type public.app_role as enum ('admin');

create table public.user_roles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role public.app_role not null,
  created_at timestamptz not null default now()
);

alter table public.user_roles enable row level security;

revoke all on public.user_roles from anon, authenticated, public;
grant select on public.user_roles to supabase_auth_admin;

create policy "Auth service can read user roles"
on public.user_roles
for select
to supabase_auth_admin
using (true);

create or replace function public.custom_access_token_hook(event jsonb)
returns jsonb
language plpgsql
stable
set search_path = ''
as $$
declare
  claims jsonb;
  assigned_role public.app_role;
begin
  select role
  into assigned_role
  from public.user_roles
  where user_id = (event ->> 'user_id')::uuid;

  claims := event -> 'claims';
  claims := jsonb_set(
    claims,
    '{user_role}',
    coalesce(to_jsonb(assigned_role), 'null'::jsonb)
  );

  return jsonb_set(event, '{claims}', claims);
end;
$$;

grant usage on schema public to supabase_auth_admin;
grant execute on function public.custom_access_token_hook(jsonb) to supabase_auth_admin;
revoke execute on function public.custom_access_token_hook(jsonb)
from anon, authenticated, public;

-- Admin access requires both an assigned database role and completed MFA.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    (auth.jwt() ->> 'user_role') = 'admin'
    and (auth.jwt() ->> 'aal') = 'aal2',
    false
  )
$$;

commit;

-- Source: 202609110004_admin_catalog_operations.sql
begin;

alter table public.products
  add column if not exists product_type text not null default 'Medical equipment';

create or replace function public.admin_save_product(payload jsonb)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  saved_id uuid;
  item jsonb;
  actor uuid := auth.uid();
  operation text;
begin
  if not public.is_admin() then
    raise exception 'Administrator MFA session required' using errcode = '42501';
  end if;

  saved_id := nullif(payload ->> 'id', '')::uuid;
  operation := case when saved_id is null then 'created' else 'updated' end;

  if saved_id is null then
    insert into public.products (
      category_id, name, slug, sku, product_type, summary, description,
      price_cents, compare_at_price_cents, stock_quantity,
      low_stock_threshold, status, is_featured
    ) values (
      nullif(payload ->> 'category_id', '')::uuid,
      payload ->> 'name',
      payload ->> 'slug',
      payload ->> 'sku',
      coalesce(nullif(payload ->> 'product_type', ''), 'Medical equipment'),
      coalesce(payload ->> 'summary', ''),
      coalesce(payload ->> 'description', ''),
      (payload ->> 'price_cents')::integer,
      nullif(payload ->> 'compare_at_price_cents', '')::integer,
      (payload ->> 'stock_quantity')::integer,
      coalesce((payload ->> 'low_stock_threshold')::integer, 5),
      (payload ->> 'status')::public.product_status,
      coalesce((payload ->> 'is_featured')::boolean, false)
    ) returning id into saved_id;
  else
    update public.products set
      category_id = nullif(payload ->> 'category_id', '')::uuid,
      name = payload ->> 'name',
      slug = payload ->> 'slug',
      sku = payload ->> 'sku',
      product_type = coalesce(nullif(payload ->> 'product_type', ''), 'Medical equipment'),
      summary = coalesce(payload ->> 'summary', ''),
      description = coalesce(payload ->> 'description', ''),
      price_cents = (payload ->> 'price_cents')::integer,
      compare_at_price_cents = nullif(payload ->> 'compare_at_price_cents', '')::integer,
      stock_quantity = (payload ->> 'stock_quantity')::integer,
      low_stock_threshold = coalesce((payload ->> 'low_stock_threshold')::integer, 5),
      status = (payload ->> 'status')::public.product_status,
      is_featured = coalesce((payload ->> 'is_featured')::boolean, false)
    where id = saved_id;

    if not found then raise exception 'Product not found'; end if;
  end if;

  delete from public.product_variants where product_id = saved_id;
  for item in select value from jsonb_array_elements(coalesce(payload -> 'variants', '[]'::jsonb)) loop
    insert into public.product_variants (product_id, options, sku, stock_quantity, is_active)
    values (
      saved_id,
      item -> 'options',
      item ->> 'sku',
      (item ->> 'stock_quantity')::integer,
      coalesce((item ->> 'is_active')::boolean, true)
    );
  end loop;

  delete from public.product_images where product_id = saved_id;
  for item in select value from jsonb_array_elements(coalesce(payload -> 'images', '[]'::jsonb)) loop
    insert into public.product_images (product_id, storage_path, alt_text, display_order)
    values (
      saved_id,
      item ->> 'storage_path',
      coalesce(item ->> 'alt_text', payload ->> 'name'),
      (item ->> 'display_order')::integer
    );
  end loop;

  delete from public.product_features where product_id = saved_id;
  for item in select value from jsonb_array_elements(coalesce(payload -> 'features', '[]'::jsonb)) loop
    insert into public.product_features (product_id, feature, display_order)
    values (saved_id, item ->> 'feature', (item ->> 'display_order')::integer);
  end loop;

  delete from public.product_specifications where product_id = saved_id;
  for item in select value from jsonb_array_elements(coalesce(payload -> 'specifications', '[]'::jsonb)) loop
    insert into public.product_specifications (product_id, label, value, display_order)
    values (
      saved_id,
      item ->> 'label',
      item ->> 'value',
      (item ->> 'display_order')::integer
    );
  end loop;

  delete from public.product_bulk_pricing_tiers where product_id = saved_id;
  for item in select value from jsonb_array_elements(coalesce(payload -> 'bulk_pricing', '[]'::jsonb)) loop
    insert into public.product_bulk_pricing_tiers (product_id, min_quantity, discount_percent)
    values (
      saved_id,
      (item ->> 'min_quantity')::integer,
      (item ->> 'discount_percent')::integer
    );
  end loop;

  insert into public.admin_audit_log (actor_id, action, entity_type, entity_id, details)
  values (
    actor,
    operation,
    'product',
    saved_id::text,
    jsonb_build_object('name', payload ->> 'name', 'sku', payload ->> 'sku')
  );

  return saved_id;
end;
$$;

create or replace function public.admin_delete_product(target_product_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := auth.uid();
  product_name text;
begin
  if not public.is_admin() then
    raise exception 'Administrator MFA session required' using errcode = '42501';
  end if;

  delete from public.products where id = target_product_id returning name into product_name;
  if product_name is null then raise exception 'Product not found'; end if;

  insert into public.admin_audit_log (actor_id, action, entity_type, entity_id, details)
  values (
    actor, 'deleted', 'product', target_product_id::text,
    jsonb_build_object('name', product_name)
  );
end;
$$;

create or replace function public.admin_save_category(payload jsonb)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  saved_id uuid;
  selected_ids uuid[];
  actor uuid := auth.uid();
  operation text;
begin
  if not public.is_admin() then
    raise exception 'Administrator MFA session required' using errcode = '42501';
  end if;

  saved_id := nullif(payload ->> 'id', '')::uuid;
  operation := case when saved_id is null then 'created' else 'updated' end;

  if saved_id is null then
    insert into public.categories (name, slug, description, image_path, display_order, is_active)
    values (
      payload ->> 'name', payload ->> 'slug', coalesce(payload ->> 'description', ''),
      payload ->> 'image_path', coalesce((payload ->> 'display_order')::integer, 0), true
    ) returning id into saved_id;
  else
    update public.categories set
      name = payload ->> 'name',
      slug = payload ->> 'slug',
      description = coalesce(payload ->> 'description', ''),
      image_path = payload ->> 'image_path',
      display_order = coalesce((payload ->> 'display_order')::integer, display_order)
    where id = saved_id;
    if not found then raise exception 'Category not found'; end if;
  end if;

  select coalesce(array_agg(value::text::uuid), array[]::uuid[])
  into selected_ids
  from jsonb_array_elements_text(coalesce(payload -> 'product_ids', '[]'::jsonb));

  update public.products
  set category_id = null
  where category_id = saved_id and not (id = any(selected_ids));

  update public.products
  set category_id = saved_id
  where id = any(selected_ids);

  insert into public.admin_audit_log (actor_id, action, entity_type, entity_id, details)
  values (
    actor, operation, 'category', saved_id::text,
    jsonb_build_object('name', payload ->> 'name', 'assigned_products', cardinality(selected_ids))
  );

  return saved_id;
end;
$$;

create or replace function public.admin_delete_category(target_category_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := auth.uid();
  category_name text;
begin
  if not public.is_admin() then
    raise exception 'Administrator MFA session required' using errcode = '42501';
  end if;
  if exists (select 1 from public.products where category_id = target_category_id) then
    raise exception 'Move assigned products before deleting this category';
  end if;

  delete from public.categories where id = target_category_id returning name into category_name;
  if category_name is null then raise exception 'Category not found'; end if;

  insert into public.admin_audit_log (actor_id, action, entity_type, entity_id, details)
  values (
    actor, 'deleted', 'category', target_category_id::text,
    jsonb_build_object('name', category_name)
  );
end;
$$;

revoke all on function public.admin_save_product(jsonb) from public, anon;
revoke all on function public.admin_delete_product(uuid) from public, anon;
revoke all on function public.admin_save_category(jsonb) from public, anon;
revoke all on function public.admin_delete_category(uuid) from public, anon;

grant execute on function public.admin_save_product(jsonb) to authenticated;
grant execute on function public.admin_delete_product(uuid) to authenticated;
grant execute on function public.admin_save_category(jsonb) to authenticated;
grant execute on function public.admin_delete_category(uuid) to authenticated;

commit;

-- Source: 202609110005_storefront_merchandising.sql
begin;

create table public.storefront_settings (
  id boolean primary key default true check (id),
  hero_images jsonb not null default '[]'::jsonb check (jsonb_typeof(hero_images) = 'array'),
  hero_eyebrow text not null default '',
  hero_title text not null default '',
  hero_description text not null default '',
  bulk_product_ids uuid[] not null default array[]::uuid[],
  updated_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now()
);

alter table public.storefront_settings enable row level security;

create policy "storefront settings are public"
on public.storefront_settings for select
using (true);

create policy "admins manage storefront settings"
on public.storefront_settings for all to authenticated
using (public.is_admin())
with check (public.is_admin());

create or replace function public.admin_save_storefront_settings(payload jsonb)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  selected_ids uuid[];
  actor uuid := auth.uid();
begin
  if not public.is_admin() then
    raise exception 'Administrator MFA session required' using errcode = '42501';
  end if;

  if jsonb_typeof(payload -> 'hero_images') <> 'array'
    or jsonb_array_length(payload -> 'hero_images') < 1
    or jsonb_array_length(payload -> 'hero_images') > 5 then
    raise exception 'One to five hero images are required';
  end if;

  select coalesce(array_agg(value::text::uuid), array[]::uuid[])
  into selected_ids
  from jsonb_array_elements_text(coalesce(payload -> 'bulk_product_ids', '[]'::jsonb));

  if exists (
    select 1 from unnest(selected_ids) selected_id
    where not exists (
      select 1 from public.products
      where id = selected_id and status = 'active'
    )
  ) then
    raise exception 'Bulk products must be active catalog products';
  end if;

  insert into public.storefront_settings (
    id, hero_images, hero_eyebrow, hero_title, hero_description,
    bulk_product_ids, updated_by, updated_at
  ) values (
    true,
    payload -> 'hero_images',
    trim(payload ->> 'hero_eyebrow'),
    trim(payload ->> 'hero_title'),
    trim(payload ->> 'hero_description'),
    selected_ids,
    actor,
    now()
  )
  on conflict (id) do update set
    hero_images = excluded.hero_images,
    hero_eyebrow = excluded.hero_eyebrow,
    hero_title = excluded.hero_title,
    hero_description = excluded.hero_description,
    bulk_product_ids = excluded.bulk_product_ids,
    updated_by = excluded.updated_by,
    updated_at = excluded.updated_at;

  insert into public.admin_audit_log (actor_id, action, entity_type, entity_id, details)
  values (
    actor,
    'updated',
    'storefront_settings',
    'primary',
    jsonb_build_object(
      'hero_image_count', jsonb_array_length(payload -> 'hero_images'),
      'bulk_product_count', cardinality(selected_ids)
    )
  );
end;
$$;

revoke all on function public.admin_save_storefront_settings(jsonb) from public, anon;
grant execute on function public.admin_save_storefront_settings(jsonb) to authenticated;

commit;

-- Source: 202609110006_order_and_request_foundation.sql
begin;

-- Requests are retained in Supabase but can only be created by a trusted server
-- handler (service role) once abuse protection and transactional email are connected.
create type public.request_status as enum ('new', 'in_progress', 'resolved', 'closed');

create table public.contact_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  name text not null check (char_length(name) between 2 and 80),
  email text not null check (char_length(email) between 3 and 254),
  topic text not null check (char_length(topic) between 2 and 80),
  order_number text check (order_number is null or char_length(order_number) <= 50),
  message text not null check (char_length(message) between 10 and 2000),
  status public.request_status not null default 'new',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.bulk_quote_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  product_id uuid references public.products(id) on delete set null,
  name text not null check (char_length(name) between 2 and 80),
  company text check (company is null or char_length(company) <= 100),
  email text not null check (char_length(email) between 3 and 254),
  phone text not null check (char_length(phone) between 7 and 30),
  requested_options jsonb not null default '{}'::jsonb
    check (jsonb_typeof(requested_options) = 'object'),
  quantity integer not null check (quantity between 50 and 1000000),
  needed_by date,
  message text check (message is null or char_length(message) <= 1500),
  status public.request_status not null default 'new',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index contact_requests_status_created_at_idx
  on public.contact_requests(status, created_at desc);
create index bulk_quote_requests_status_created_at_idx
  on public.bulk_quote_requests(status, created_at desc);
create index bulk_quote_requests_product_id_idx
  on public.bulk_quote_requests(product_id);

create trigger contact_requests_updated_at
before update on public.contact_requests
for each row execute function public.set_updated_at();

create trigger bulk_quote_requests_updated_at
before update on public.bulk_quote_requests
for each row execute function public.set_updated_at();

alter table public.contact_requests enable row level security;
alter table public.bulk_quote_requests enable row level security;

create policy "admins read contact requests"
on public.contact_requests for select to authenticated
using (public.is_admin());

create policy "admins update contact requests"
on public.contact_requests for update to authenticated
using (public.is_admin()) with check (public.is_admin());

create policy "admins read bulk quote requests"
on public.bulk_quote_requests for select to authenticated
using (public.is_admin());

create policy "admins update bulk quote requests"
on public.bulk_quote_requests for update to authenticated
using (public.is_admin()) with check (public.is_admin());

-- Explicit grants document that browsers may read/update only through the RLS
-- policies above. Inserts remain service-role-only for the later protected APIs.
revoke all on public.contact_requests from anon, authenticated;
revoke all on public.bulk_quote_requests from anon, authenticated;
grant select, update on public.contact_requests to authenticated;
grant select, update on public.bulk_quote_requests to authenticated;

-- Preserve variant UUIDs during inventory edits so existing order-item references
-- remain stable. Removed variants are deleted only after all submitted variants
-- have been inserted or updated.
create or replace function public.admin_save_product(payload jsonb)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  saved_id uuid;
  variant_id uuid;
  retained_variant_ids uuid[] := array[]::uuid[];
  item jsonb;
  actor uuid := auth.uid();
  operation text;
begin
  if not public.is_admin() then
    raise exception 'Administrator MFA session required' using errcode = '42501';
  end if;

  saved_id := nullif(payload ->> 'id', '')::uuid;
  operation := case when saved_id is null then 'created' else 'updated' end;

  if saved_id is null then
    insert into public.products (
      category_id, name, slug, sku, product_type, summary, description,
      price_cents, compare_at_price_cents, stock_quantity,
      low_stock_threshold, status, is_featured
    ) values (
      nullif(payload ->> 'category_id', '')::uuid,
      payload ->> 'name', payload ->> 'slug', payload ->> 'sku',
      coalesce(nullif(payload ->> 'product_type', ''), 'Medical equipment'),
      coalesce(payload ->> 'summary', ''), coalesce(payload ->> 'description', ''),
      (payload ->> 'price_cents')::integer,
      nullif(payload ->> 'compare_at_price_cents', '')::integer,
      (payload ->> 'stock_quantity')::integer,
      coalesce((payload ->> 'low_stock_threshold')::integer, 5),
      (payload ->> 'status')::public.product_status,
      coalesce((payload ->> 'is_featured')::boolean, false)
    ) returning id into saved_id;
  else
    update public.products set
      category_id = nullif(payload ->> 'category_id', '')::uuid,
      name = payload ->> 'name', slug = payload ->> 'slug', sku = payload ->> 'sku',
      product_type = coalesce(nullif(payload ->> 'product_type', ''), 'Medical equipment'),
      summary = coalesce(payload ->> 'summary', ''),
      description = coalesce(payload ->> 'description', ''),
      price_cents = (payload ->> 'price_cents')::integer,
      compare_at_price_cents = nullif(payload ->> 'compare_at_price_cents', '')::integer,
      stock_quantity = (payload ->> 'stock_quantity')::integer,
      low_stock_threshold = coalesce((payload ->> 'low_stock_threshold')::integer, 5),
      status = (payload ->> 'status')::public.product_status,
      is_featured = coalesce((payload ->> 'is_featured')::boolean, false)
    where id = saved_id;
    if not found then raise exception 'Product not found'; end if;
  end if;

  for item in select value from jsonb_array_elements(coalesce(payload -> 'variants', '[]'::jsonb)) loop
    variant_id := nullif(item ->> 'id', '')::uuid;
    if variant_id is null then
      insert into public.product_variants (product_id, options, sku, stock_quantity, is_active)
      values (
        saved_id, item -> 'options', item ->> 'sku',
        (item ->> 'stock_quantity')::integer,
        coalesce((item ->> 'is_active')::boolean, true)
      ) returning id into variant_id;
    else
      update public.product_variants set
        options = item -> 'options',
        sku = item ->> 'sku',
        stock_quantity = (item ->> 'stock_quantity')::integer,
        is_active = coalesce((item ->> 'is_active')::boolean, true),
        updated_at = now()
      where id = variant_id and product_id = saved_id;
      if not found then raise exception 'Product variant not found'; end if;
    end if;
    retained_variant_ids := array_append(retained_variant_ids, variant_id);
  end loop;

  delete from public.product_variants
  where product_id = saved_id and not (id = any(retained_variant_ids));

  delete from public.product_images where product_id = saved_id;
  for item in select value from jsonb_array_elements(coalesce(payload -> 'images', '[]'::jsonb)) loop
    insert into public.product_images (product_id, storage_path, alt_text, display_order)
    values (
      saved_id, item ->> 'storage_path',
      coalesce(item ->> 'alt_text', payload ->> 'name'),
      (item ->> 'display_order')::integer
    );
  end loop;

  delete from public.product_features where product_id = saved_id;
  for item in select value from jsonb_array_elements(coalesce(payload -> 'features', '[]'::jsonb)) loop
    insert into public.product_features (product_id, feature, display_order)
    values (saved_id, item ->> 'feature', (item ->> 'display_order')::integer);
  end loop;

  delete from public.product_specifications where product_id = saved_id;
  for item in select value from jsonb_array_elements(coalesce(payload -> 'specifications', '[]'::jsonb)) loop
    insert into public.product_specifications (product_id, label, value, display_order)
    values (saved_id, item ->> 'label', item ->> 'value', (item ->> 'display_order')::integer);
  end loop;

  delete from public.product_bulk_pricing_tiers where product_id = saved_id;
  for item in select value from jsonb_array_elements(coalesce(payload -> 'bulk_pricing', '[]'::jsonb)) loop
    insert into public.product_bulk_pricing_tiers (product_id, min_quantity, discount_percent)
    values (
      saved_id, (item ->> 'min_quantity')::integer,
      (item ->> 'discount_percent')::integer
    );
  end loop;

  insert into public.admin_audit_log (actor_id, action, entity_type, entity_id, details)
  values (
    actor, operation, 'product', saved_id::text,
    jsonb_build_object('name', payload ->> 'name', 'sku', payload ->> 'sku')
  );

  return saved_id;
end;
$$;

commit;

-- Source: 202609110007_atomic_verified_orders.sql
begin;

create or replace function public.create_verified_order(payload jsonb)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  saved_id uuid;
  item jsonb;
  session_id text := nullif(payload ->> 'stripe_checkout_session_id', '');
  submitted_items jsonb := coalesce(payload -> 'items', '[]'::jsonb);
  subtotal integer := (payload ->> 'subtotal_cents')::integer;
  shipping integer := (payload ->> 'shipping_cents')::integer;
  tax integer := (payload ->> 'tax_cents')::integer;
  total integer := (payload ->> 'total_cents')::integer;
begin
  if session_id is null then
    raise exception 'Stripe Checkout session is required';
  end if;

  select id into saved_id
  from public.orders
  where stripe_checkout_session_id = session_id;
  if saved_id is not null then return saved_id; end if;

  if jsonb_typeof(payload -> 'shipping_address') <> 'object' then
    raise exception 'Shipping address is required';
  end if;
  if jsonb_typeof(submitted_items) <> 'array'
    or jsonb_array_length(submitted_items) < 1
    or jsonb_array_length(submitted_items) > 100 then
    raise exception 'One to one hundred order items are required';
  end if;
  if subtotal < 0 or shipping < 0 or tax < 0 or total <> subtotal + shipping + tax then
    raise exception 'Order totals are invalid';
  end if;

  insert into public.orders (
    order_number, user_id, guest_email, status, currency,
    subtotal_cents, shipping_cents, tax_cents, total_cents,
    stripe_checkout_session_id, stripe_payment_intent_id, shipping_address
  ) values (
    payload ->> 'order_number',
    nullif(payload ->> 'user_id', '')::uuid,
    payload ->> 'customer_email',
    'paid',
    'usd',
    subtotal, shipping, tax, total,
    session_id,
    nullif(payload ->> 'stripe_payment_intent_id', ''),
    payload -> 'shipping_address'
  ) returning id into saved_id;

  for item in select value from jsonb_array_elements(submitted_items) loop
    insert into public.order_items (
      order_id, product_id, product_variant_id, product_name, sku,
      selected_options, unit_price_cents, quantity
    ) values (
      saved_id,
      nullif(item ->> 'product_id', '')::uuid,
      nullif(item ->> 'product_variant_id', '')::uuid,
      item ->> 'product_name',
      item ->> 'sku',
      coalesce(item -> 'selected_options', '{}'::jsonb),
      (item ->> 'unit_price_cents')::integer,
      (item ->> 'quantity')::integer
    );
  end loop;

  return saved_id;
exception
  when unique_violation then
    select id into saved_id
    from public.orders
    where stripe_checkout_session_id = session_id;
    if saved_id is not null then return saved_id; end if;
    raise;
end;
$$;

revoke all on function public.create_verified_order(jsonb) from public, anon, authenticated;
grant execute on function public.create_verified_order(jsonb) to service_role;

commit;

-- Source: 202609110008_product_packaging.sql
begin;

alter table public.products
  add column pieces_per_box integer check (pieces_per_box is null or pieces_per_box > 0),
  add column boxes_per_carton integer check (boxes_per_carton is null or boxes_per_carton > 0),
  add constraint product_packaging_complete check (
    (pieces_per_box is null and boxes_per_carton is null)
    or (pieces_per_box is not null and boxes_per_carton is not null)
  );

update public.products
set pieces_per_box = 200, boxes_per_carton = 10
where slug = 'nitrile-exam-gloves';

update public.products
set pieces_per_box = 500, boxes_per_carton = 40
where slug = 'disposable-face-mask';

-- Wrap the existing, transactional product operation so packaging is saved in
-- the same transaction without duplicating its catalog and variant logic.
alter function public.admin_save_product(jsonb) rename to admin_save_product_base;
revoke all on function public.admin_save_product_base(jsonb) from public, anon, authenticated;

create function public.admin_save_product(payload jsonb)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  saved_id uuid;
  pieces integer := nullif(payload ->> 'pieces_per_box', '')::integer;
  cartons integer := nullif(payload ->> 'boxes_per_carton', '')::integer;
begin
  if not public.is_admin() then
    raise exception 'Administrator MFA session required' using errcode = '42501';
  end if;
  if (pieces is null) <> (cartons is null) then
    raise exception 'Pieces per box and boxes per carton must be provided together';
  end if;
  if coalesce(pieces, 1) < 1 or coalesce(cartons, 1) < 1 then
    raise exception 'Packaging quantities must be positive whole numbers';
  end if;

  saved_id := public.admin_save_product_base(payload);
  update public.products
  set pieces_per_box = pieces, boxes_per_carton = cartons
  where id = saved_id;
  return saved_id;
end;
$$;

revoke all on function public.admin_save_product(jsonb) from public, anon;
grant execute on function public.admin_save_product(jsonb) to authenticated;

commit;

-- Source: 202609130009_stripe_inventory_fulfillment.sql
begin;

-- A signed Stripe webhook calls this function. It remains idempotent by Checkout
-- Session ID and decrements stock in the same transaction that creates the order.
create or replace function public.create_verified_order(payload jsonb)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  saved_id uuid;
  item jsonb;
  affected integer;
  target_product_id uuid;
  target_variant_id uuid;
  item_quantity integer;
  session_id text := nullif(payload ->> 'stripe_checkout_session_id', '');
  submitted_items jsonb := coalesce(payload -> 'items', '[]'::jsonb);
  subtotal integer := (payload ->> 'subtotal_cents')::integer;
  shipping integer := (payload ->> 'shipping_cents')::integer;
  tax integer := (payload ->> 'tax_cents')::integer;
  total integer := (payload ->> 'total_cents')::integer;
begin
  if session_id is null then raise exception 'Stripe Checkout session is required'; end if;

  select id into saved_id from public.orders where stripe_checkout_session_id = session_id;
  if saved_id is not null then return saved_id; end if;

  if jsonb_typeof(payload -> 'shipping_address') <> 'object' then
    raise exception 'Shipping address is required';
  end if;
  if jsonb_typeof(submitted_items) <> 'array'
    or jsonb_array_length(submitted_items) < 1
    or jsonb_array_length(submitted_items) > 100 then
    raise exception 'One to one hundred order items are required';
  end if;
  if subtotal < 0 or shipping < 0 or tax < 0 or total <> subtotal + shipping + tax then
    raise exception 'Order totals are invalid';
  end if;

  insert into public.orders (
    order_number, user_id, guest_email, status, currency,
    subtotal_cents, shipping_cents, tax_cents, total_cents,
    stripe_checkout_session_id, stripe_payment_intent_id, shipping_address
  ) values (
    payload ->> 'order_number', nullif(payload ->> 'user_id', '')::uuid,
    payload ->> 'customer_email', 'paid', 'usd', subtotal, shipping, tax, total,
    session_id, nullif(payload ->> 'stripe_payment_intent_id', ''),
    payload -> 'shipping_address'
  ) returning id into saved_id;

  for item in select value from jsonb_array_elements(submitted_items) loop
    target_product_id := nullif(item ->> 'product_id', '')::uuid;
    target_variant_id := nullif(item ->> 'product_variant_id', '')::uuid;
    item_quantity := (item ->> 'quantity')::integer;
    if target_product_id is null or item_quantity < 1 or item_quantity > 999 then
      raise exception 'Order item is invalid';
    end if;

    if target_variant_id is not null then
      update public.product_variants
      set stock_quantity = stock_quantity - item_quantity, updated_at = now()
      where id = target_variant_id and product_id = target_product_id
        and is_active and stock_quantity >= item_quantity;
      get diagnostics affected = row_count;
      if affected <> 1 then raise exception 'A selected product variant is out of stock'; end if;
    end if;

    update public.products
    set stock_quantity = stock_quantity - item_quantity, updated_at = now()
    where id = target_product_id and status = 'active' and stock_quantity >= item_quantity;
    get diagnostics affected = row_count;
    if affected <> 1 then raise exception 'A selected product is out of stock'; end if;

    insert into public.order_items (
      order_id, product_id, product_variant_id, product_name, sku,
      selected_options, unit_price_cents, quantity
    ) values (
      saved_id, target_product_id, target_variant_id, item ->> 'product_name', item ->> 'sku',
      coalesce(item -> 'selected_options', '{}'::jsonb),
      (item ->> 'unit_price_cents')::integer, item_quantity
    );
  end loop;

  return saved_id;
exception
  when unique_violation then
    select id into saved_id from public.orders where stripe_checkout_session_id = session_id;
    if saved_id is not null then return saved_id; end if;
    raise;
end;
$$;

revoke all on function public.create_verified_order(jsonb) from public, anon, authenticated;
grant execute on function public.create_verified_order(jsonb) to service_role;

commit;

-- Source: 202609140001_limit_saved_addresses.sql
-- Limit each account to two saved shipping addresses without deleting existing data.
-- Lock the owning user row so concurrent inserts cannot bypass the count check.
create or replace function public.enforce_saved_address_limit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'UPDATE' then
    if new.user_id is not distinct from old.user_id then
      return new;
    end if;
  end if;

  perform 1 from auth.users where id = new.user_id for update;

  if (
    select count(*) from public.addresses where user_id = new.user_id
  ) >= 2 then
    raise exception 'An account may have at most two saved shipping addresses'
      using errcode = '23514';
  end if;

  return new;
end;
$$;

revoke all on function public.enforce_saved_address_limit() from public;

create trigger addresses_limit_per_user
before insert or update of user_id on public.addresses
for each row execute function public.enforce_saved_address_limit();

-- Source: 202609250001_responsive_hero_slides.sql
begin;

alter table public.storefront_settings
add column if not exists hero_slides jsonb not null default '[]'::jsonb
check (jsonb_typeof(hero_slides) = 'array');

update public.storefront_settings settings
set hero_slides = (
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'desktop_image', image.value,
        'mobile_image', image.value,
        'alt', 'OralNex featured medical supplies ' || image.ordinality,
        'published', true
      ) order by image.ordinality
    ),
    '[]'::jsonb
  )
  from jsonb_array_elements_text(settings.hero_images) with ordinality as image(value, ordinality)
)
where jsonb_array_length(hero_slides) = 0;

create or replace function public.admin_save_storefront_settings(payload jsonb)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  selected_ids uuid[];
  actor uuid := auth.uid();
  slides jsonb := coalesce(payload -> 'hero_slides', '[]'::jsonb);
begin
  if not public.is_admin() then
    raise exception 'Administrator MFA session required' using errcode = '42501';
  end if;

  if jsonb_typeof(slides) <> 'array'
    or jsonb_array_length(slides) < 1
    or jsonb_array_length(slides) > 5 then
    raise exception 'One to five hero slides are required';
  end if;

  if exists (
    select 1
    from jsonb_array_elements(slides) slide
    where nullif(trim(slide ->> 'desktop_image'), '') is null
      or nullif(trim(slide ->> 'mobile_image'), '') is null
      or char_length(trim(slide ->> 'alt')) not between 5 and 160
      or jsonb_typeof(slide -> 'published') <> 'boolean'
  ) then
    raise exception 'Every hero slide requires desktop and mobile images, alt text, and publish status';
  end if;

  if not exists (
    select 1 from jsonb_array_elements(slides) slide
    where (slide ->> 'published')::boolean
  ) then
    raise exception 'At least one hero slide must be published';
  end if;

  select coalesce(array_agg(value::text::uuid), array[]::uuid[])
  into selected_ids
  from jsonb_array_elements_text(coalesce(payload -> 'bulk_product_ids', '[]'::jsonb));

  insert into public.storefront_settings (
    id, hero_images, hero_slides, hero_eyebrow, hero_title, hero_description,
    bulk_product_ids, updated_by, updated_at
  ) values (
    true,
    payload -> 'hero_images',
    slides,
    trim(payload ->> 'hero_eyebrow'),
    trim(payload ->> 'hero_title'),
    trim(payload ->> 'hero_description'),
    selected_ids,
    actor,
    now()
  )
  on conflict (id) do update set
    hero_images = excluded.hero_images,
    hero_slides = excluded.hero_slides,
    hero_eyebrow = excluded.hero_eyebrow,
    hero_title = excluded.hero_title,
    hero_description = excluded.hero_description,
    bulk_product_ids = excluded.bulk_product_ids,
    updated_by = excluded.updated_by,
    updated_at = excluded.updated_at;

  insert into public.admin_audit_log (actor_id, action, entity_type, entity_id, details)
  values (
    actor,
    'updated',
    'storefront_settings',
    'primary',
    jsonb_build_object(
      'hero_slide_count', jsonb_array_length(slides),
      'published_hero_slide_count', (
        select count(*) from jsonb_array_elements(slides) slide
        where (slide ->> 'published')::boolean
      )
    )
  );
end;
$$;

revoke all on function public.admin_save_storefront_settings(jsonb) from public, anon;
grant execute on function public.admin_save_storefront_settings(jsonb) to authenticated;

commit;

-- Source: 202609280001_fedex_product_shipping.sql
begin;

alter table public.products
  add column if not exists shipping_weight_ounces numeric(10, 2),
  add column if not exists shipping_length_inches numeric(10, 2),
  add column if not exists shipping_width_inches numeric(10, 2),
  add column if not exists shipping_height_inches numeric(10, 2),
  add column if not exists shipping_units_per_package integer;

alter table public.products
  add constraint products_shipping_measurements_positive check (
    (shipping_weight_ounces is null and shipping_length_inches is null
      and shipping_width_inches is null and shipping_height_inches is null
      and shipping_units_per_package is null)
    or
    (shipping_weight_ounces > 0 and shipping_length_inches > 0
      and shipping_width_inches > 0 and shipping_height_inches > 0
      and shipping_units_per_package > 0)
  );

-- Wrap the current transactional admin operation so the FedEx measurements
-- are saved with the rest of the product record.
alter function public.admin_save_product(jsonb) rename to admin_save_product_shipping_base;
revoke all on function public.admin_save_product_shipping_base(jsonb)
  from public, anon, authenticated;

create function public.admin_save_product(payload jsonb)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  saved_id uuid;
  shipping_weight numeric := nullif(payload ->> 'shipping_weight_ounces', '')::numeric;
  shipping_length numeric := nullif(payload ->> 'shipping_length_inches', '')::numeric;
  shipping_width numeric := nullif(payload ->> 'shipping_width_inches', '')::numeric;
  shipping_height numeric := nullif(payload ->> 'shipping_height_inches', '')::numeric;
  shipping_capacity integer := nullif(payload ->> 'shipping_units_per_package', '')::integer;
begin
  if not public.is_admin() then
    raise exception 'Administrator MFA session required' using errcode = '42501';
  end if;

  if shipping_weight is null or shipping_length is null or shipping_width is null
    or shipping_height is null or shipping_capacity is null then
    raise exception 'All FedEx shipping measurements are required';
  end if;
  if shipping_weight <= 0 or shipping_length <= 0 or shipping_width <= 0
    or shipping_height <= 0 or shipping_capacity < 1 then
    raise exception 'FedEx shipping measurements must be positive';
  end if;

  saved_id := public.admin_save_product_shipping_base(payload);
  update public.products
  set shipping_weight_ounces = shipping_weight,
      shipping_length_inches = shipping_length,
      shipping_width_inches = shipping_width,
      shipping_height_inches = shipping_height,
      shipping_units_per_package = shipping_capacity
  where id = saved_id;
  return saved_id;
end;
$$;

revoke all on function public.admin_save_product(jsonb) from public, anon;
grant execute on function public.admin_save_product(jsonb) to authenticated;

commit;

-- Source: 202610090001_verified_shipping_profiles.sql
begin;

-- Do not backfill estimated legacy weights/dimensions as verified measurements.
alter table public.products add column if not exists shipping_package_profiles jsonb not null default '[]'::jsonb;

create function public.valid_shipping_profiles(profiles jsonb)
returns boolean language plpgsql immutable set search_path = '' as $$
declare p jsonb; k text; n numeric; longest numeric; perimeter numeric;
begin
  if profiles is null or jsonb_typeof(profiles) <> 'array' then return false; end if;
  if jsonb_array_length(profiles) > 30 then return false; end if;
  for p in select value from jsonb_array_elements(profiles) loop
    if jsonb_typeof(p) <> 'object'
      or jsonb_typeof(p->'name') is distinct from 'string'
      or length(trim(p->>'name')) = 0 or length(p->>'name') > 80
      or jsonb_typeof(p->'variantSku') is distinct from 'string'
      or length(p->>'variantSku') > 80
      or jsonb_typeof(p->'verified') is distinct from 'boolean' then return false; end if;
    foreach k in array array['boxes','weightKg','lengthCm','widthCm','heightCm'] loop
      if jsonb_typeof(p->k) is distinct from 'number' then return false; end if;
      n := (p->>k)::numeric;
      if n <= 0 then return false; end if;
      if k = 'boxes' and (n <> trunc(n) or n > 999) then return false; end if;
      if k = 'weightKg' and n > 68 then return false; end if;
      if k in ('lengthCm','widthCm','heightCm') and n > 274 then return false; end if;
    end loop;
    longest := greatest((p->>'lengthCm')::numeric,(p->>'widthCm')::numeric,(p->>'heightCm')::numeric);
    perimeter := 2 * ((p->>'lengthCm')::numeric+(p->>'widthCm')::numeric+(p->>'heightCm')::numeric-longest);
    if longest + perimeter > 419 then return false; end if;
  end loop;
  return true;
exception when others then return false;
end;
$$;

alter table public.products add constraint products_valid_shipping_profiles
  check (public.valid_shipping_profiles(shipping_package_profiles));

create or replace function public.admin_save_product(payload jsonb)
returns uuid language plpgsql security definer set search_path = '' as $$
declare saved_id uuid; profiles jsonb := payload->'shipping_package_profiles'; p jsonb;
begin
  if not public.is_admin() then
    raise exception 'Administrator MFA session required' using errcode = '42501';
  end if;
  -- Require the new client contract; an old client must not erase configured profiles.
  if not public.valid_shipping_profiles(profiles) then
    raise exception 'Valid shipping package profiles are required';
  end if;
  saved_id := public.admin_save_product_shipping_base(payload);
  for p in select value from jsonb_array_elements(profiles) loop
    if (p->>'verified')::boolean then
      if exists(select 1 from public.product_variants where product_id = saved_id and is_active) then
        if not exists(select 1 from public.product_variants where product_id = saved_id and is_active and sku = p->>'variantSku') then
          raise exception 'Verified shipping profile must reference an active variant SKU';
        end if;
      elsif p->>'variantSku' <> '' then
        raise exception 'Shipping profile must use an empty variant SKU for products without variants';
      end if;
    end if;
  end loop;
  update public.products set shipping_package_profiles = profiles where id = saved_id;
  return saved_id;
end;
$$;
revoke all on function public.admin_save_product(jsonb) from public, anon;
grant execute on function public.admin_save_product(jsonb) to authenticated;
commit;

-- Source: 202610090002_automatic_packing.sql
begin;
alter table public.products add column if not exists automatic_packing jsonb not null default '{"units":[],"cartons":[],"verified":false}'::jsonb;

create function public.valid_automatic_packing(p jsonb)
returns boolean language plpgsql immutable set search_path = '' as $$
declare u jsonb; c jsonb; k text; dims numeric[]; seen text[] := '{}';
begin
  if p is null or jsonb_typeof(p) <> 'object' or jsonb_typeof(p->'verified') is distinct from 'boolean'
    or jsonb_typeof(p->'units') is distinct from 'array' or jsonb_typeof(p->'cartons') is distinct from 'array' then return false; end if;
  if jsonb_array_length(p->'units') > 100 or jsonb_array_length(p->'cartons') > 12 then return false; end if;
  if (p->>'verified')::boolean and (jsonb_array_length(p->'units') = 0 or jsonb_array_length(p->'cartons') = 0) then return false; end if;
  for u in select value from jsonb_array_elements(p->'units') loop
    if jsonb_typeof(u->'variantSku') is distinct from 'string' or length(u->>'variantSku')>80 or (u->>'variantSku')=any(seen) then return false; end if;
    seen := array_append(seen,u->>'variantSku');
    foreach k in array array['weightKg','lengthCm','widthCm','heightCm'] loop
      if jsonb_typeof(u->k) is distinct from 'number' or (u->>k)::numeric<=0 or (u->>k)::numeric>274 then return false; end if;
    end loop;
    if (u->>'weightKg')::numeric>68 then return false; end if;
  end loop;
  for c in select value from jsonb_array_elements(p->'cartons') loop
    if jsonb_typeof(c->'name') is distinct from 'string' or length(trim(c->>'name'))=0 or length(c->>'name')>80 then return false; end if;
    foreach k in array array['innerLengthCm','innerWidthCm','innerHeightCm','lengthCm','widthCm','heightCm','tareKg','maxWeightKg'] loop
      if jsonb_typeof(c->k) is distinct from 'number' or (c->>k)::numeric<=0 or (c->>k)::numeric>274 then return false; end if;
    end loop;
    if (c->>'maxWeightKg')::numeric>68 or (c->>'tareKg')::numeric >= (c->>'maxWeightKg')::numeric
      or (c->>'innerLengthCm')::numeric>(c->>'lengthCm')::numeric
      or (c->>'innerWidthCm')::numeric>(c->>'widthCm')::numeric
      or (c->>'innerHeightCm')::numeric>(c->>'heightCm')::numeric then return false; end if;
    dims := array[ceil((c->>'lengthCm')::numeric/2.54),ceil((c->>'widthCm')::numeric/2.54),ceil((c->>'heightCm')::numeric/2.54)];
    if greatest(dims[1],dims[2],dims[3])>108 or 2*(dims[1]+dims[2]+dims[3])-greatest(dims[1],dims[2],dims[3])>165 then return false; end if;
  end loop;
  return true;
exception when others then return false;
end;
$$;
alter table public.products add constraint products_valid_automatic_packing check(public.valid_automatic_packing(automatic_packing));

create or replace function public.admin_save_product(payload jsonb)
returns uuid language plpgsql security definer set search_path = '' as $$
declare saved_id uuid; p jsonb := payload->'automatic_packing'; u jsonb;
begin
  if not public.is_admin() then raise exception 'Administrator MFA session required' using errcode='42501'; end if;
  if not public.valid_automatic_packing(p) then raise exception 'Valid automatic packing settings are required'; end if;
  saved_id := public.admin_save_product_shipping_base(payload);
  if (p->>'verified')::boolean then
    for u in select value from jsonb_array_elements(p->'units') loop
      if exists(select 1 from public.product_variants where product_id=saved_id and is_active) then
        if not exists(select 1 from public.product_variants where product_id=saved_id and is_active and sku=u->>'variantSku') then raise exception 'Packing measurements must match an active variant SKU'; end if;
      elsif u->>'variantSku' <> '' then raise exception 'Use an empty variant SKU for a product without variants'; end if;
    end loop;
  end if;
  -- Preserve prior exact-quantity profiles for history; do not guess an automatic configuration.
  update public.products set automatic_packing=p where id=saved_id;
  return saved_id;
end;
$$;
revoke all on function public.admin_save_product(jsonb) from public, anon;
grant execute on function public.admin_save_product(jsonb) to authenticated;

create table public.checkout_packing_plans (
  session_id text primary key,
  parcels jsonb not null check(jsonb_typeof(parcels)='array' and jsonb_array_length(parcels) between 1 and 100),
  created_at timestamptz not null default now()
);
alter table public.checkout_packing_plans enable row level security;
revoke all on public.checkout_packing_plans from public, anon, authenticated;
grant select, insert, delete on public.checkout_packing_plans to service_role;
alter table public.orders add column if not exists packing_plan jsonb not null default '[]'::jsonb;
create function public.attach_order_packing_plan() returns trigger
language plpgsql security definer set search_path='' as $$
begin
  select coalesce((select parcels from public.checkout_packing_plans where session_id=new.stripe_checkout_session_id),'[]'::jsonb) into new.packing_plan;
  return new;
end;
$$;
revoke all on function public.attach_order_packing_plan() from public, anon, authenticated;
create trigger attach_order_packing_plan before insert on public.orders
for each row execute function public.attach_order_packing_plan();
commit;

-- Source: 202610090003_simple_shipping_capacity.sql
begin;
-- Keep the former geometric validator for existing saved configurations.
do $$
begin
  if to_regprocedure('public.valid_geometric_packing(jsonb)') is null then
    alter function public.valid_automatic_packing(jsonb) rename to valid_geometric_packing;
  end if;
end;
$$;
create or replace function public.valid_automatic_packing(p jsonb)
returns boolean language plpgsql immutable set search_path='' as $$
declare u jsonb; c jsonb; k text; entry record; weight numeric; dims numeric[]; seen text[] := '{}';
begin
  if p is null or jsonb_typeof(p) <> 'object' or jsonb_typeof(p->'verified') is distinct from 'boolean'
    or jsonb_typeof(p->'units') is distinct from 'array' or jsonb_typeof(p->'cartons') is distinct from 'array' then return false; end if;
  -- Do not alias this column as "c": it conflicts with the PL/pgSQL variable c.
  if not exists(select 1 from jsonb_array_elements(p->'cartons') as carton_entry(value) where carton_entry.value ? 'capacityBySku') then return public.valid_geometric_packing(p); end if;
  if jsonb_array_length(p->'units')>100 or jsonb_array_length(p->'cartons')>12 then return false; end if;
  if (p->>'verified')::boolean and (jsonb_array_length(p->'units')=0 or jsonb_array_length(p->'cartons')=0) then return false; end if;
  for u in select value from jsonb_array_elements(p->'units') loop
    if jsonb_typeof(u->'variantSku') is distinct from 'string' or length(u->>'variantSku')>80 or (u->>'variantSku')=any(seen)
      or jsonb_typeof(u->'weightKg') is distinct from 'number' or (u->>'weightKg')::numeric<=0 or (u->>'weightKg')::numeric>68 then return false; end if;
    seen:=array_append(seen,u->>'variantSku');
  end loop;
  for c in select value from jsonb_array_elements(p->'cartons') loop
    if jsonb_typeof(c->'name') is distinct from 'string' or length(trim(c->>'name'))=0 or length(c->>'name')>80
      or jsonb_typeof(c->'capacityBySku') is distinct from 'object' then return false; end if;
    if (select count(*) from jsonb_each(c->'capacityBySku')) not between 1 and 100 then return false; end if;
    foreach k in array array['lengthCm','widthCm','heightCm','tareKg'] loop
      if jsonb_typeof(c->k) is distinct from 'number' or (c->>k)::numeric<=0 or (c->>k)::numeric>274 then return false; end if;
    end loop;
    if (c->>'tareKg')::numeric>68 then return false; end if;
    for entry in select key,value from jsonb_each(c->'capacityBySku') loop
      if not(entry.key=any(seen)) or jsonb_typeof(entry.value)<>'number' or entry.value::numeric<>trunc(entry.value::numeric) or entry.value::numeric not between 1 and 999 then return false; end if;
      select (v->>'weightKg')::numeric into weight from jsonb_array_elements(p->'units') v where v->>'variantSku'=entry.key;
      if weight*entry.value::numeric+(c->>'tareKg')::numeric>68 then return false; end if;
    end loop;
    dims:=array[ceil((c->>'lengthCm')::numeric/2.54),ceil((c->>'widthCm')::numeric/2.54),ceil((c->>'heightCm')::numeric/2.54)];
    if greatest(dims[1],dims[2],dims[3])>108 or 2*(dims[1]+dims[2]+dims[3])-greatest(dims[1],dims[2],dims[3])>165 then return false; end if;
  end loop;
  return true;
exception when others then return false;
end;
$$;
alter table public.products drop constraint if exists products_valid_automatic_packing;
alter table public.products add constraint products_valid_automatic_packing check(public.valid_automatic_packing(automatic_packing));
commit;

-- Source: 202610110001_carton_gross_packing.sql
begin;
create or replace function public.valid_automatic_packing(p jsonb)
returns boolean language plpgsql immutable set search_path='' as $$
declare u jsonb; c jsonb; k text; entry record; weight numeric; dims numeric[]; seen text[] := '{}';
begin
  if p is null or jsonb_typeof(p) <> 'object' or jsonb_typeof(p->'verified') is distinct from 'boolean'
    or jsonb_typeof(p->'units') is distinct from 'array' or jsonb_typeof(p->'cartons') is distinct from 'array' then return false; end if;
  if p->>'mode' = 'carton_gross' then
    if jsonb_array_length(p->'units')>100 or jsonb_array_length(p->'cartons')>12 then return false; end if;
    if (p->>'verified')::boolean and (jsonb_array_length(p->'units')=0 or jsonb_array_length(p->'cartons')=0) then return false; end if;
    for u in select value from jsonb_array_elements(p->'units') loop
      if jsonb_typeof(u->'variantSku') is distinct from 'string' or length(u->>'variantSku')>80
        or (u->>'variantSku')=any(seen) then return false; end if;
      seen:=array_append(seen,u->>'variantSku');
    end loop;
    if (p->>'verified')::boolean then
      foreach k in array seen loop
        if not exists(select 1 from jsonb_array_elements(p->'cartons') as carton_entry(value)
          where carton_entry.value->'capacityBySku' ? k) then return false; end if;
      end loop;
    end if;
    for c in select value from jsonb_array_elements(p->'cartons') loop
      if jsonb_typeof(c->'name') is distinct from 'string' or length(trim(c->>'name'))=0 or length(c->>'name')>80
        or jsonb_typeof(c->'capacityBySku') is distinct from 'object'
        or jsonb_typeof(c->'grossWeightBySku') is distinct from 'object' then return false; end if;
      if (select count(*) from jsonb_each(c->'capacityBySku')) not between 1 and 100
        or (select count(*) from jsonb_each(c->'capacityBySku'))<>(select count(*) from jsonb_each(c->'grossWeightBySku')) then return false; end if;
      foreach k in array array['lengthCm','widthCm','heightCm'] loop
        if jsonb_typeof(c->k) is distinct from 'number' or (c->>k)::numeric<=0 or (c->>k)::numeric>274 then return false; end if;
      end loop;
      for entry in select key,value from jsonb_each(c->'capacityBySku') loop
        if not(entry.key=any(seen)) or jsonb_typeof(entry.value)<>'number'
          or entry.value::numeric<>trunc(entry.value::numeric) or entry.value::numeric not between 1 and 999
          or jsonb_typeof(c->'grossWeightBySku'->entry.key) is distinct from 'number'
          or (c->'grossWeightBySku'->>entry.key)::numeric<=0
          or (c->'grossWeightBySku'->>entry.key)::numeric>68 then return false; end if;
      end loop;
      dims:=array[ceil((c->>'lengthCm')::numeric/2.54),ceil((c->>'widthCm')::numeric/2.54),ceil((c->>'heightCm')::numeric/2.54)];
      if greatest(dims[1],dims[2],dims[3])>108 or 2*(dims[1]+dims[2]+dims[3])-greatest(dims[1],dims[2],dims[3])>165 then return false; end if;
    end loop;
    return true;
  end if;
  if not exists(select 1 from jsonb_array_elements(p->'cartons') as carton_entry(value) where carton_entry.value ? 'capacityBySku') then return public.valid_geometric_packing(p); end if;
  if jsonb_array_length(p->'units')>100 or jsonb_array_length(p->'cartons')>12 then return false; end if;
  if (p->>'verified')::boolean and (jsonb_array_length(p->'units')=0 or jsonb_array_length(p->'cartons')=0) then return false; end if;
  for u in select value from jsonb_array_elements(p->'units') loop
    if jsonb_typeof(u->'variantSku') is distinct from 'string' or length(u->>'variantSku')>80 or (u->>'variantSku')=any(seen)
      or jsonb_typeof(u->'weightKg') is distinct from 'number' or (u->>'weightKg')::numeric<=0 or (u->>'weightKg')::numeric>68 then return false; end if;
    seen:=array_append(seen,u->>'variantSku');
  end loop;
  for c in select value from jsonb_array_elements(p->'cartons') loop
    if jsonb_typeof(c->'name') is distinct from 'string' or length(trim(c->>'name'))=0 or length(c->>'name')>80
      or jsonb_typeof(c->'capacityBySku') is distinct from 'object' then return false; end if;
    if (select count(*) from jsonb_each(c->'capacityBySku')) not between 1 and 100 then return false; end if;
    foreach k in array array['lengthCm','widthCm','heightCm','tareKg'] loop
      if jsonb_typeof(c->k) is distinct from 'number' or (c->>k)::numeric<=0 or (c->>k)::numeric>274 then return false; end if;
    end loop;
    if (c->>'tareKg')::numeric>68 then return false; end if;
    for entry in select key,value from jsonb_each(c->'capacityBySku') loop
      if not(entry.key=any(seen)) or jsonb_typeof(entry.value)<>'number' or entry.value::numeric<>trunc(entry.value::numeric) or entry.value::numeric not between 1 and 999 then return false; end if;
      select (v->>'weightKg')::numeric into weight from jsonb_array_elements(p->'units') v where v->>'variantSku'=entry.key;
      if weight*entry.value::numeric+(c->>'tareKg')::numeric>68 then return false; end if;
    end loop;
    dims:=array[ceil((c->>'lengthCm')::numeric/2.54),ceil((c->>'widthCm')::numeric/2.54),ceil((c->>'heightCm')::numeric/2.54)];
    if greatest(dims[1],dims[2],dims[3])>108 or 2*(dims[1]+dims[2]+dims[3])-greatest(dims[1],dims[2],dims[3])>165 then return false; end if;
  end loop;
  return true;
exception when others then return false;
end;
$$;
alter table public.products drop constraint if exists products_valid_automatic_packing;
alter table public.products add constraint products_valid_automatic_packing check(public.valid_automatic_packing(automatic_packing));
commit;

-- Source: 202610120001_api_rate_limits.sql
begin;

-- Fixed-window counters for public API abuse protection. Keys are HMACs, not emails.
create table public.api_rate_limits (
  scope text not null,
  identity_hash text not null,
  window_started_at timestamptz not null,
  attempts integer not null check (attempts > 0),
  primary key (scope, identity_hash, window_started_at)
);

create index api_rate_limits_window_started_at_idx
  on public.api_rate_limits(window_started_at);

alter table public.api_rate_limits enable row level security;
revoke all on public.api_rate_limits from public, anon, authenticated;

create or replace function public.consume_api_rate_limit(
  p_scope text,
  p_identity_hash text,
  p_limit integer,
  p_window_seconds integer
) returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_attempts integer;
  bucket_start timestamptz;
begin
  if p_scope not in ('checkout', 'contact', 'bulk_quote')
    or (p_identity_hash <> 'global' and p_identity_hash !~ '^[0-9a-f]{64}$')
    or p_limit not between 1 and 1000
    or p_window_seconds not between 60 and 86400 then
    raise exception 'Invalid rate limit parameters' using errcode = '22023';
  end if;

  bucket_start := to_timestamp(
    floor(extract(epoch from clock_timestamp()) / p_window_seconds) * p_window_seconds
  );

  insert into public.api_rate_limits(scope, identity_hash, window_started_at, attempts)
  values (p_scope, p_identity_hash, bucket_start, 1)
  on conflict (scope, identity_hash, window_started_at)
  do update set attempts = public.api_rate_limits.attempts + 1
  returning attempts into current_attempts;

  -- Opportunistic cleanup keeps the table bounded without requiring pg_cron.
  if random() < 0.01 then
    delete from public.api_rate_limits
    where window_started_at < clock_timestamp() - interval '2 days';
  end if;

  return current_attempts <= p_limit;
end;
$$;

revoke all on function public.consume_api_rate_limit(text, text, integer, integer)
  from public, anon, authenticated;
grant execute on function public.consume_api_rate_limit(text, text, integer, integer)
  to service_role;

commit;

-- Source: 202610260001_admin_list_optimization.sql
begin;

-- Match the admin list sort paths. The existing (user_id, created_at) index
-- serves buyer history, not the unfiltered admin order list.
create index if not exists orders_created_at_id_idx
  on public.orders (created_at desc, id);
create index if not exists orders_status_created_at_id_idx
  on public.orders (status, created_at desc, id);
create index if not exists orders_total_cents_id_idx
  on public.orders (total_cents desc, id);
create index if not exists contact_requests_created_at_id_idx
  on public.contact_requests (created_at desc, id);
create index if not exists bulk_quote_requests_created_at_id_idx
  on public.bulk_quote_requests (created_at desc, id);

-- One pageable request stream. SECURITY INVOKER is essential: the underlying
-- contact and quote RLS policies must be evaluated as the signed-in caller.
create or replace view public.admin_requests_feed
with (security_invoker = true)
as
select
  'contact'::text as kind,
  c.id,
  c.name,
  c.email,
  c.status,
  c.created_at,
  c.topic,
  c.order_number,
  c.message,
  null::text as company,
  null::text as phone,
  null::integer as quantity,
  null::date as needed_by,
  '{}'::jsonb as requested_options,
  null::text as product_name
from public.contact_requests c
where (select public.is_admin())
union all
select
  'quote'::text as kind,
  q.id,
  q.name,
  q.email,
  q.status,
  q.created_at,
  null::text as topic,
  null::text as order_number,
  q.message,
  q.company,
  q.phone,
  q.quantity,
  q.needed_by,
  q.requested_options,
  p.name as product_name
from public.bulk_quote_requests q
left join public.products p on p.id = q.product_id
where (select public.is_admin());

revoke all on public.admin_requests_feed from public, anon, authenticated;
grant select on public.admin_requests_feed to authenticated;

commit;

-- Source: 202611060002_live_admin_role_check.sql
-- An issued JWT can outlive an administrator role assignment. Check the
-- current database assignment on every privileged request, as well as MFA.
begin;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    (auth.jwt() ->> 'user_role') = 'admin'
    and (auth.jwt() ->> 'aal') = 'aal2'
    and exists (
      select 1
      from public.user_roles
      where user_id = (select auth.uid())
        and role = 'admin'::public.app_role
    ),
    false
  )
$$;

commit;

-- Source: 202611080001_remove_unused_schema.sql
begin;

-- The storefront, checkout, and admin no longer use these legacy features.
-- Apply only to a fresh/disposable project, or after backing up their data.
drop view if exists public.admin_requests_feed;
drop trigger if exists attach_order_packing_plan on public.orders;
drop function if exists public.attach_order_packing_plan();
drop table if exists public.checkout_packing_plans;
alter table public.orders drop column if exists packing_plan;

drop table if exists public.bulk_quote_requests;
drop table if exists public.merchandising_slots;
drop table if exists public.daily_deals;

-- Contact requests are still inserted by the trusted server route, but the
-- retired admin Requests panel no longer needs browser reads or updates.
drop policy if exists "admins read contact requests" on public.contact_requests;
drop policy if exists "admins update contact requests" on public.contact_requests;
revoke all on public.contact_requests from anon, authenticated;
drop index if exists public.contact_requests_status_created_at_idx;
drop index if exists public.contact_requests_created_at_id_idx;

commit;

-- Source: 202611110001_remove_hero_description.sql
begin;

alter table public.storefront_settings drop column if exists hero_description;

create or replace function public.admin_save_storefront_settings(payload jsonb)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  selected_ids uuid[];
  actor uuid := auth.uid();
  slides jsonb := coalesce(payload -> 'hero_slides', '[]'::jsonb);
begin
  if not public.is_admin() then
    raise exception 'Administrator MFA session required' using errcode = '42501';
  end if;

  if jsonb_typeof(slides) <> 'array'
    or jsonb_array_length(slides) < 1
    or jsonb_array_length(slides) > 5 then
    raise exception 'One to five hero slides are required';
  end if;

  if exists (
    select 1
    from jsonb_array_elements(slides) slide
    where nullif(trim(slide ->> 'desktop_image'), '') is null
      or nullif(trim(slide ->> 'mobile_image'), '') is null
      or char_length(trim(slide ->> 'alt')) not between 5 and 160
      or jsonb_typeof(slide -> 'published') <> 'boolean'
  ) then
    raise exception 'Every hero slide requires desktop and mobile images, alt text, and publish status';
  end if;

  if not exists (
    select 1 from jsonb_array_elements(slides) slide
    where (slide ->> 'published')::boolean
  ) then
    raise exception 'At least one hero slide must be published';
  end if;

  select coalesce(array_agg(value::text::uuid), array[]::uuid[])
  into selected_ids
  from jsonb_array_elements_text(coalesce(payload -> 'bulk_product_ids', '[]'::jsonb));

  insert into public.storefront_settings (
    id, hero_images, hero_slides, hero_eyebrow, hero_title,
    bulk_product_ids, updated_by, updated_at
  ) values (
    true,
    payload -> 'hero_images',
    slides,
    trim(payload ->> 'hero_eyebrow'),
    trim(payload ->> 'hero_title'),
    selected_ids,
    actor,
    now()
  )
  on conflict (id) do update set
    hero_images = excluded.hero_images,
    hero_slides = excluded.hero_slides,
    hero_eyebrow = excluded.hero_eyebrow,
    hero_title = excluded.hero_title,
    bulk_product_ids = excluded.bulk_product_ids,
    updated_by = excluded.updated_by,
    updated_at = excluded.updated_at;

  insert into public.admin_audit_log (actor_id, action, entity_type, entity_id, details)
  values (
    actor,
    'updated',
    'storefront_settings',
    'primary',
    jsonb_build_object(
      'hero_slide_count', jsonb_array_length(slides),
      'published_hero_slide_count', (
        select count(*) from jsonb_array_elements(slides) slide
        where (slide ->> 'published')::boolean
      )
    )
  );
end;
$$;

revoke all on function public.admin_save_storefront_settings(jsonb) from public, anon;
grant execute on function public.admin_save_storefront_settings(jsonb) to authenticated;

commit;

-- Source: 202611130001_checkout_inventory_reservations.sql
begin;

-- A short-lived reservation removes stock before a payment form can be opened.
-- Only the service role can create or settle one; browsers cannot change stock.
create table public.checkout_inventory_reservations (
  id uuid primary key default gen_random_uuid(),
  attempt_id uuid not null unique,
  attempt_key text not null unique,
  stripe_session_id text unique,
  state text not null default 'reserved' check (state in ('reserved', 'paid', 'released')),
  items jsonb not null check (jsonb_typeof(items) = 'array'),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null
);

create index checkout_inventory_reservations_pending_idx
  on public.checkout_inventory_reservations (expires_at)
  where state = 'reserved';

alter table public.checkout_inventory_reservations enable row level security;
revoke all on public.checkout_inventory_reservations from public, anon, authenticated;
grant select, insert, update on public.checkout_inventory_reservations to service_role;

create or replace function public.reserve_checkout_inventory(p_attempt_id uuid, p_attempt_key text, p_items jsonb)
returns uuid
language plpgsql security definer set search_path = ''
as $$
declare
  existing public.checkout_inventory_reservations%rowtype;
  item jsonb;
  item_product uuid;
  item_variant uuid;
  item_quantity integer;
  affected integer;
  reservation_id uuid;
begin
  if p_attempt_id is null or p_attempt_key is null or length(p_attempt_key) < 20 or length(p_attempt_key) > 180
    or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) < 1
    or jsonb_array_length(p_items) > 100 then
    raise exception 'Invalid checkout reservation';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_attempt_id::text, 0));
  select * into existing from public.checkout_inventory_reservations
  where attempt_id = p_attempt_id for update;
  if found then
    if existing.state <> 'reserved' or existing.attempt_key <> p_attempt_key or existing.items <> p_items then
      raise exception 'Checkout attempt is no longer available';
    end if;
    return existing.id;
  end if;

  -- Sort locks consistently so simultaneous multi-item checkouts do not deadlock.
  for item in
    select value from pg_catalog.jsonb_array_elements(p_items)
    order by value ->> 'product_id', value ->> 'variant_id'
  loop
    item_product := nullif(item ->> 'product_id', '')::uuid;
    item_variant := nullif(item ->> 'variant_id', '')::uuid;
    item_quantity := (item ->> 'quantity')::integer;
    if item_product is null or item_quantity is null or item_quantity < 1 or item_quantity > 999 then
      raise exception 'Invalid checkout item';
    end if;

    if item_variant is not null then
      update public.product_variants
      set stock_quantity = stock_quantity - item_quantity, updated_at = now()
      where id = item_variant and product_id = item_product
        and is_active and stock_quantity >= item_quantity;
      get diagnostics affected = row_count;
      if affected <> 1 then raise exception 'Selected variant is out of stock'; end if;
    end if;

    update public.products
    set stock_quantity = stock_quantity - item_quantity, updated_at = now()
    where id = item_product and status = 'active' and stock_quantity >= item_quantity;
    get diagnostics affected = row_count;
    if affected <> 1 then raise exception 'Selected product is out of stock'; end if;
  end loop;

  insert into public.checkout_inventory_reservations (attempt_id, attempt_key, items, expires_at)
  values (p_attempt_id, p_attempt_key, p_items, now() + interval '35 minutes')
  returning id into reservation_id;
  return reservation_id;
end;
$$;

create or replace function public.link_checkout_inventory(
  p_reservation_id uuid, p_session_id text, p_expires_at timestamptz
)
returns void
language plpgsql security definer set search_path = ''
as $$
begin
  if p_session_id is null or p_session_id !~ '^cs_' or p_expires_at is null then
    raise exception 'Invalid Checkout Session';
  end if;
  update public.checkout_inventory_reservations
  set stripe_session_id = p_session_id,
      expires_at = greatest(expires_at, p_expires_at + interval '5 minutes')
  where id = p_reservation_id and state = 'reserved'
    and (stripe_session_id is null or stripe_session_id = p_session_id);
  if not found then raise exception 'Checkout reservation could not be linked'; end if;
end;
$$;

create or replace function public.release_checkout_inventory(
  p_reservation_id uuid, p_session_id text default null
)
returns boolean
language plpgsql security definer set search_path = ''
as $$
declare
  reservation public.checkout_inventory_reservations%rowtype;
  item jsonb;
  item_product uuid;
  item_variant uuid;
  item_quantity integer;
begin
  select * into reservation from public.checkout_inventory_reservations
  where id = p_reservation_id for update;
  if not found or reservation.state <> 'reserved' then return false; end if;
  if reservation.stripe_session_id is distinct from p_session_id then
    raise exception 'Checkout Session does not match reservation';
  end if;
  for item in select value from pg_catalog.jsonb_array_elements(reservation.items) loop
    item_product := (item ->> 'product_id')::uuid;
    item_variant := nullif(item ->> 'variant_id', '')::uuid;
    item_quantity := (item ->> 'quantity')::integer;
    if item_variant is not null then
      update public.product_variants
      set stock_quantity = stock_quantity + item_quantity, updated_at = now()
      where id = item_variant;
    end if;
    update public.products
    set stock_quantity = stock_quantity + item_quantity, updated_at = now()
    where id = item_product;
  end loop;
  update public.checkout_inventory_reservations set state = 'released' where id = p_reservation_id;
  return true;
end;
$$;

-- Paid order creation and reservation settlement commit in the same transaction.
create or replace function public.create_verified_order(payload jsonb)
returns uuid
language plpgsql security definer set search_path = ''
as $$
declare
  saved_id uuid;
  reservation public.checkout_inventory_reservations%rowtype;
  submitted_items jsonb := coalesce(payload -> 'items', '[]'::jsonb);
  item jsonb;
  reserved_item jsonb;
  item_index integer;
  session_id text := nullif(payload ->> 'stripe_checkout_session_id', '');
  subtotal integer := (payload ->> 'subtotal_cents')::integer;
  shipping integer := (payload ->> 'shipping_cents')::integer;
  tax integer := (payload ->> 'tax_cents')::integer;
  total integer := (payload ->> 'total_cents')::integer;
begin
  if session_id is null then raise exception 'Stripe Checkout session is required'; end if;
  select id into saved_id from public.orders where stripe_checkout_session_id = session_id;
  if saved_id is not null then return saved_id; end if;

  select * into reservation from public.checkout_inventory_reservations
  where id = nullif(payload ->> 'reservation_id', '')::uuid for update;
  if not found or reservation.state <> 'reserved' or reservation.stripe_session_id <> session_id then
    raise exception 'Paid checkout has no active inventory reservation';
  end if;
  if jsonb_typeof(payload -> 'shipping_address') <> 'object'
    or jsonb_typeof(submitted_items) <> 'array'
    or jsonb_array_length(submitted_items) <> jsonb_array_length(reservation.items)
    or jsonb_array_length(submitted_items) < 1
    or subtotal < 0 or shipping < 0 or tax < 0 or total <> subtotal + shipping + tax then
    raise exception 'Paid checkout details are invalid';
  end if;
  for item_index in 0..jsonb_array_length(submitted_items) - 1 loop
    item := submitted_items -> item_index;
    reserved_item := reservation.items -> item_index;
    if item ->> 'product_id' is distinct from reserved_item ->> 'product_id'
      or item ->> 'product_variant_id' is distinct from reserved_item ->> 'variant_id'
      or (item ->> 'quantity')::integer is distinct from (reserved_item ->> 'quantity')::integer then
      raise exception 'Paid checkout items differ from reserved stock';
    end if;
  end loop;

  insert into public.orders (
    order_number, user_id, guest_email, status, currency,
    subtotal_cents, shipping_cents, tax_cents, total_cents,
    stripe_checkout_session_id, stripe_payment_intent_id, shipping_address
  ) values (
    payload ->> 'order_number', nullif(payload ->> 'user_id', '')::uuid,
    payload ->> 'customer_email', 'paid', 'usd', subtotal, shipping, tax, total,
    session_id, nullif(payload ->> 'stripe_payment_intent_id', ''), payload -> 'shipping_address'
  ) returning id into saved_id;
  for item in select value from pg_catalog.jsonb_array_elements(submitted_items) loop
    insert into public.order_items (
      order_id, product_id, product_variant_id, product_name, sku,
      selected_options, unit_price_cents, quantity
    ) values (
      saved_id, (item ->> 'product_id')::uuid,
      nullif(item ->> 'product_variant_id', '')::uuid,
      item ->> 'product_name', item ->> 'sku',
      coalesce(item -> 'selected_options', '{}'::jsonb),
      (item ->> 'unit_price_cents')::integer, (item ->> 'quantity')::integer
    );
  end loop;
  update public.checkout_inventory_reservations set state = 'paid' where id = reservation.id;
  return saved_id;
exception when unique_violation then
  select id into saved_id from public.orders where stripe_checkout_session_id = session_id;
  if saved_id is not null then return saved_id; end if;
  raise;
end;
$$;

revoke all on function public.reserve_checkout_inventory(uuid, text, jsonb) from public, anon, authenticated;
grant execute on function public.reserve_checkout_inventory(uuid, text, jsonb) to service_role;
revoke all on function public.link_checkout_inventory(uuid, text, timestamptz) from public, anon, authenticated;
grant execute on function public.link_checkout_inventory(uuid, text, timestamptz) to service_role;
revoke all on function public.release_checkout_inventory(uuid, text) from public, anon, authenticated;
grant execute on function public.release_checkout_inventory(uuid, text) to service_role;
revoke all on function public.create_verified_order(jsonb) from public, anon, authenticated;
grant execute on function public.create_verified_order(jsonb) to service_role;

commit;

-- Source: 202611140001_limit_storefront_hero_slides.sql
begin;

-- Preserve older settings while enforcing the three-slide limit on all new saves.
-- Administrators can remove extra existing slides in the storefront editor.
alter table public.storefront_settings
  add constraint storefront_hero_slides_max_three
  check (jsonb_array_length(hero_slides) <= 3) not valid;

commit;

-- Remove unused category descriptions.
begin;

create or replace function public.admin_save_category(payload jsonb)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  saved_id uuid;
  selected_ids uuid[];
  actor uuid := auth.uid();
  operation text;
begin
  if not public.is_admin() then
    raise exception 'Administrator MFA session required' using errcode = '42501';
  end if;

  saved_id := nullif(payload ->> 'id', '')::uuid;
  operation := case when saved_id is null then 'created' else 'updated' end;

  if saved_id is null then
    insert into public.categories (name, slug, image_path, display_order, is_active)
    values (
      payload ->> 'name', payload ->> 'slug',
      payload ->> 'image_path', coalesce((payload ->> 'display_order')::integer, 0), true
    ) returning id into saved_id;
  else
    update public.categories set
      name = payload ->> 'name',
      slug = payload ->> 'slug',
      image_path = payload ->> 'image_path',
      display_order = coalesce((payload ->> 'display_order')::integer, display_order)
    where id = saved_id;
    if not found then raise exception 'Category not found'; end if;
  end if;

  select coalesce(array_agg(value::text::uuid), array[]::uuid[])
  into selected_ids
  from jsonb_array_elements_text(coalesce(payload -> 'product_ids', '[]'::jsonb));

  update public.products
  set category_id = null
  where category_id = saved_id and not (id = any(selected_ids));

  update public.products
  set category_id = saved_id
  where id = any(selected_ids);

  insert into public.admin_audit_log (actor_id, action, entity_type, entity_id, details)
  values (
    actor, operation, 'category', saved_id::text,
    jsonb_build_object('name', payload ->> 'name', 'assigned_products', cardinality(selected_ids))
  );

  return saved_id;
end;
$$;

alter table public.categories drop column if exists description;

commit;
