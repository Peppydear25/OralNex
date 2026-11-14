// Run only against a fresh, disposable local PostgreSQL cluster.
// node tests/sql/checkout-inventory-reservations.mjs /tmp/oralnex-reservation-XXXXXX 55491
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";

const [socket, port] = process.argv.slice(2);
if (!/^\/tmp\/oralnex-reservation-[A-Za-z0-9]+$/.test(socket ?? "") || !/^\d+$/.test(port ?? "")) {
  throw new Error("Use a disposable /tmp/oralnex-reservation-* PostgreSQL socket and port.");
}
function sql(input) {
  return execFileSync(
    "psql",
    ["-X", "-h", socket, "-p", port, "-d", "postgres", "-v", "ON_ERROR_STOP=1", "-At"],
    { input, encoding: "utf8", stdio: ["pipe", "pipe", "pipe"] },
  ).trim();
}

sql(`
  create role anon;
  create role authenticated;
  create role service_role;
  create extension if not exists pgcrypto;
  create type public.product_status as enum ('draft', 'active', 'archived');
  create table public.products (
    id uuid primary key, status public.product_status not null,
    stock_quantity integer not null check (stock_quantity >= 0), updated_at timestamptz default now()
  );
  create table public.product_variants (
    id uuid primary key, product_id uuid not null references public.products(id),
    is_active boolean not null, stock_quantity integer not null check (stock_quantity >= 0),
    updated_at timestamptz default now()
  );
  create table public.orders (
    id uuid primary key default gen_random_uuid(), order_number text unique,
    user_id uuid, guest_email text, status text, currency text,
    subtotal_cents integer, shipping_cents integer, tax_cents integer, total_cents integer,
    stripe_checkout_session_id text unique, stripe_payment_intent_id text unique,
    shipping_address jsonb
  );
  create table public.order_items (
    order_id uuid references public.orders(id), product_id uuid,
    product_variant_id uuid, product_name text, sku text, selected_options jsonb,
    unit_price_cents integer, quantity integer
  );
  insert into public.products values
    ('11111111-1111-4111-8111-111111111111', 'active', 1, now());
  insert into public.product_variants values
    ('22222222-2222-4222-8222-222222222222', '11111111-1111-4111-8111-111111111111', true, 1, now());
`);
sql(readFileSync("supabase/migrations/202611130001_checkout_inventory_reservations.sql", "utf8"));

const firstAttempt = "33333333-3333-4333-8333-333333333333";
const secondAttempt = "44444444-4444-4444-8444-444444444444";
const item = JSON.stringify([
  {
    product_id: "11111111-1111-4111-8111-111111111111",
    variant_id: "22222222-2222-4222-8222-222222222222",
    quantity: 1,
  },
]);
const reserve = (attempt, key) =>
  `select public.reserve_checkout_inventory('${attempt}', '${key}', '${item}'::jsonb);`;
const first = sql(reserve(firstAttempt, "oralnex-session-first-attempt"));
assert.match(first, /^[0-9a-f-]{36}$/);
assert.equal(sql("select stock_quantity from public.products;"), "0");
assert.equal(sql("select stock_quantity from public.product_variants;"), "0");
assert.equal(sql(reserve(firstAttempt, "oralnex-session-first-attempt")), first);
assert.throws(() => sql(reserve(secondAttempt, "oralnex-session-second-attempt")), /out of stock/);
sql(
  `select public.link_checkout_inventory('${first}', 'cs_test_first', now() + interval '30 minutes');`,
);
assert.equal(sql(`select public.release_checkout_inventory('${first}', 'cs_test_first');`), "t");
assert.equal(sql(`select public.release_checkout_inventory('${first}', 'cs_test_first');`), "f");
assert.equal(sql("select stock_quantity from public.products;"), "1");
assert.equal(sql("select stock_quantity from public.product_variants;"), "1");

const second = sql(reserve(secondAttempt, "oralnex-session-second-attempt"));
sql(
  `select public.link_checkout_inventory('${second}', 'cs_test_second', now() + interval '30 minutes');`,
);
const order = {
  reservation_id: second,
  stripe_checkout_session_id: "cs_test_second",
  order_number: "ON-TEST-SECOND",
  customer_email: "test@example.com",
  currency: "usd",
  subtotal_cents: 100,
  shipping_cents: 20,
  tax_cents: 10,
  total_cents: 130,
  shipping_address: { line1: "123 Main St", country: "US" },
  items: [
    {
      product_id: "11111111-1111-4111-8111-111111111111",
      product_variant_id: "22222222-2222-4222-8222-222222222222",
      product_name: "Gloves",
      sku: "G1",
      selected_options: {},
      unit_price_cents: 100,
      quantity: 1,
    },
  ],
};
const save = `select public.create_verified_order('${JSON.stringify(order)}'::jsonb);`;
const savedId = sql(save);
assert.equal(sql(save), savedId);
assert.equal(sql("select stock_quantity from public.products;"), "0");
assert.equal(sql("select stock_quantity from public.product_variants;"), "0");
assert.equal(sql(`select public.release_checkout_inventory('${second}', 'cs_test_second');`), "f");
assert.equal(sql("select count(*) from public.orders;"), "1");
assert.equal(sql("select count(*) from public.order_items;"), "1");
console.log("PASS: reservations prevent a second checkout, release once, and settle idempotently.");
