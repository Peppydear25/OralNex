// Run only against a fresh, disposable local PostgreSQL cluster.
// node tests/sql/shipping-capacity-migration.mjs /tmp/oralnex-validator-XXXXXX 55479
import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import assert from "node:assert/strict";

const [socket, port] = process.argv.slice(2);
if (!/^\/tmp\/oralnex-validator-[A-Za-z0-9]+$/.test(socket ?? "") || !/^\d+$/.test(port ?? "")) {
  throw new Error("Use a disposable /tmp/oralnex-validator-* PostgreSQL socket and port.");
}
function sql(input) {
  return execFileSync(
    "psql",
    ["-X", "-h", socket, "-p", port, "-d", "postgres", "-v", "ON_ERROR_STOP=1", "-At"],
    {
      input,
      encoding: "utf8",
      stdio: ["pipe", "pipe", "pipe"],
    },
  );
}
sql(`
  create role anon;
  create role authenticated;
  create role service_role;
  create table public.products(id uuid primary key);
  create table public.orders(id uuid primary key, stripe_checkout_session_id text);
  insert into public.products values ('11111111-1111-4111-8111-111111111111');
`);
sql(readFileSync("supabase/migrations/202610090002_automatic_packing.sql", "utf8"));
const corrected = readFileSync(
  "supabase/migrations/202610090003_simple_shipping_capacity.sql",
  "utf8",
);
const broken = corrected.replace(
  "as carton_entry(value) where carton_entry.value ? 'capacityBySku'",
  "c where c ? 'capacityBySku'",
);
assert.notEqual(broken, corrected);
assert.throws(() => sql(broken), /products_valid_automatic_packing/);
sql(corrected);
// Re-running the corrected migration must be safe, too.
sql(corrected);
const cartonGrossMigration = readFileSync(
  "supabase/migrations/202610110001_carton_gross_packing.sql",
  "utf8",
);
sql(cartonGrossMigration);
sql(cartonGrossMigration);
assert.equal(
  sql("select public.valid_automatic_packing(automatic_packing) from public.products;").trim(),
  "t",
);

const packing = {
  verified: true,
  units: [{ variantSku: "BLUE", weightKg: 0.2 }],
  cartons: [
    {
      name: "Test carton",
      lengthCm: 52,
      widthCm: 39,
      heightCm: 34,
      tareKg: 0.5,
      capacityBySku: { BLUE: 40 },
    },
  ],
};
const literal = (value) => "'" + JSON.stringify(value).replaceAll("'", "''") + "'::jsonb";
assert.equal(sql(`select public.valid_automatic_packing(${literal(packing)});`).trim(), "t");
sql(`update public.products set automatic_packing=${literal(packing)};`);
assert.equal(
  sql(
    "select automatic_packing->'cartons'->0->'capacityBySku'->>'BLUE' from public.products;",
  ).trim(),
  "40",
);
for (const capacityBySku of [{ BLUE: 999 }, { BLUE: 1.5 }, { BLACK: 40 }, {}]) {
  const invalid = { ...packing, cartons: [{ ...packing.cartons[0], capacityBySku }] };
  assert.equal(sql(`select public.valid_automatic_packing(${literal(invalid)});`).trim(), "f");
  assert.throws(
    () => sql(`update public.products set automatic_packing=${literal(invalid)};`),
    /products_valid_automatic_packing/,
  );
}
const geometric = {
  verified: true,
  units: [{ variantSku: "BLUE", weightKg: 0.2, lengthCm: 10, widthCm: 5, heightCm: 2 }],
  cartons: [
    {
      name: "Legacy",
      innerLengthCm: 20,
      innerWidthCm: 10,
      innerHeightCm: 20,
      lengthCm: 22,
      widthCm: 12,
      heightCm: 22,
      tareKg: 0.5,
      maxWeightKg: 15,
    },
  ],
};
assert.equal(sql(`select public.valid_automatic_packing(${literal(geometric)});`).trim(), "t");
const cartonGross = {
  mode: "carton_gross",
  verified: true,
  units: [{ variantSku: "BLUE", weightKg: 0 }],
  cartons: [
    {
      name: "Mask master carton",
      lengthCm: 52,
      widthCm: 39,
      heightCm: 34,
      capacityBySku: { BLUE: 40 },
      grossWeightBySku: { BLUE: 9.4 },
    },
  ],
};
assert.equal(sql(`select public.valid_automatic_packing(${literal(cartonGross)});`).trim(), "t");
sql(`update public.products set automatic_packing=${literal(cartonGross)};`);
for (const grossWeightBySku of [{}, { BLUE: 0 }, { OTHER: 9.4 }, { BLUE: 69 }]) {
  const invalid = { ...cartonGross, cartons: [{ ...cartonGross.cartons[0], grossWeightBySku }] };
  assert.equal(sql(`select public.valid_automatic_packing(${literal(invalid)});`).trim(), "f");
}
assert.equal(
  sql(
    `select public.valid_automatic_packing(${literal({
      ...cartonGross,
      units: [...cartonGross.units, { variantSku: "OTHER", weightKg: 0 }],
    })});`,
  ).trim(),
  "f",
);
console.log(
  "PASS: corrected migrations, reruns, legacy data, carton gross save and rejection checks passed.",
);
