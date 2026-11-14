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
