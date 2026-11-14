begin;

-- Match the admin list sort paths. The existing (user_id, created_at) index
-- serves buyer history, not the unfiltered admin order list.
create index if not exists orders_created_at_id_idx
  on public.orders (created_at desc, id);
create index if not exists orders_status_created_at_id_idx
  on public.orders (status, created_at desc, id);
create index if not exists orders_total_cents_id_idx
  on public.orders (total_cents desc, id);
create index if not exists contact_requests_created_at_id_idx
  on public.contact_requests (created_at desc, id);
create index if not exists bulk_quote_requests_created_at_id_idx
  on public.bulk_quote_requests (created_at desc, id);

-- One pageable request stream. SECURITY INVOKER is essential: the underlying
-- contact and quote RLS policies must be evaluated as the signed-in caller.
create or replace view public.admin_requests_feed
with (security_invoker = true)
as
select
  'contact'::text as kind,
  c.id,
  c.name,
  c.email,
  c.status,
  c.created_at,
  c.topic,
  c.order_number,
  c.message,
  null::text as company,
  null::text as phone,
  null::integer as quantity,
  null::date as needed_by,
  '{}'::jsonb as requested_options,
  null::text as product_name
from public.contact_requests c
where (select public.is_admin())
union all
select
  'quote'::text as kind,
  q.id,
  q.name,
  q.email,
  q.status,
  q.created_at,
  null::text as topic,
  null::text as order_number,
  q.message,
  q.company,
  q.phone,
  q.quantity,
  q.needed_by,
  q.requested_options,
  p.name as product_name
from public.bulk_quote_requests q
left join public.products p on p.id = q.product_id
where (select public.is_admin());

revoke all on public.admin_requests_feed from public, anon, authenticated;
grant select on public.admin_requests_feed to authenticated;

commit;
