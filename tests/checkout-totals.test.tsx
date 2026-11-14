import { expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import type Stripe from "stripe";
import { checkoutTotals } from "../lib/stripe/checkout-totals";
import { OrderSummary } from "../app/checkout/order-summary";

function session(overrides: Record<string, unknown> = {}) {
  return {
    automatic_tax: { enabled: true, status: "complete" },
    amount_subtotal: 1350,
    shipping_cost: { amount_subtotal: 800, amount_total: 866 },
    total_details: { amount_tax: 178 },
    amount_total: 2328,
    ...overrides,
  } as unknown as Stripe.Checkout.Session;
}

it("uses Stripe amounts without double counting shipping tax", () => {
  expect(checkoutTotals(session())).toEqual({
    subtotalCents: 1350,
    shippingCents: 800,
    taxCents: 178,
    totalCents: 2328,
  });
});

it.each([null, "requires_location_inputs", "failed"])(
  "does not treat incomplete tax (%s) as zero",
  (status) => {
    expect(checkoutTotals(session({ automatic_tax: { enabled: true, status } }))).toBeNull();
  },
);

it("accepts a completed zero-tax calculation", () => {
  expect(
    checkoutTotals(session({ total_details: { amount_tax: 0 }, amount_total: 2150 }))?.taxCents,
  ).toBe(0);
});

it.each([
  { amount_total: null },
  { amount_total: 9999 },
  { shipping_cost: null },
  { total_details: null },
])("withholds missing or inconsistent amounts", (overrides) => {
  expect(checkoutTotals(session(overrides))).toBeNull();
});

it("renders the estimated tax and total supplied by Stripe", () => {
  const html = renderToStaticMarkup(
    <OrderSummary
      rows={[]}
      itemCount={1}
      subtotal={10}
      shippingRate={{ serviceName: "USPS Ground Advantage", amountCents: 800 }}
      totals={checkoutTotals(session())}
    />,
  );
  expect(html).toContain("Estimated taxes");
  expect(html).toContain("$1.78");
  expect(html).toContain("23.28");
  expect(html).toContain("13.50");
  expect(html).toContain("USD");
  expect(html).toContain("<dt>Subtotal</dt>");
  expect(html).not.toContain("Discount code");
  expect(html).not.toContain("Bulk savings included");
});

it("labels the pre-shipping amount as an estimate rather than a final total", () => {
  const html = renderToStaticMarkup(<OrderSummary rows={[]} itemCount={1} subtotal={10} />);
  expect(html).toContain("Enter shipping address");
  expect(html).toContain("Estimated total; shipping and tax are added before payment.");
  expect(html).toContain("<dt>Estimated total</dt>");
  expect(html).toContain("$10.00");
  expect(html).not.toContain("Estimated taxes");
  expect(html).not.toContain("<dt>Items</dt>");
  expect(html).not.toContain("$0.00");
});

it("includes a selected shipping rate in the estimated total without inventing tax", () => {
  const html = renderToStaticMarkup(
    <OrderSummary
      rows={[]}
      itemCount={1}
      subtotal={10}
      shippingRate={{ serviceName: "USPS Ground Advantage", amountCents: 800 }}
    />,
  );
  expect(html).toContain("$18.00");
  expect(html).toContain("Estimated total; tax is calculated before payment.");
  expect(html).toContain("Estimated taxes");
  expect(html).toContain("Calculated at payment");
  expect(html).toContain("<dt>Estimated total</dt>");
});
