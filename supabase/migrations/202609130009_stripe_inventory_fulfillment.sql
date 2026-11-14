begin;

-- A signed Stripe webhook calls this function. It remains idempotent by Checkout
-- Session ID and decrements stock in the same transaction that creates the order.
create or replace function public.create_verified_order(payload jsonb)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  saved_id uuid;
  item jsonb;
  affected integer;
  target_product_id uuid;
  target_variant_id uuid;
  item_quantity integer;
  session_id text := nullif(payload ->> 'stripe_checkout_session_id', '');
  submitted_items jsonb := coalesce(payload -> 'items', '[]'::jsonb);
  subtotal integer := (payload ->> 'subtotal_cents')::integer;
  shipping integer := (payload ->> 'shipping_cents')::integer;
  tax integer := (payload ->> 'tax_cents')::integer;
  total integer := (payload ->> 'total_cents')::integer;
begin
  if session_id is null then raise exception 'Stripe Checkout session is required'; end if;

  select id into saved_id from public.orders where stripe_checkout_session_id = session_id;
  if saved_id is not null then return saved_id; end if;

  if jsonb_typeof(payload -> 'shipping_address') <> 'object' then
    raise exception 'Shipping address is required';
  end if;
  if jsonb_typeof(submitted_items) <> 'array'
    or jsonb_array_length(submitted_items) < 1
    or jsonb_array_length(submitted_items) > 100 then
    raise exception 'One to one hundred order items are required';
  end if;
  if subtotal < 0 or shipping < 0 or tax < 0 or total <> subtotal + shipping + tax then
    raise exception 'Order totals are invalid';
  end if;

  insert into public.orders (
    order_number, user_id, guest_email, status, currency,
    subtotal_cents, shipping_cents, tax_cents, total_cents,
    stripe_checkout_session_id, stripe_payment_intent_id, shipping_address
  ) values (
    payload ->> 'order_number', nullif(payload ->> 'user_id', '')::uuid,
    payload ->> 'customer_email', 'paid', 'usd', subtotal, shipping, tax, total,
    session_id, nullif(payload ->> 'stripe_payment_intent_id', ''),
    payload -> 'shipping_address'
  ) returning id into saved_id;

  for item in select value from jsonb_array_elements(submitted_items) loop
    target_product_id := nullif(item ->> 'product_id', '')::uuid;
    target_variant_id := nullif(item ->> 'product_variant_id', '')::uuid;
    item_quantity := (item ->> 'quantity')::integer;
    if target_product_id is null or item_quantity < 1 or item_quantity > 999 then
      raise exception 'Order item is invalid';
    end if;

    if target_variant_id is not null then
      update public.product_variants
      set stock_quantity = stock_quantity - item_quantity, updated_at = now()
      where id = target_variant_id and product_id = target_product_id
        and is_active and stock_quantity >= item_quantity;
      get diagnostics affected = row_count;
      if affected <> 1 then raise exception 'A selected product variant is out of stock'; end if;
    end if;

    update public.products
    set stock_quantity = stock_quantity - item_quantity, updated_at = now()
    where id = target_product_id and status = 'active' and stock_quantity >= item_quantity;
    get diagnostics affected = row_count;
    if affected <> 1 then raise exception 'A selected product is out of stock'; end if;

    insert into public.order_items (
      order_id, product_id, product_variant_id, product_name, sku,
      selected_options, unit_price_cents, quantity
    ) values (
      saved_id, target_product_id, target_variant_id, item ->> 'product_name', item ->> 'sku',
      coalesce(item -> 'selected_options', '{}'::jsonb),
      (item ->> 'unit_price_cents')::integer, item_quantity
    );
  end loop;

  return saved_id;
exception
  when unique_violation then
    select id into saved_id from public.orders where stripe_checkout_session_id = session_id;
    if saved_id is not null then return saved_id; end if;
    raise;
end;
$$;

revoke all on function public.create_verified_order(jsonb) from public, anon, authenticated;
grant execute on function public.create_verified_order(jsonb) to service_role;

commit;
