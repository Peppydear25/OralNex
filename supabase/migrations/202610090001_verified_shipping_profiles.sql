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
