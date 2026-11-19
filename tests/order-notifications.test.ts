import { afterEach, expect, it, vi } from "vitest";
import type Stripe from "stripe";

vi.mock("server-only", () => ({}));
const { save, list, retrieveCustomer } = vi.hoisted(() => ({
  save: vi.fn(),
  list: vi.fn(),
  retrieveCustomer: vi.fn(),
}));
vi.mock("../lib/supabase/server-orders", () => ({ createVerifiedOrder: save }));
vi.mock("../lib/stripe/server", () => ({
  getStripe: () => ({
    checkout: { sessions: { listLineItems: list } },
    customers: { retrieve: retrieveCustomer },
  }),
}));
import { recordPaidCheckout } from "../lib/stripe/record-paid-checkout";

const paidSession = {
  mode: "payment",
  currency: "usd",
  metadata: { inventory_reservation_id: "11111111-1111-4111-8111-111111111111" },
  automatic_tax: { enabled: false, status: null },
  amount_subtotal: 10000,
  shipping_cost: { amount_subtotal: 1500 },
  total_details: { amount_tax: 0 },
  amount_total: 11500,
} as const;

const lineItem = {
  quantity: 1,
  description: "Gloves",
  price: {
    unit_amount: 10000,
    product: { name: "Gloves", metadata: { on_product_id: "product-1", on_sku: "G1" } },
  },
};

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

it("records taxed shipping once", async () => {
  list.mockResolvedValue({
    has_more: false,
    data: [lineItem],
  });
  save.mockResolvedValue("order-1");
  const recorded = await recordPaidCheckout({
    ...paidSession,
    metadata: { ...paidSession.metadata, shipping_method: "USPS Ground Advantage" },
    id: "cs_test_order",
    payment_status: "paid",
    amount_total: 12449,
    total_details: { amount_tax: 949 },
    shipping_cost: { amount_subtotal: 1500, amount_total: 1624 },
    customer_details: { email: "buyer@example.com" },
    payment_intent: {
      id: "pi_test",
      shipping: { name: "Buyer", address: { line1: "123 Main St", country: "US" } },
    },
  } as unknown as Stripe.Checkout.Session);
  expect(recorded?.order).toMatchObject({
    subtotalCents: 10000,
    shippingCents: 1500,
    taxCents: 949,
    totalCents: 12449,
    shippingAddress: { shippingMethod: "USPS Ground Advantage" },
  });
});

it("does not record unpaid sessions", async () => {
  expect(
    await recordPaidCheckout({ payment_status: "unpaid" } as Stripe.Checkout.Session),
  ).toBeNull();
  expect(save).not.toHaveBeenCalled();
  expect(retrieveCustomer).not.toHaveBeenCalled();
});

it.each([
  { amount_total: null },
  { total_details: null },
  { amount_total: 1 },
  { currency: "eur" },
])("does not save a paid order with missing or inconsistent Stripe totals", async (overrides) => {
  await expect(
    recordPaidCheckout({
      ...paidSession,
      ...overrides,
      id: "cs_invalid",
      payment_status: "paid",
    } as unknown as Stripe.Checkout.Session),
  ).rejects.toThrow();
  expect(save).not.toHaveBeenCalled();
});

it("does not save a paid order when item amounts disagree with the charged subtotal", async () => {
  list.mockResolvedValue({ has_more: false, data: [lineItem] });
  await expect(
    recordPaidCheckout({
      ...paidSession,
      amount_subtotal: 9000,
      amount_total: 10500,
      id: "cs_wrong_items",
      payment_status: "paid",
      payment_intent: { id: "pi_wrong_items" },
    } as unknown as Stripe.Checkout.Session),
  ).rejects.toThrow("items do not match");
  expect(save).not.toHaveBeenCalled();
});

const savedShipping = {
  name: "Test Buyer",
  phone: "+15555550123",
  address: {
    line1: "1912 Sherwood Way",
    line2: "Suite 2",
    city: "San Angelo",
    state: "TX",
    postal_code: "76901",
    country: "US",
  },
};

it.each([false, true])(
  "preserves tax checkout shipping from Customer (expanded: %s)",
  async (expanded) => {
    list.mockResolvedValue({ has_more: false, data: [lineItem] });
    const customer = { id: "cus_test", shipping: savedShipping };
    retrieveCustomer.mockResolvedValue(customer);
    const recorded = await recordPaidCheckout({
      ...paidSession,
      id: "cs_tax",
      payment_status: "paid",
      customer: expanded ? customer : customer.id,
      customer_details: { email: "buyer@example.com" },
      payment_intent: { id: "pi_tax", shipping: null },
    } as unknown as Stripe.Checkout.Session);
    expect(recorded?.order.shippingAddress).toEqual({
      name: savedShipping.name,
      phone: savedShipping.phone,
      line1: "1912 Sherwood Way",
      line2: "Suite 2",
      city: "San Angelo",
      state: "TX",
      postalCode: "76901",
      country: "US",
    });
    expect(retrieveCustomer).toHaveBeenCalledTimes(expanded ? 0 : 1);
  },
);

it.each([
  { id: "cus_test", deleted: true },
  { id: "cus_test", shipping: null },
])("does not save an order without its delivery address", async (customer) => {
  list.mockResolvedValue({ has_more: false, data: [lineItem] });
  retrieveCustomer.mockResolvedValue(customer);
  await expect(
    recordPaidCheckout({
      ...paidSession,
      id: "cs_tax",
      payment_status: "paid",
      customer: "cus_test",
      customer_details: { email: "buyer@example.com" },
      payment_intent: { id: "pi_tax", shipping: null },
    } as unknown as Stripe.Checkout.Session),
  ).rejects.toThrow("shipping address is unavailable");
  expect(save).not.toHaveBeenCalled();
});
