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

insert into public.storefront_settings (
  id, hero_images, hero_eyebrow, hero_title, hero_description, bulk_product_ids
)
values (
  true,
  '["/logo.jpg", "/logo.jpg"]'::jsonb,
  'Everyday care, made simple',
  'Essential Medical Equipment',
  '',
  array[
    (select id from public.products where slug = 'nitrile-exam-gloves'),
    (select id from public.products where slug = 'disposable-face-mask')
  ]
)
on conflict (id) do nothing;

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
