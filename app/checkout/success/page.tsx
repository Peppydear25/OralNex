import type { Metadata } from "next";
import { cookies } from "next/headers";
import Link from "next/link";
import { reportServiceFailure } from "../../../lib/errors/report-service-failure";
import { getStripe, stripeIsReady } from "../../../lib/stripe/server";
import { canViewReceipt, receiptCookieName } from "../../../lib/stripe/receipt-access";
import {
  orderNumberForSession,
  recordPaidCheckout,
} from "../../../lib/stripe/record-paid-checkout";
import { ClearPaidCart } from "./clear-cart";
import { CheckoutFrame } from "../checkout-frame";
import { formatAddressText } from "../format-address-text";

const money = (cents: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);

function ReceiptRow({
  label,
  value,
  strong = false,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <div
      className={`flex items-baseline justify-between gap-4 ${strong ? "border-t border-slate-200 pt-3 text-base font-semibold text-slate-950" : "text-sm text-slate-700"}`}
    >
      <dt>{label}</dt>
      <dd className="text-right tabular-nums">{value}</dd>
    </div>
  );
}

export const metadata: Metadata = {
  title: "Order confirmation",
  robots: { index: false, follow: false },
};

export default async function CheckoutSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ session_id?: string }>;
}) {
  const { session_id: sessionId } = await searchParams;
  let paid = false;
  let recorded = false;
  let receiptAccessDenied = false;
  let buyerOrder = false;
  let totalCents: number | null = null;
  let confirmedAt: Date | null = null;
  let receipt: Awaited<ReturnType<typeof recordPaidCheckout>> = null;
  if (stripeIsReady() && sessionId?.startsWith("cs_")) {
    try {
      const session = await getStripe().checkout.sessions.retrieve(sessionId);
      const receiptCookie = (await cookies()).get(receiptCookieName(sessionId))?.value;
      if (canViewReceipt(receiptCookie, session.metadata?.receipt_token_hash)) {
        paid = session.payment_status === "paid";
        buyerOrder = Boolean(session.client_reference_id);
        totalCents = session.amount_total;
        confirmedAt = new Date(session.created * 1000);
        if (paid) {
          receipt = await recordPaidCheckout(session);
          recorded = true;
        }
      } else {
        receiptAccessDenied = true;
      }
    } catch (error) {
      reportServiceFailure("checkout.confirmation", error);
    }
  }

  const hasSession = Boolean(sessionId?.startsWith("cs_"));
  const title = recorded
    ? "Your order is confirmed"
    : receiptAccessDenied
      ? "Receipt unavailable on this device"
      : paid
        ? "Payment received"
        : hasSession
          ? "We’re checking your payment"
          : "No order to confirm";
  const description = recorded
    ? "Payment was successful and your order has been submitted."
    : receiptAccessDenied
      ? "For your privacy, this receipt can only be viewed in the browser used to start payment. Check your confirmation email or contact us for help."
      : paid
        ? "Your payment succeeded, but we’re still saving the order. Please do not pay again. Check this page again shortly."
        : hasSession
          ? "We haven’t verified this payment yet. Please do not submit another payment until its status is clear."
          : "We couldn’t find a checkout session in this link. If you have already paid, contact us before trying again.";
  const orderNumber = recorded && sessionId ? orderNumberForSession(sessionId) : null;
  const formattedTotal =
    totalCents === null
      ? null
      : new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(
          totalCents / 100,
        );
  const formattedDate = confirmedAt
    ? new Intl.DateTimeFormat("en-US", {
        dateStyle: "medium",
        timeZone: "America/Chicago",
      }).format(confirmedAt)
    : null;

  if (recorded && receipt && orderNumber) {
    const { order } = receipt;
    const address = order.shippingAddress;
    const location = [formatAddressText(address.city), address.state, address.postalCode]
      .filter(Boolean)
      .join(", ");
    const displayAddress = [
      address.name,
      address.company,
      formatAddressText(address.line1),
      formatAddressText(address.line2),
      location,
      address.country && address.country !== "US" ? address.country : null,
    ]
      .filter(Boolean)
      .join(" · ");
    return (
      <CheckoutFrame backHref="/shop" backLabel="Continue shopping">
        <main className="bg-[#f5f7f7] px-4 py-6 text-[#172d36] print:bg-white print:p-0 sm:py-10">
          <article className="mx-auto max-w-[760px] overflow-hidden rounded-2xl border border-[#dce9eb] bg-white shadow-[0_12px_40px_rgba(20,55,62,.06)] print:border-0 print:shadow-none">
            <div className="px-5 py-6 sm:px-8 sm:py-8">
              <header className="border-b border-slate-200 pb-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h1 className="text-2xl font-semibold tracking-tight">Order confirmed</h1>
                  </div>
                  <span
                    className="grid size-8 shrink-0 place-items-center rounded-full bg-[#e9f7f8] text-[#08788c]"
                    role="status"
                    title="Paid"
                  >
                    <svg
                      aria-hidden="true"
                      className="size-4"
                      fill="none"
                      stroke="currentColor"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2.5"
                      viewBox="0 0 24 24"
                    >
                      <path d="m5 12 4 4L19 6" />
                    </svg>
                    <span className="sr-only">Paid</span>
                  </span>
                </div>
                <dl className="mt-5 grid gap-x-8 gap-y-3 text-sm sm:grid-cols-2">
                  <div>
                    <dt className="text-slate-500">Order number</dt>
                    <dd className="mt-1 break-all font-semibold">{orderNumber}</dd>
                  </div>
                  <div>
                    <dt className="text-slate-500">Order date</dt>
                    <dd className="mt-1 font-semibold">{formattedDate ?? "Confirmed"}</dd>
                  </div>
                </dl>
                <p className="mt-5 text-sm italic text-slate-700">
                  A payment receipt will be emailed to you. Keep your order number for questions.
                </p>
              </header>

              <section className="py-4" aria-labelledby="receipt-items">
                <h2 id="receipt-items" className="text-base font-semibold">
                  Items
                </h2>
                <div className="mt-1 divide-y divide-slate-200">
                  {order.items.map((item) => (
                    <div
                      key={`${item.productId}-${item.sku}`}
                      className="flex items-start justify-between gap-4 py-2.5 text-sm"
                    >
                      <div className="min-w-0">
                        <p className="font-semibold text-slate-900">{item.productName}</p>
                        <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-slate-500">
                          {Object.keys(item.selectedOptions).length > 0 && (
                            <span>
                              {Object.entries(item.selectedOptions)
                                .map(([key, value]) => `${key}: ${value}`)
                                .join(" · ")}
                            </span>
                          )}
                          <span>Qty: {item.quantity}</span>
                        </div>
                      </div>
                      <p className="shrink-0 font-semibold tabular-nums">
                        {money(item.quantity * item.unitPriceCents)}
                      </p>
                    </div>
                  ))}
                </div>
              </section>

              <section
                className="flex min-w-0 flex-col gap-1 border-b border-t border-slate-200 py-3 sm:flex-row sm:items-baseline sm:gap-4"
                aria-labelledby="delivery-heading"
              >
                <h2 id="delivery-heading" className="shrink-0 text-sm font-semibold">
                  Delivery address
                </h2>
                <address
                  className="min-w-0 flex-1 overflow-x-auto whitespace-nowrap text-sm not-italic text-slate-600 print:whitespace-normal"
                  title={displayAddress}
                >
                  {displayAddress}
                </address>
              </section>

              <section className="ml-auto max-w-sm py-5" aria-labelledby="total-heading">
                <h2 id="total-heading" className="sr-only">
                  Payment total
                </h2>
                <dl className="space-y-2">
                  <ReceiptRow label="Subtotal" value={money(order.subtotalCents)} />
                  <ReceiptRow label="Shipping" value={money(order.shippingCents)} />
                  <ReceiptRow label="Tax" value={money(order.taxCents)} />
                  <ReceiptRow label="Total paid" value={money(order.totalCents)} strong />
                </dl>
              </section>
              {sessionId && <ClearPaidCart sessionId={sessionId} />}
              <div className="flex flex-wrap gap-2 border-t border-slate-200 pt-4 print:hidden max-sm:grid max-sm:grid-cols-2 max-sm:gap-2.5">
                <Link
                  href="/shop"
                  className="inline-flex min-h-11 items-center justify-center rounded-lg bg-[#102f38] px-4 py-2.5 text-center text-sm font-semibold text-white no-underline transition-colors hover:bg-[#0a8d99] max-sm:px-2 max-sm:text-xs"
                >
                  Continue shopping
                </Link>
                {buyerOrder && (
                  <Link
                    href="/account/dashboard"
                    className="inline-flex min-h-11 items-center justify-center rounded-lg border border-slate-300 px-4 py-2.5 text-center text-sm font-semibold text-[#08788c] no-underline transition-colors hover:border-[#0a8d99] hover:bg-[#f0fafb] max-sm:px-2 max-sm:text-xs"
                  >
                    View my account
                  </Link>
                )}
                <Link
                  href="/contact"
                  className="self-center px-2 text-sm font-semibold text-[#08788c] underline underline-offset-2 max-sm:col-span-2 max-sm:mt-1 max-sm:justify-self-center max-sm:px-0"
                >
                  Need help?
                </Link>
              </div>
            </div>
          </article>
        </main>
      </CheckoutFrame>
    );
  }

  return (
    <CheckoutFrame backHref="/shop" backLabel="Continue shopping">
      <main className="relative grid min-h-[72vh] place-items-center overflow-hidden bg-[#f4f8f8] px-6 py-14 text-slate-800 max-sm:px-4 max-sm:py-8">
        <span className="pointer-events-none absolute -left-32 top-12 size-96 rounded-full bg-[#0a8d99]/8 blur-3xl" />
        <span className="pointer-events-none absolute -right-32 bottom-0 size-96 rounded-full bg-cyan-100/60 blur-3xl" />
        <section className="relative w-full max-w-[680px] overflow-hidden rounded-2xl border border-[#dce9eb] bg-white shadow-[0_12px_40px_rgba(20,55,62,.06)] max-sm:rounded-2xl">
          <div className="h-1.5 bg-[#0a8d99]" />
          <div className="grid justify-items-center gap-5 px-9 pb-8 pt-10 text-center max-sm:px-5 max-sm:pb-6 max-sm:pt-7">
            <span
              className={`relative grid size-16 place-items-center rounded-full ${recorded ? "bg-[#dcf7ef] text-[#087e69]" : "bg-amber-50 text-amber-700"}`}
              aria-hidden="true"
            >
              {recorded ? (
                <svg
                  className="size-7"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="m5 12 4.5 4.5L19 7" />
                </svg>
              ) : (
                <svg
                  className="size-7"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                >
                  <circle cx="12" cy="12" r="9" />
                  <path d="M12 7v5m0 4h.01" />
                </svg>
              )}
            </span>
            <div className="max-w-lg">
              <p
                className={`text-xs font-bold uppercase tracking-[.14em] ${recorded ? "text-emerald-700" : "text-amber-700"}`}
              >
                {recorded
                  ? "Payment complete · Order saved"
                  : paid
                    ? "Payment received · Order pending"
                    : "Confirmation pending"}
              </p>
              <h1 className="mt-2 text-[clamp(25px,5vw,34px)] font-semibold leading-tight tracking-[-.025em]">
                {title}
              </h1>
              <p className="mt-3 text-sm leading-6 text-slate-600">{description}</p>
            </div>
            {recorded && orderNumber && (
              <dl className="w-full divide-y divide-slate-200 rounded-2xl border border-slate-200 bg-[#fbfcfc] px-5 text-left text-sm [&>div]:flex [&>div]:items-start [&>div]:justify-between [&>div]:gap-5 [&>div]:py-3.5">
                <div>
                  <dt className="text-slate-500">Order number</dt>
                  <dd className="break-all text-right font-semibold text-slate-800">
                    {orderNumber}
                  </dd>
                </div>
                <div>
                  <dt className="text-slate-500">Payment method</dt>
                  <dd className="text-right font-semibold text-slate-800">Card · Stripe</dd>
                </div>
                {formattedDate && (
                  <div>
                    <dt className="text-slate-500">Date and time</dt>
                    <dd className="text-right font-semibold text-slate-800">{formattedDate} CT</dd>
                  </div>
                )}
                {formattedTotal && (
                  <div>
                    <dt className="text-slate-500">Total paid</dt>
                    <dd className="text-right text-base font-bold text-slate-900">
                      {formattedTotal}
                    </dd>
                  </div>
                )}
              </dl>
            )}
            {recorded && (
              <div className="w-full rounded-xl bg-[#edf6f6] p-5 text-left">
                <h2 className="text-sm font-semibold text-[#172d36]">What happens next?</h2>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  Fully paid orders are processed in 1–2 working days. Delivery time is additional.
                  Keep your order number for any questions.
                </p>
              </div>
            )}
            {recorded && sessionId && <ClearPaidCart sessionId={sessionId} />}
            <div className="grid w-full gap-3">
              {recorded && buyerOrder && (
                <Link
                  className="rounded-xl bg-[#102f38] px-5 py-3.5 text-center text-sm font-semibold text-white no-underline transition hover:bg-[#0a8d99]"
                  href="/account/dashboard"
                >
                  Go to my account
                </Link>
              )}
              {!recorded && hasSession && (
                <form action="/checkout/success" method="get">
                  <input type="hidden" name="session_id" value={sessionId} />
                  <button
                    className="w-full rounded-xl bg-[#102f38] px-5 py-3.5 text-center text-sm font-bold text-white hover:bg-[#0a8d99]"
                    type="submit"
                  >
                    Check status again
                  </button>
                </form>
              )}
              <Link
                className={`${recorded && buyerOrder ? "text-sm font-semibold text-[#08788c] underline underline-offset-4" : "rounded-xl border border-slate-300 px-5 py-3.5 text-sm font-semibold text-slate-700 hover:border-[#0a8d99] hover:text-[#08788c]"} text-center`}
                href={recorded ? "/shop" : "/contact"}
              >
                {recorded ? "Continue shopping" : "Contact us"}
              </Link>
            </div>
          </div>
          <div className="border-t border-slate-200 bg-slate-50 px-6 py-4 text-center text-xs leading-5 text-slate-500">
            Need help? Use the{" "}
            <Link
              href="/contact"
              className="font-semibold text-[#08788c] underline underline-offset-2"
            >
              contact page
            </Link>
            {recorded ? " and include your order number." : "."}
          </div>
        </section>
      </main>
    </CheckoutFrame>
  );
}
