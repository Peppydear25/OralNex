begin;

-- A short-lived reservation removes stock before a payment form can be opened.
-- Only the service role can create or settle one; browsers cannot change stock.
create table public.checkout_inventory_reservations (
  id uuid primary key default gen_random_uuid(),
  attempt_id uuid not null unique,
  attempt_key text not null unique,
  stripe_session_id text unique,
  state text not null default 'reserved' check (state in ('reserved', 'paid', 'released')),
  items jsonb not null check (jsonb_typeof(items) = 'array'),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null
);

create index checkout_inventory_reservations_pending_idx
  on public.checkout_inventory_reservations (expires_at)
  where state = 'reserved';

alter table public.checkout_inventory_reservations enable row level security;
revoke all on public.checkout_inventory_reservations from public, anon, authenticated;
grant select, insert, update on public.checkout_inventory_reservations to service_role;

create or replace function public.reserve_checkout_inventory(p_attempt_id uuid, p_attempt_key text, p_items jsonb)
returns uuid
language plpgsql security definer set search_path = ''
as $$
declare
  existing public.checkout_inventory_reservations%rowtype;
  item jsonb;
  item_product uuid;
  item_variant uuid;
  item_quantity integer;
  affected integer;
  reservation_id uuid;
begin
  if p_attempt_id is null or p_attempt_key is null or length(p_attempt_key) < 20 or length(p_attempt_key) > 180
    or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) < 1
    or jsonb_array_length(p_items) > 100 then
    raise exception 'Invalid checkout reservation';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_attempt_id::text, 0));
  select * into existing from public.checkout_inventory_reservations
  where attempt_id = p_attempt_id for update;
  if found then
    if existing.state <> 'reserved' or existing.attempt_key <> p_attempt_key or existing.items <> p_items then
      raise exception 'Checkout attempt is no longer available';
    end if;
    return existing.id;
  end if;

  -- Sort locks consistently so simultaneous multi-item checkouts do not deadlock.
  for item in
    select value from pg_catalog.jsonb_array_elements(p_items)
    order by value ->> 'product_id', value ->> 'variant_id'
  loop
    item_product := nullif(item ->> 'product_id', '')::uuid;
    item_variant := nullif(item ->> 'variant_id', '')::uuid;
    item_quantity := (item ->> 'quantity')::integer;
    if item_product is null or item_quantity is null or item_quantity < 1 or item_quantity > 999 then
      raise exception 'Invalid checkout item';
    end if;

    if item_variant is not null then
      update public.product_variants
      set stock_quantity = stock_quantity - item_quantity, updated_at = now()
      where id = item_variant and product_id = item_product
        and is_active and stock_quantity >= item_quantity;
      get diagnostics affected = row_count;
      if affected <> 1 then raise exception 'Selected variant is out of stock'; end if;
    end if;

    update public.products
    set stock_quantity = stock_quantity - item_quantity, updated_at = now()
    where id = item_product and status = 'active' and stock_quantity >= item_quantity;
    get diagnostics affected = row_count;
    if affected <> 1 then raise exception 'Selected product is out of stock'; end if;
  end loop;

  insert into public.checkout_inventory_reservations (attempt_id, attempt_key, items, expires_at)
  values (p_attempt_id, p_attempt_key, p_items, now() + interval '35 minutes')
  returning id into reservation_id;
  return reservation_id;
end;
$$;

create or replace function public.link_checkout_inventory(
  p_reservation_id uuid, p_session_id text, p_expires_at timestamptz
)
returns void
language plpgsql security definer set search_path = ''
as $$
begin
  if p_session_id is null or p_session_id !~ '^cs_' or p_expires_at is null then
    raise exception 'Invalid Checkout Session';
  end if;
  update public.checkout_inventory_reservations
  set stripe_session_id = p_session_id,
      expires_at = greatest(expires_at, p_expires_at + interval '5 minutes')
  where id = p_reservation_id and state = 'reserved'
    and (stripe_session_id is null or stripe_session_id = p_session_id);
  if not found then raise exception 'Checkout reservation could not be linked'; end if;
end;
$$;

create or replace function public.release_checkout_inventory(
  p_reservation_id uuid, p_session_id text default null
)
returns boolean
language plpgsql security definer set search_path = ''
as $$
declare
  reservation public.checkout_inventory_reservations%rowtype;
  item jsonb;
  item_product uuid;
  item_variant uuid;
  item_quantity integer;
begin
  select * into reservation from public.checkout_inventory_reservations
  where id = p_reservation_id for update;
  if not found or reservation.state <> 'reserved' then return false; end if;
  if reservation.stripe_session_id is distinct from p_session_id then
    raise exception 'Checkout Session does not match reservation';
  end if;
  for item in select value from pg_catalog.jsonb_array_elements(reservation.items) loop
    item_product := (item ->> 'product_id')::uuid;
    item_variant := nullif(item ->> 'variant_id', '')::uuid;
    item_quantity := (item ->> 'quantity')::integer;
    if item_variant is not null then
      update public.product_variants
      set stock_quantity = stock_quantity + item_quantity, updated_at = now()
      where id = item_variant;
    end if;
    update public.products
    set stock_quantity = stock_quantity + item_quantity, updated_at = now()
    where id = item_product;
  end loop;
  update public.checkout_inventory_reservations set state = 'released' where id = p_reservation_id;
  return true;
end;
$$;

-- Paid order creation and reservation settlement commit in the same transaction.
create or replace function public.create_verified_order(payload jsonb)
returns uuid
language plpgsql security definer set search_path = ''
as $$
declare
  saved_id uuid;
  reservation public.checkout_inventory_reservations%rowtype;
  submitted_items jsonb := coalesce(payload -> 'items', '[]'::jsonb);
  item jsonb;
  reserved_item jsonb;
  item_index integer;
  session_id text := nullif(payload ->> 'stripe_checkout_session_id', '');
  subtotal integer := (payload ->> 'subtotal_cents')::integer;
  shipping integer := (payload ->> 'shipping_cents')::integer;
  tax integer := (payload ->> 'tax_cents')::integer;
  total integer := (payload ->> 'total_cents')::integer;
begin
  if session_id is null then raise exception 'Stripe Checkout session is required'; end if;
  select id into saved_id from public.orders where stripe_checkout_session_id = session_id;
  if saved_id is not null then return saved_id; end if;

  select * into reservation from public.checkout_inventory_reservations
  where id = nullif(payload ->> 'reservation_id', '')::uuid for update;
  if not found or reservation.state <> 'reserved' or reservation.stripe_session_id <> session_id then
    raise exception 'Paid checkout has no active inventory reservation';
  end if;
  if jsonb_typeof(payload -> 'shipping_address') <> 'object'
    or jsonb_typeof(submitted_items) <> 'array'
    or jsonb_array_length(submitted_items) <> jsonb_array_length(reservation.items)
    or jsonb_array_length(submitted_items) < 1
    or subtotal < 0 or shipping < 0 or tax < 0 or total <> subtotal + shipping + tax then
    raise exception 'Paid checkout details are invalid';
  end if;
  for item_index in 0..jsonb_array_length(submitted_items) - 1 loop
    item := submitted_items -> item_index;
    reserved_item := reservation.items -> item_index;
    if item ->> 'product_id' is distinct from reserved_item ->> 'product_id'
      or item ->> 'product_variant_id' is distinct from reserved_item ->> 'variant_id'
      or (item ->> 'quantity')::integer is distinct from (reserved_item ->> 'quantity')::integer then
      raise exception 'Paid checkout items differ from reserved stock';
    end if;
  end loop;

  insert into public.orders (
    order_number, user_id, guest_email, status, currency,
    subtotal_cents, shipping_cents, tax_cents, total_cents,
    stripe_checkout_session_id, stripe_payment_intent_id, shipping_address
  ) values (
    payload ->> 'order_number', nullif(payload ->> 'user_id', '')::uuid,
    payload ->> 'customer_email', 'paid', 'usd', subtotal, shipping, tax, total,
    session_id, nullif(payload ->> 'stripe_payment_intent_id', ''), payload -> 'shipping_address'
  ) returning id into saved_id;
  for item in select value from pg_catalog.jsonb_array_elements(submitted_items) loop
    insert into public.order_items (
      order_id, product_id, product_variant_id, product_name, sku,
      selected_options, unit_price_cents, quantity
    ) values (
      saved_id, (item ->> 'product_id')::uuid,
      nullif(item ->> 'product_variant_id', '')::uuid,
      item ->> 'product_name', item ->> 'sku',
      coalesce(item -> 'selected_options', '{}'::jsonb),
      (item ->> 'unit_price_cents')::integer, (item ->> 'quantity')::integer
    );
  end loop;
  update public.checkout_inventory_reservations set state = 'paid' where id = reservation.id;
  return saved_id;
exception when unique_violation then
  select id into saved_id from public.orders where stripe_checkout_session_id = session_id;
  if saved_id is not null then return saved_id; end if;
  raise;
end;
$$;

revoke all on function public.reserve_checkout_inventory(uuid, text, jsonb) from public, anon, authenticated;
grant execute on function public.reserve_checkout_inventory(uuid, text, jsonb) to service_role;
revoke all on function public.link_checkout_inventory(uuid, text, timestamptz) from public, anon, authenticated;
grant execute on function public.link_checkout_inventory(uuid, text, timestamptz) to service_role;
revoke all on function public.release_checkout_inventory(uuid, text) from public, anon, authenticated;
grant execute on function public.release_checkout_inventory(uuid, text) to service_role;
revoke all on function public.create_verified_order(jsonb) from public, anon, authenticated;
grant execute on function public.create_verified_order(jsonb) to service_role;

commit;
