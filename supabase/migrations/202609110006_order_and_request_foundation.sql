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
