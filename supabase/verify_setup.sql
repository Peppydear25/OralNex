-- Read-only Supabase installation audit. Safe to run in the SQL Editor.
with expected_tables(table_name) as (
  values
    ('profiles'), ('addresses'), ('categories'), ('products'), ('product_variants'),
    ('product_images'), ('product_features'), ('product_specifications'),
    ('product_bulk_pricing_tiers'), ('storefront_settings'), ('orders'), ('order_items'),
    ('contact_requests'), ('user_roles'), ('admin_audit_log'), ('api_rate_limits'),
    ('checkout_inventory_reservations')
), table_checks as (
  select
    expected.table_name,
    tables.relrowsecurity as rls_enabled
  from expected_tables expected
  left join pg_catalog.pg_class tables
    on tables.relname = expected.table_name
   and tables.relnamespace = 'public'::regnamespace
), expected_functions(function_name) as (
  values
    ('admin_save_product'), ('admin_delete_product'), ('admin_save_category'),
    ('admin_delete_category'), ('admin_save_storefront_settings'), ('create_verified_order'),
    ('enforce_saved_address_limit'), ('consume_api_rate_limit'),
    ('reserve_checkout_inventory'), ('link_checkout_inventory'), ('release_checkout_inventory')
), function_checks as (
  select
    expected.function_name,
    routines.oid is not null as installed
  from expected_functions expected
  left join pg_catalog.pg_proc routines
    on routines.proname = expected.function_name
   and routines.pronamespace = 'public'::regnamespace
), expected_columns(table_name, column_name) as (
  values
    ('storefront_settings', 'hero_slides'),
    ('products', 'automatic_packing'),
    ('products', 'shipping_package_profiles')
), column_checks as (
  select expected.table_name, expected.column_name,
    columns.column_name is not null as installed
  from expected_columns expected
  left join information_schema.columns columns
    on columns.table_schema = 'public'
   and columns.table_name = expected.table_name
   and columns.column_name = expected.column_name
), expected_indexes(index_name) as (
  values
    ('orders_created_at_id_idx'), ('orders_status_created_at_id_idx'),
    ('orders_total_cents_id_idx')
), index_checks as (
  select expected.index_name, coalesce(indexes.indisvalid, false) as valid
  from expected_indexes expected
  left join pg_catalog.pg_class relations
    on relations.relname = expected.index_name
   and relations.relnamespace = 'public'::regnamespace
  left join pg_catalog.pg_index indexes on indexes.indexrelid = relations.oid
)
select 'table' as object_type, table_name as object_name,
  case when rls_enabled then 'ready' else 'missing or RLS disabled' end as status
from table_checks
union all
select 'function', function_name,
  case when installed then 'ready' else 'missing' end
from function_checks
union all
select 'column', table_name || '.' || column_name,
  case when installed then 'ready' else 'missing' end
from column_checks
union all
select 'index', index_name,
  case when valid then 'ready' else 'missing or invalid' end
from index_checks
union all
select 'cleanup', 'unused legacy schema',
  case when to_regclass('public.bulk_quote_requests') is null
    and to_regclass('public.merchandising_slots') is null
    and to_regclass('public.daily_deals') is null
    and to_regclass('public.checkout_packing_plans') is null
    and to_regprocedure('public.attach_order_packing_plan()') is null
    and to_regclass('public.contact_requests_status_created_at_idx') is null
    and to_regclass('public.contact_requests_created_at_id_idx') is null
    and not has_table_privilege('authenticated', 'public.contact_requests', 'SELECT')
    and not has_table_privilege('authenticated', 'public.contact_requests', 'UPDATE')
    and not exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'orders' and column_name = 'packing_plan'
    )
  then 'ready' else 'unused objects remain' end
union all
select 'trigger', 'addresses_limit_per_user',
  case when exists (
    select 1 from pg_catalog.pg_trigger
    where tgname = 'addresses_limit_per_user'
      and tgrelid = 'public.addresses'::regclass
      and not tgisinternal
      and tgenabled <> 'D'
  ) then 'ready' else 'missing or disabled' end
union all
select 'storage', 'product-media',
  case when exists (
    select 1 from storage.buckets
    where id = 'product-media' and public = true and file_size_limit = 8388608
  ) then 'ready' else 'missing or misconfigured' end
union all
select 'schema', 'product packaging',
  case when
    exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'products' and column_name = 'pieces_per_box'
    ) and exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'products' and column_name = 'boxes_per_carton'
    )
  then 'ready' else 'missing' end
order by object_type, object_name;
