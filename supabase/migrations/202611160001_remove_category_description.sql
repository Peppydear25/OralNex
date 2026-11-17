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
