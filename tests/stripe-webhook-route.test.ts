import { afterEach, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const { constructEvent, recordPaidCheckout, releaseInventory } = vi.hoisted(() => ({
  constructEvent: vi.fn(),
  recordPaidCheckout: vi.fn(),
  releaseInventory: vi.fn(),
}));
vi.mock("../lib/stripe/server", () => ({
  getStripe: () => ({ webhooks: { constructEvent } }),
}));
vi.mock("../lib/stripe/record-paid-checkout", () => ({ recordPaidCheckout }));
vi.mock("../lib/stripe/inventory-reservations", () => ({
  releaseCheckoutInventory: releaseInventory,
}));
vi.mock("../lib/errors/report-service-failure", () => ({ reportServiceFailure: vi.fn() }));
import { POST } from "../app/api/stripe/webhook/route";

function webhookRequest(body = "signed-payload") {
  return new Request("https://oralnex.example/api/stripe/webhook", {
    method: "POST",
    headers: { "stripe-signature": "valid-signature" },
    body,
  });
}

afterEach(() => {
  vi.unstubAllEnvs();
  vi.clearAllMocks();
});

it("rejects unsigned or oversized events before calling Stripe", async () => {
  vi.stubEnv("STRIPE_WEBHOOK_SECRET", "whsec_test");
  const unsigned = await POST(
    new Request("https://oralnex.example/api/stripe/webhook", {
      method: "POST",
      body: "payload",
    }),
  );
  expect(unsigned.status).toBe(400);
  const oversized = await POST(webhookRequest("x".repeat(1_048_577)));
  expect(oversized.status).toBe(413);
  expect(constructEvent).not.toHaveBeenCalled();
});

it("does not process a failed signature", async () => {
  vi.stubEnv("STRIPE_WEBHOOK_SECRET", "whsec_test");
  constructEvent.mockImplementation(() => {
    throw new Error("invalid signature");
  });
  const response = await POST(webhookRequest());
  expect(response.status).toBe(400);
  expect(recordPaidCheckout).not.toHaveBeenCalled();
});

it("records a paid order and acknowledges the signed event", async () => {
  vi.stubEnv("STRIPE_WEBHOOK_SECRET", "whsec_test");
  const paidSession = { id: "cs_test_paid" };
  constructEvent.mockReturnValue({
    type: "checkout.session.completed",
    data: { object: paidSession },
  });
  recordPaidCheckout.mockResolvedValue({ order: { orderNumber: "ON-TEST" } });
  expect((await POST(webhookRequest())).status).toBe(200);
  expect(constructEvent).toHaveBeenCalledWith(
    Buffer.from("signed-payload"),
    "valid-signature",
    "whsec_test",
  );
  expect(recordPaidCheckout).toHaveBeenCalledWith(paidSession);
});

it("asks Stripe to retry when recording a paid order fails", async () => {
  vi.stubEnv("STRIPE_WEBHOOK_SECRET", "whsec_test");
  constructEvent.mockReturnValue({
    type: "checkout.session.completed",
    data: { object: { id: "cs_test_paid" } },
  });
  recordPaidCheckout.mockRejectedValueOnce(new Error("database unavailable"));
  expect((await POST(webhookRequest())).status).toBe(500);
});

it("releases stock once for an expired Checkout Session", async () => {
  vi.stubEnv("STRIPE_WEBHOOK_SECRET", "whsec_test");
  const expiredSession = {
    id: "cs_test_expired",
    metadata: { inventory_reservation_id: "11111111-1111-4111-8111-111111111111" },
  };
  constructEvent.mockReturnValue({
    type: "checkout.session.expired",
    data: { object: expiredSession },
  });
  expect((await POST(webhookRequest())).status).toBe(200);
  expect(releaseInventory).toHaveBeenCalledWith(
    expiredSession.metadata.inventory_reservation_id,
    expiredSession.id,
  );
  expect(recordPaidCheckout).not.toHaveBeenCalled();
});

it("releases stock for an existing asynchronous payment failure", async () => {
  vi.stubEnv("STRIPE_WEBHOOK_SECRET", "whsec_test");
  const failedSession = {
    id: "cs_test_failed",
    metadata: { inventory_reservation_id: "11111111-1111-4111-8111-111111111111" },
  };
  constructEvent.mockReturnValue({
    type: "checkout.session.async_payment_failed",
    data: { object: failedSession },
  });
  expect((await POST(webhookRequest())).status).toBe(200);
  expect(releaseInventory).toHaveBeenCalledWith(
    failedSession.metadata.inventory_reservation_id,
    failedSession.id,
  );
  expect(recordPaidCheckout).not.toHaveBeenCalled();
});

it("records an existing delayed payment after it succeeds", async () => {
  vi.stubEnv("STRIPE_WEBHOOK_SECRET", "whsec_test");
  const session = { id: "cs_existing", payment_status: "paid" };
  constructEvent.mockReturnValue({
    type: "checkout.session.async_payment_succeeded",
    data: { object: session },
  });
  expect((await POST(webhookRequest())).status).toBe(200);
  expect(recordPaidCheckout).toHaveBeenCalledWith(session);
});
