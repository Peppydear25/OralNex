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
