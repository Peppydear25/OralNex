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
