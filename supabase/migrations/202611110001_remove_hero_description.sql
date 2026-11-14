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
