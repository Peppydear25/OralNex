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
