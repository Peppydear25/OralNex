import { renderToStaticMarkup } from "react-dom/server";
import { expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  retrieveSession: vi.fn(),
  recordPaidCheckout: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("next/headers", () => ({
  cookies: async () => ({ get: () => ({ value: "receipt-token" }) }),
}));
vi.mock("next/link", () => ({
  default: ({
    children,
    href,
    ...props
  }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));
vi.mock("../lib/stripe/server", () => ({
  stripeIsReady: () => true,
  getStripe: () => ({ checkout: { sessions: { retrieve: mocks.retrieveSession } } }),
}));
vi.mock("../lib/stripe/receipt-access", () => ({
  canViewReceipt: () => true,
  receiptCookieName: () => "receipt-cookie",
}));
vi.mock("../lib/stripe/record-paid-checkout", () => ({
  orderNumberForSession: () => "ON-123456789012",
  recordPaidCheckout: mocks.recordPaidCheckout,
}));
vi.mock("../app/checkout/success/clear-cart", () => ({ ClearPaidCart: () => null }));
vi.mock("../app/checkout/checkout-frame", () => ({
  CheckoutFrame: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

import CheckoutSuccessPage from "../app/checkout/success/page";

it("shows a concise order confirmation without redundant payment and unit-price details", async () => {
  mocks.retrieveSession.mockResolvedValue({
    id: "cs_test_123456789012",
    payment_status: "paid",
    client_reference_id: "buyer-1",
    amount_total: 2069,
    created: Date.parse("2026-11-21T18:36:00Z") / 1000,
    metadata: { receipt_token_hash: "hash" },
  });
  mocks.recordPaidCheckout.mockResolvedValue({
    order: {
      shippingAddress: {
        name: "Test Buyer",
        line1: "123 Main Street",
        city: "San Angelo",
        state: "TX",
        postalCode: "76901",
        country: "US",
      },
      items: [
        {
          productId: "product-1",
          sku: "BLUE",
          productName: "Exam Gloves",
          selectedOptions: { Color: "Blue" },
          quantity: 1,
          unitPriceCents: 1000,
        },
      ],
      subtotalCents: 1000,
      shippingCents: 900,
      taxCents: 169,
      totalCents: 2069,
    },
  });

  const markup = renderToStaticMarkup(
    await CheckoutSuccessPage({
      searchParams: Promise.resolve({ session_id: "cs_test_123456789012" }),
    }),
  );

  expect(markup).toContain("Order confirmed");
  expect(markup).not.toContain("Payment successful");
  expect(markup).toContain("Nov 21, 2026");
  expect(markup).not.toContain(" CT");
  expect(markup).toContain("Color: Blue");
  expect(markup).toContain("Qty: 1");
  expect(markup).not.toContain("Qty 1 ×");
  expect(markup).not.toContain("(USD)");
  expect(markup).toContain(
    "A payment receipt will be emailed to you. Keep your order number for questions.",
  );
  expect(markup.indexOf("Order number")).toBeLessThan(
    markup.indexOf(
      "A payment receipt will be emailed to you. Keep your order number for questions.",
    ),
  );
  expect(markup).toContain("Subtotal");
  expect(markup).toContain("Shipping");
  expect(markup).toContain("Tax");
  expect(markup).toContain('href="/shop"');
  expect(markup.indexOf('href="/shop"')).toBeLessThan(markup.indexOf('href="/account/dashboard"'));
});
