begin;

-- The storefront, checkout, and admin no longer use these legacy features.
-- Apply only to a fresh/disposable project, or after backing up their data.
drop view if exists public.admin_requests_feed;
drop trigger if exists attach_order_packing_plan on public.orders;
drop function if exists public.attach_order_packing_plan();
drop table if exists public.checkout_packing_plans;
alter table public.orders drop column if exists packing_plan;

drop table if exists public.bulk_quote_requests;
drop table if exists public.merchandising_slots;
drop table if exists public.daily_deals;

-- Contact requests are still inserted by the trusted server route, but the
-- retired admin Requests panel no longer needs browser reads or updates.
drop policy if exists "admins read contact requests" on public.contact_requests;
drop policy if exists "admins update contact requests" on public.contact_requests;
revoke all on public.contact_requests from anon, authenticated;
drop index if exists public.contact_requests_status_created_at_idx;
drop index if exists public.contact_requests_created_at_id_idx;

commit;
