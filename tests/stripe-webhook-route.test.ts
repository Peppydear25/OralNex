import { afterEach, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const {
  constructEvent,
  recordPaidCheckout,
  sendPaidOrderEmails,
  sendFailedPaymentEmail,
  releaseInventory,
} = vi.hoisted(() => ({
  constructEvent: vi.fn(),
  recordPaidCheckout: vi.fn(),
  sendPaidOrderEmails: vi.fn(),
  sendFailedPaymentEmail: vi.fn(),
  releaseInventory: vi.fn(),
}));
vi.mock("../lib/stripe/server", () => ({
  getStripe: () => ({ webhooks: { constructEvent } }),
}));
vi.mock("../lib/stripe/record-paid-checkout", () => ({ recordPaidCheckout }));
vi.mock("../lib/email/order-confirmation", () => ({ sendPaidOrderEmails }));
vi.mock("../lib/email/payment-failed", () => ({ sendFailedPaymentEmail }));
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

it("preserves signed bytes and asks Stripe to retry a notification failure", async () => {
  vi.stubEnv("STRIPE_WEBHOOK_SECRET", "whsec_test");
  const paidSession = { id: "cs_test_paid" };
  constructEvent.mockReturnValue({
    type: "checkout.session.completed",
    data: { object: paidSession },
  });
  recordPaidCheckout.mockResolvedValue({ order: { orderNumber: "ON-TEST" } });
  sendPaidOrderEmails.mockRejectedValueOnce(new Error("email service unavailable"));

  const first = await POST(webhookRequest());
  expect(first.status).toBe(503);
  expect(constructEvent).toHaveBeenCalledWith(
    Buffer.from("signed-payload"),
    "valid-signature",
    "whsec_test",
  );
  expect(recordPaidCheckout).toHaveBeenCalledWith(paidSession);

  sendPaidOrderEmails.mockResolvedValueOnce(undefined);
  const retried = await POST(webhookRequest());
  expect(retried.status).toBe(200);
  expect(recordPaidCheckout).toHaveBeenCalledTimes(2);
  expect(sendPaidOrderEmails).toHaveBeenCalledTimes(2);
});

it("notifies the customer after an asynchronous payment failure without recording a paid order", async () => {
  vi.stubEnv("STRIPE_WEBHOOK_SECRET", "whsec_test");
  const failedSession = { id: "cs_test_failed", payment_status: "unpaid" };
  constructEvent.mockReturnValue({
    type: "checkout.session.async_payment_failed",
    data: { object: failedSession },
  });
  sendFailedPaymentEmail.mockResolvedValueOnce({ skipped: false });

  expect((await POST(webhookRequest())).status).toBe(200);
  expect(sendFailedPaymentEmail).toHaveBeenCalledWith(failedSession);
  expect(recordPaidCheckout).not.toHaveBeenCalled();
  expect(sendPaidOrderEmails).not.toHaveBeenCalled();
});

it("asks Stripe to retry when a failed-payment notice cannot be delivered", async () => {
  vi.stubEnv("STRIPE_WEBHOOK_SECRET", "whsec_test");
  constructEvent.mockReturnValue({
    type: "checkout.session.async_payment_failed",
    data: { object: { id: "cs_test_failed" } },
  });
  sendFailedPaymentEmail.mockRejectedValueOnce(new Error("email service unavailable"));

  expect((await POST(webhookRequest())).status).toBe(503);
  expect(recordPaidCheckout).not.toHaveBeenCalled();
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

it("releases stock before notifying the buyer about an asynchronous payment failure", async () => {
  vi.stubEnv("STRIPE_WEBHOOK_SECRET", "whsec_test");
  const failedSession = {
    id: "cs_test_failed",
    metadata: { inventory_reservation_id: "11111111-1111-4111-8111-111111111111" },
  };
  constructEvent.mockReturnValue({
    type: "checkout.session.async_payment_failed",
    data: { object: failedSession },
  });
  sendFailedPaymentEmail.mockResolvedValue({ skipped: false });
  expect((await POST(webhookRequest())).status).toBe(200);
  expect(releaseInventory).toHaveBeenCalledWith(
    failedSession.metadata.inventory_reservation_id,
    failedSession.id,
  );
  expect(releaseInventory.mock.invocationCallOrder[0]).toBeLessThan(
    sendFailedPaymentEmail.mock.invocationCallOrder[0],
  );
});
