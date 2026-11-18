import { afterEach, beforeEach, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  quote: vi.fn(),
  prepare: vi.fn(),
  createCustomer: vi.fn(),
  createSession: vi.fn(),
  verifyAddress: vi.fn(),
  getUser: vi.fn(),
  reserveInventory: vi.fn(),
  linkInventory: vi.fn(),
  releaseInventory: vi.fn(),
}));
vi.mock("server-only", () => ({}));
vi.mock("../lib/network/api-rate-limit", () => ({
  allowApiRequest: async () => true,
  rateLimitResponse: vi.fn(),
}));
vi.mock("../lib/supabase/server", () => ({
  createClient: async () => ({ auth: { getUser: mocks.getUser } }),
}));
vi.mock("../lib/stripe/server", () => ({
  stripeIsReady: () => true,
  getStripe: () => ({
    customers: { create: mocks.createCustomer },
    checkout: { sessions: { create: mocks.createSession } },
  }),
}));
vi.mock("../lib/stripe/checkout-totals", () => ({ checkoutTotals: () => null }));
vi.mock("../lib/stripe/inventory-reservations", () => ({
  CheckoutSetupError: class extends Error {},
  InventoryReservationError: class extends Error {},
  reserveCheckoutInventory: mocks.reserveInventory,
  checkoutReservationExpiry: async () => 2_000_000_000,
  linkCheckoutInventory: mocks.linkInventory,
  releaseCheckoutInventory: mocks.releaseInventory,
}));
vi.mock("../lib/shipping/checkout-quote", () => ({
  prepareCheckout: mocks.prepare,
  CheckoutValidationError: class extends Error {},
}));
vi.mock("../lib/shipping/easypost-rates", () => ({
  EasyPostUnavailable: class extends Error {
    code = "SHIPPING_RATE_UNAVAILABLE";
  },
  easypostReady: () => true,
  quoteEasyPost: mocks.quote,
}));
vi.mock("../lib/shipping/easypost-address", () => ({
  AddressVerificationError: class extends Error {},
  addressNeedsConfirmation: (input: typeof shippingAddress, verified: typeof shippingAddress) =>
    input.address1 !== verified.address1 || input.postalCode !== verified.postalCode,
  verifyDeliveryAddress: mocks.verifyAddress,
}));
import { POST } from "../app/api/stripe/checkout/route";
import { EasyPostUnavailable } from "../lib/shipping/easypost-rates";
import { canViewReceipt } from "../lib/stripe/receipt-access";
import { CheckoutSetupError } from "../lib/stripe/inventory-reservations";

const rate = {
  key: "USPS:GroundAdvantage",
  carrier: "USPS",
  service: "GroundAdvantage",
  serviceName: "USPS Ground Advantage",
  amountCents: 940,
  minimumBusinessDays: 0,
  maximumBusinessDays: 0,
};
const item = {
  productId: "00000000-0000-4000-8000-000000000001",
  variantId: null,
  quantity: 2,
  selectedOptions: {},
};
const shippingAddress = {
  firstName: "Test",
  lastName: "Buyer",
  address1: "123 Main St",
  city: "Christoval",
  state: "TX",
  postalCode: "76935",
};

function request(
  action: "quote" | "pay",
  expectedShippingCents?: number,
  attemptId = "d352b311-6b21-4af3-8400-d6db47a2811a",
  quoteToken?: string,
) {
  return new Request("http://localhost:3000/api/stripe/checkout", {
    method: "POST",
    headers: { origin: "http://localhost:3000", "content-type": "application/json" },
    body: JSON.stringify({
      action,
      email: "test@example.com",
      phone: "",
      shippingAddress,
      items: [item],
      selectedRate: rate.key,
      expectedShippingCents,
      attemptId,
      quoteToken,
    }),
  });
}

afterEach(() => {
  vi.clearAllMocks();
  vi.unstubAllEnvs();
});

it("uses the signed carrier quote for payment without a second carrier call", async () => {
  mocks.prepare.mockResolvedValue({ parcels: [], lines: [] });
  mocks.quote.mockResolvedValue([rate]);
  const quoteResponse = await POST(request("quote"));
  const { quoteToken } = await quoteResponse.json();
  mocks.createCustomer.mockResolvedValue({ id: "cus_test" });
  mocks.createSession.mockResolvedValue({ id: "cs_test", client_secret: "secret_test" });
  const response = await POST(request("pay", 940, undefined, quoteToken));
  expect(response.status).toBe(200);
  expect(mocks.quote).toHaveBeenCalledTimes(1);
  expect(mocks.verifyAddress).toHaveBeenCalledTimes(1);
  expect(
    mocks.createSession.mock.calls[0][0].shipping_options[0].shipping_rate_data.fixed_amount.amount,
  ).toBe(940);
});

it("rejects a tampered quote before creating a payment", async () => {
  mocks.prepare.mockResolvedValue({ parcels: [], lines: [] });
  mocks.quote.mockResolvedValue([rate]);
  const { quoteToken } = await (await POST(request("quote"))).json();
  const response = await POST(request("pay", 940, undefined, `${quoteToken}x`));
  expect(response.status).toBe(409);
  expect((await response.json()).code).toBe("RATE_CHANGED");
  expect(mocks.createSession).not.toHaveBeenCalled();
});

beforeEach(() => {
  vi.stubEnv("STRIPE_SECRET_KEY", "sk_test_checkout_idempotency");
  vi.stubEnv("ORDER_EMAIL_NOTIFICATIONS_ENABLED", "true");
  vi.stubEnv("RESEND_API_KEY", "test-key");
  vi.stubEnv("ORDER_EMAIL_FROM", "OralNex <orders@oralnex.com>");
  vi.stubEnv("ADMIN_NOTIFICATION_EMAIL", "admin@oralnex.com");
  mocks.verifyAddress.mockResolvedValue(shippingAddress);
  mocks.getUser.mockResolvedValue({ data: { user: null } });
  mocks.reserveInventory.mockResolvedValue("11111111-1111-4111-8111-111111111111");
});

it("allows test checkout with a test-only order-email sender", async () => {
  vi.stubEnv("ORDER_EMAIL_FROM", "OralNex <onboarding@resend.dev>");
  mocks.prepare.mockResolvedValue({ parcels: [], lines: [] });
  mocks.quote.mockResolvedValue([rate]);
  const response = await POST(request("quote"));
  expect(response.status).toBe(200);
  expect(mocks.prepare).toHaveBeenCalled();
});

it("does not start live checkout with a test-only order-email sender", async () => {
  vi.stubEnv("STRIPE_SECRET_KEY", "sk_live_checkout");
  vi.stubEnv("ORDER_EMAIL_FROM", "OralNex <onboarding@resend.dev>");
  const response = await POST(request("quote"));
  expect(response.status).toBe(503);
  expect(mocks.prepare).not.toHaveBeenCalled();
  expect(mocks.createSession).not.toHaveBeenCalled();
});

it("requires confirmation before rating a corrected address", async () => {
  mocks.verifyAddress.mockResolvedValue({ ...shippingAddress, address1: "123 MAIN STREET" });
  const response = await POST(request("quote"));
  expect(response.status).toBe(409);
  expect((await response.json()).code).toBe("ADDRESS_CONFIRMATION_REQUIRED");
  expect(mocks.quote).not.toHaveBeenCalled();
  expect(mocks.createCustomer).not.toHaveBeenCalled();
});

it("returns server-calculated options without creating a payment", async () => {
  mocks.prepare.mockResolvedValue({
    parcels: [{ weightOunces: 8, lengthInches: 8, widthInches: 5, heightInches: 4 }],
    lines: [],
  });
  mocks.quote.mockResolvedValue([rate]);
  const response = await POST(request("quote"));
  expect(response.status).toBe(200);
  expect((await response.json()).rates).toEqual([rate]);
  expect(mocks.createCustomer).not.toHaveBeenCalled();
});

it("prepares the cart while address verification is still pending", async () => {
  let finishVerification!: (value: typeof shippingAddress) => void;
  mocks.verifyAddress.mockImplementation(
    () =>
      new Promise<typeof shippingAddress>((resolve) => {
        finishVerification = resolve;
      }),
  );
  mocks.prepare.mockResolvedValue({ parcels: [], lines: [] });
  mocks.quote.mockResolvedValue([rate]);

  const responsePromise = POST(request("quote"));
  await vi.waitFor(() => expect(mocks.prepare).toHaveBeenCalledOnce());
  expect(mocks.quote).not.toHaveBeenCalled();
  finishVerification(shippingAddress);
  expect((await responsePromise).status).toBe(200);
});

it("reports a carrier rate failure before payment can start", async () => {
  mocks.prepare.mockResolvedValue({ parcels: [], lines: [] });
  mocks.quote.mockRejectedValue(new EasyPostUnavailable("Carrier timed out"));
  const response = await POST(request("quote"));
  expect(response.status).toBe(503);
  expect((await response.json()).code).toBe("SHIPPING_RATE_UNAVAILABLE");
  expect(mocks.createCustomer).not.toHaveBeenCalled();
});

it("rejects a changed carrier price before Stripe is called", async () => {
  mocks.prepare.mockResolvedValue({ parcels: [], lines: [] });
  mocks.quote.mockResolvedValue([rate]);
  const response = await POST(request("pay", 900));
  expect(response.status).toBe(409);
  expect(await response.json()).toMatchObject({ code: "RATE_CHANGED", rates: [rate] });
  expect(mocks.createCustomer).not.toHaveBeenCalled();
});

it("returns current rates when the selected service disappears", async () => {
  mocks.prepare.mockResolvedValue({ parcels: [], lines: [] });
  mocks.quote.mockResolvedValue([{ ...rate, key: "UPS:Ground" }]);
  const response = await POST(request("pay", 940));
  expect(response.status).toBe(409);
  expect(await response.json()).toMatchObject({
    code: "RATE_CHANGED",
    rates: [expect.objectContaining({ key: "UPS:Ground" })],
  });
  expect(mocks.createCustomer).not.toHaveBeenCalled();
});

it("identifies missing inventory setup before creating a Stripe customer", async () => {
  mocks.prepare.mockResolvedValue({ parcels: [], lines: [] });
  mocks.quote.mockResolvedValue([rate]);
  mocks.reserveInventory.mockRejectedValue(new CheckoutSetupError());

  const response = await POST(request("pay", 940));
  expect(response.status).toBe(503);
  expect((await response.json()).code).toBe("CHECKOUT_SETUP_REQUIRED");
  expect(mocks.createCustomer).not.toHaveBeenCalled();
  expect(mocks.createSession).not.toHaveBeenCalled();
});

it("charges the freshly quoted server amount and preserves the delivery address", async () => {
  mocks.prepare.mockResolvedValue({
    parcels: [],
    lines: [{ name: "Face mask", unitAmountCents: 1000, quantity: 2, metadata: {} }],
  });
  mocks.quote.mockResolvedValue([rate]);
  mocks.createCustomer.mockResolvedValue({ id: "cus_test" });
  mocks.createSession.mockResolvedValue({ id: "cs_test", client_secret: "secret_test" });
  const response = await POST(request("pay", 940));
  expect(response.status).toBe(200);
  const stripeInput = mocks.createSession.mock.calls[0][0];
  expect(stripeInput.ui_mode).toBe("embedded_page");
  expect(stripeInput.customer).toBe("cus_test");
  expect(stripeInput.metadata.shipping_method).toBe("USPS Ground Advantage");
  expect(stripeInput.shipping_options[0].shipping_rate_data.fixed_amount.amount).toBe(940);
  expect(stripeInput.payment_intent_data.shipping.address.postal_code).toBe("76935");
  expect(mocks.createCustomer.mock.calls[0][0].shipping.address.line1).toBe("123 Main St");
  expect(response.headers.get("cache-control")).toBe("no-store");
  expect(response.headers.get("set-cookie")).toContain("HttpOnly");
  expect(response.headers.get("set-cookie")).toContain("SameSite=lax");
});

it("uses stable Stripe keys and receipt access for retries of one attempt", async () => {
  mocks.prepare.mockResolvedValue({ parcels: [], lines: [] });
  mocks.quote.mockResolvedValue([rate]);
  mocks.createCustomer.mockResolvedValue({ id: "cus_retry" });
  mocks.createSession.mockResolvedValue({ id: "cs_retry", client_secret: "secret_retry" });

  const first = await POST(request("pay", 940));
  const second = await POST(request("pay", 940));

  expect(first.status).toBe(200);
  expect(second.status).toBe(200);
  expect(mocks.createCustomer.mock.calls[0][1].idempotencyKey).toBe(
    mocks.createCustomer.mock.calls[1][1].idempotencyKey,
  );
  expect(mocks.createSession.mock.calls[0][1].idempotencyKey).toBe(
    mocks.createSession.mock.calls[1][1].idempotencyKey,
  );
  expect(mocks.createSession.mock.calls[0][0].expires_at).toBe(2_000_000_000);
  expect(mocks.createSession.mock.calls[1][0]).toEqual(mocks.createSession.mock.calls[0][0]);
  expect(first.headers.get("set-cookie")).toBe(second.headers.get("set-cookie"));
  const token = first.headers
    .get("set-cookie")
    ?.match(/oralnex_receipt_cs_retry=([0-9a-f]{64})/)?.[1];
  expect(
    canViewReceipt(token, mocks.createSession.mock.calls[0][0].metadata.receipt_token_hash),
  ).toBe(true);

  await POST(request("pay", 940, "95ae2b10-424c-41e8-91cb-f3727e509d47"));
  expect(mocks.createSession.mock.calls[2][1].idempotencyKey).not.toBe(
    mocks.createSession.mock.calls[0][1].idempotencyKey,
  );
});

it("does not expire or release a session when linking fails after creation", async () => {
  mocks.prepare.mockResolvedValue({ parcels: [], lines: [] });
  mocks.quote.mockResolvedValue([rate]);
  mocks.createCustomer.mockResolvedValue({ id: "cus_retry" });
  mocks.createSession.mockResolvedValue({
    id: "cs_retry",
    status: "open",
    client_secret: "secret",
  });
  mocks.linkInventory.mockRejectedValueOnce(new Error("temporary database failure"));

  const response = await POST(request("pay", 940));
  expect(response.status).toBe(503);
  expect(mocks.releaseInventory).not.toHaveBeenCalled();
});

it("does not return an expired session as a payment form", async () => {
  mocks.prepare.mockResolvedValue({ parcels: [], lines: [] });
  mocks.quote.mockResolvedValue([rate]);
  mocks.createCustomer.mockResolvedValue({ id: "cus_retry" });
  mocks.createSession.mockResolvedValue({ id: "cs_retry", status: "expired" });

  const response = await POST(request("pay", 940));
  expect(response.status).toBe(409);
  expect((await response.json()).code).toBe("CHECKOUT_EXPIRED");
  expect(mocks.linkInventory).not.toHaveBeenCalled();
});

it("returns a completed session for confirmation instead of mounting payment again", async () => {
  mocks.prepare.mockResolvedValue({ parcels: [], lines: [] });
  mocks.quote.mockResolvedValue([rate]);
  mocks.createCustomer.mockResolvedValue({ id: "cus_retry" });
  mocks.createSession.mockResolvedValue({ id: "cs_retry", status: "complete" });

  const response = await POST(request("pay", 940));
  expect(await response.json()).toEqual({ sessionId: "cs_retry", status: "complete" });
  expect(response.headers.get("set-cookie")).toContain("HttpOnly");
  expect(mocks.linkInventory).not.toHaveBeenCalled();
});

it("requires a valid payment attempt ID", async () => {
  const response = await POST(request("pay", 940, "not-a-uuid"));
  expect(response.status).toBe(400);
  expect(mocks.createCustomer).not.toHaveBeenCalled();
});

it("does not attach an order to a signed-in account when the checkout email differs", async () => {
  mocks.getUser.mockResolvedValue({
    data: { user: { id: "buyer-id", email: "owner@example.com" } },
  });
  mocks.prepare.mockResolvedValue({ parcels: [], lines: [] });
  mocks.quote.mockResolvedValue([rate]);
  mocks.createCustomer.mockResolvedValue({ id: "cus_guest" });
  mocks.createSession.mockResolvedValue({ id: "cs_guest", client_secret: "secret_guest" });

  const response = await POST(request("pay", 940));
  expect(response.status).toBe(200);
  expect(mocks.createSession.mock.calls[0][0].client_reference_id).toBeUndefined();
});

it("attaches an order only when the signed-in email matches the checkout email", async () => {
  mocks.getUser.mockResolvedValue({
    data: { user: { id: "buyer-id", email: "TEST@example.com" } },
  });
  mocks.prepare.mockResolvedValue({ parcels: [], lines: [] });
  mocks.quote.mockResolvedValue([rate]);
  mocks.createCustomer.mockResolvedValue({ id: "cus_buyer" });
  mocks.createSession.mockResolvedValue({ id: "cs_buyer", client_secret: "secret_buyer" });

  const response = await POST(request("pay", 940));
  expect(response.status).toBe(200);
  expect(mocks.createSession.mock.calls[0][0].client_reference_id).toBe("buyer-id");
});

it("rejects checkout POSTs without a matching Origin header", async () => {
  const response = await POST(
    new Request("http://localhost:3000/api/stripe/checkout", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action: "quote" }),
    }),
  );
  expect(response.status).toBe(403);
  expect(response.headers.get("cache-control")).toBe("no-store");
  expect(mocks.verifyAddress).not.toHaveBeenCalled();
});

it("uses Customer shipping for Stripe Tax without passing incompatible PaymentIntent shipping", async () => {
  vi.stubEnv("STRIPE_AUTOMATIC_TAX_ENABLED", "true");
  mocks.prepare.mockResolvedValue({
    parcels: [],
    lines: [{ name: "Face mask", unitAmountCents: 1000, quantity: 1, metadata: {} }],
  });
  mocks.quote.mockResolvedValue([rate]);
  mocks.createCustomer.mockResolvedValue({ id: "cus_tax" });
  mocks.createSession.mockResolvedValue({ id: "cs_tax", client_secret: "secret_tax" });
  const response = await POST(request("pay", 940));
  expect(response.status).toBe(200);
  const stripeInput = mocks.createSession.mock.calls[0][0];
  expect(stripeInput.automatic_tax.enabled).toBe(true);
  expect(stripeInput.payment_intent_data).not.toHaveProperty("shipping");
  expect(mocks.createCustomer.mock.calls[0][0].shipping.address.postal_code).toBe("76935");
});
