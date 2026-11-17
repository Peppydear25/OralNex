"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { ActionResultModal, type ActionResult } from "../components/action-result-modal";
import { LoadingIndicator } from "../components/loading-indicator";
import { fetchWithTimeout } from "../../lib/network/fetch-with-timeout";
import { type ShippingAddress, useBuyerAccount } from "../data/buyer-account-store";
import { useCart } from "../data/cart-store";
import { useCatalog } from "../data/catalog-store";
import { ADDRESS_LIMIT_MESSAGE, MAX_SAVED_ADDRESSES } from "../data/address-limit";
import { isSupabaseConfigured } from "../../lib/supabase/config";
import { getLinePricing } from "../lib/pricing";
import { findProductVariant } from "../lib/product-options";
import { OrderSummary, type CheckoutRow } from "./order-summary";
import { rememberPendingCheckout } from "./pending-checkout";
import { CheckoutDetailsFields } from "./checkout-details-fields";
import type { CheckoutTotals } from "../../lib/stripe/checkout-totals";
import { CheckoutDisplayError, checkoutErrorMessage } from "./checkout-errors";
import type { ShippingRate } from "../../lib/shipping/easypost-rates";
import { AddressConfirmationDialog } from "./address-confirmation-dialog";
import { formatAddressText } from "./format-address-text";

const EmbeddedPayment = dynamic(() =>
  import("./embedded-payment").then((module) => module.EmbeddedPayment),
);

export function CheckoutView({
  paymentReady,
  shippingReady,
  stripePublishableKey,
}: {
  paymentReady: boolean;
  shippingReady: boolean;
  stripePublishableKey: string;
}) {
  const cart = useCart();
  const account = useBuyerAccount();
  const { products } = useCatalog();
  const savedAddress = account.buyer?.addresses?.find((address) => address.isDefault);
  const canSaveAddress = Boolean(
    account.buyer && (savedAddress || (account.buyer.addresses?.length ?? 0) < MAX_SAVED_ADDRESSES),
  );
  const [result, setResult] = useState<ActionResult | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const submittingRef = useRef(false);
  const paymentAttemptRef = useRef<string | null>(null);
  const [shippingQuotes, setShippingQuotes] = useState<ShippingRate[] | null>(null);
  const [selectedRate, setSelectedRate] = useState("");
  const [suggestedAddress, setSuggestedAddress] = useState<ShippingAddress | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const addressDialogRef = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = addressDialogRef.current;
    if (suggestedAddress && dialog && !dialog.open) dialog.showModal();
    if (!suggestedAddress && dialog?.open) dialog.close();
  }, [suggestedAddress]);
  const applyVerifiedAddress = (address: ShippingAddress) => {
    for (const name of ["address1", "address2", "city", "state", "postalCode"] as const) {
      const field = formRef.current?.elements.namedItem(name);
      if (field instanceof HTMLInputElement || field instanceof HTMLSelectElement)
        field.value =
          name === "address1" || name === "city"
            ? formatAddressText(address[name])
            : (address[name] ?? "");
    }
    setSuggestedAddress(null);
    setShippingQuotes(null);
    setSelectedRate("");
    window.setTimeout(() => formRef.current?.requestSubmit(), 0);
  };
  const [paymentSession, setPaymentSession] = useState<{
    clientSecret: string;
    sessionId: string;
    cartFingerprint: string;
    totals: CheckoutTotals | null;
    shippingRate: {
      serviceName: string;
      amountCents: number;
      minimumBusinessDays: number;
      maximumBusinessDays: number;
    };
  } | null>(null);
  const closeResult = useCallback(() => setResult(null), []);
  const rows: CheckoutRow[] = cart.items.flatMap((item) => {
    const product = products.find(({ id }) => id === item.productId);
    return product ? [{ item, product }] : [];
  });
  const subtotal = rows.reduce(
    (sum, { item, product }) => sum + getLinePricing(product, item.quantity).total,
    0,
  );
  const cartFingerprint = JSON.stringify(cart.items);
  const activePaymentSession =
    paymentSession?.cartFingerprint === cartFingerprint ? paymentSession : null;
  const stopSubmitting = () => {
    submittingRef.current = false;
    setSubmitting(false);
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submittingRef.current || !event.currentTarget.reportValidity()) return;
    const data = new FormData(event.currentTarget);
    // Show feedback before saving an address or waiting for the checkout API.
    submittingRef.current = true;
    setSubmitting(true);
    const address: ShippingAddress = {
      id: savedAddress?.id ?? `address-${Date.now()}`,
      label: savedAddress?.label ?? "Shipping address",
      firstName: String(data.get("firstName") ?? "").trim(),
      lastName: String(data.get("lastName") ?? "").trim(),
      company: String(data.get("company") ?? "").trim() || undefined,
      address1: formatAddressText(String(data.get("address1") ?? "").trim()),
      address2: String(data.get("address2") ?? "").trim() || undefined,
      city: formatAddressText(String(data.get("city") ?? "").trim()),
      state: String(data.get("state") ?? ""),
      postalCode: String(data.get("postalCode") ?? "").trim(),
      isDefault: true,
    };
    if (shippingQuotes && account.buyer && data.get("saveAddress") === "on") {
      let addressForAccount = address;
      if (!canSaveAddress) {
        stopSubmitting();
        setResult({
          tone: "error",
          title: "Saved address limit reached",
          message: ADDRESS_LIMIT_MESSAGE,
        });
        return;
      }
      if (isSupabaseConfigured()) {
        let saved;
        try {
          const { saveShippingAddress } = await import("../data/supabase-addresses");
          saved = await saveShippingAddress(address);
        } catch {
          stopSubmitting();
          setResult({
            tone: "error",
            title: "Your address could not be saved",
            message: "Please try saving your address again. No payment was started.",
          });
          return;
        }
        if (saved.error || !saved.address) {
          stopSubmitting();
          setResult({
            tone: "error",
            title: "Your address could not be saved",
            message:
              saved.error?.message === ADDRESS_LIMIT_MESSAGE
                ? ADDRESS_LIMIT_MESSAGE
                : "Review the shipping address and try again before continuing.",
          });
          return;
        }
        addressForAccount = saved.address;
      }
      const existing = account.buyer.addresses ?? [];
      account.signIn({
        ...account.buyer,
        addresses: savedAddress
          ? existing.map((item) => (item.id === savedAddress.id ? addressForAccount : item))
          : [...existing.map((item) => ({ ...item, isDefault: false })), addressForAccount],
      });
    }
    if (!paymentReady || !shippingReady) {
      stopSubmitting();
      setResult({
        tone: "error",
        title: "Online checkout is temporarily unavailable",
        message: "No order or payment was created. Please try again later.",
      });
      return;
    }

    try {
      const checkoutItems = rows.map(({ item, product }) => {
        if (!product.databaseId) throw new Error(`${product.name} is not ready for checkout.`);
        const selectedOptions = {
          ...(item.size ? { Size: item.size } : {}),
          ...(item.color ? { Color: item.color } : {}),
          ...(item.options ?? {}),
        };
        return {
          productId: product.databaseId,
          variantId: findProductVariant(product, selectedOptions)?.id ?? null,
          quantity: item.quantity,
          selectedOptions,
        };
      });
      const response = await fetchWithTimeout(
        "/api/stripe/checkout",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: shippingQuotes ? "pay" : "quote",
            selectedRate: shippingQuotes ? selectedRate : undefined,
            attemptId: shippingQuotes
              ? (paymentAttemptRef.current ??= crypto.randomUUID())
              : undefined,
            expectedShippingCents: shippingQuotes?.find((rate) => rate.key === selectedRate)
              ?.amountCents,
            email: String(data.get("email") ?? "").trim(),
            phone: String(data.get("phone") ?? "").trim(),
            shippingAddress: address,
            items: checkoutItems,
          }),
        },
        90_000,
      );
      const payload = (await response.json()) as {
        rates?: ShippingRate[];
        address?: ShippingAddress;
        clientSecret?: string;
        totals?: CheckoutTotals | null;
        sessionId?: string;
        error?: string;
        code?: string;
        shippingRate?: {
          serviceName: string;
          amountCents: number;
          minimumBusinessDays: number;
          maximumBusinessDays: number;
        };
      };
      if (payload.code === "ADDRESS_CONFIRMATION_REQUIRED" && payload.address) {
        setSuggestedAddress(payload.address);
        setShippingQuotes(null);
        setSelectedRate("");
        stopSubmitting();
        return;
      }
      if (payload.code === "RATE_CHANGED") {
        setShippingQuotes(null);
        setSelectedRate("");
      }
      if (!response.ok)
        throw new CheckoutDisplayError(checkoutErrorMessage(response.status, payload.code));
      if (!shippingQuotes) {
        if (!payload.rates?.length) throw new Error("No shipping rates were returned.");
        setShippingQuotes(payload.rates);
        setSelectedRate(payload.rates[0].key);
        stopSubmitting();
        return;
      }
      if (!payload.clientSecret || !payload.sessionId || !payload.shippingRate)
        throw new Error("Incomplete checkout response.");
      rememberPendingCheckout(payload.sessionId, cart.items);
      setPaymentSession({
        clientSecret: payload.clientSecret,
        sessionId: payload.sessionId,
        cartFingerprint,
        shippingRate: payload.shippingRate,
        totals: payload.totals ?? null,
      });
      stopSubmitting();
    } catch (error) {
      const requestingRates = !shippingQuotes;
      setResult({
        tone: "error",
        title: requestingRates
          ? "We could not check shipping rates"
          : "We could not open the payment form",
        message: error instanceof CheckoutDisplayError ? error.message : checkoutErrorMessage(503),
      });
      stopSubmitting();
    }
  };

  if (!rows.length)
    return (
      <main className="mx-auto grid min-h-[62vh] max-w-xl place-content-center px-5 text-center">
        <span className="mx-auto grid size-20 place-items-center rounded-3xl bg-[#e8f6f7] text-3xl text-[#08788c]">
          □
        </span>
        <h1 className="mt-6 text-4xl font-semibold">Your cart is empty</h1>
        <p className="mt-3 text-slate-500">Add gloves or masks before starting checkout.</p>
        <Link
          className="mx-auto mt-7 rounded-xl bg-[#0a8d99] px-6 py-3.5 font-bold text-white"
          href="/shop"
        >
          Shop equipment
        </Link>
      </main>
    );

  return (
    <main className="relative min-w-0 overflow-x-clip bg-white px-6 py-10 text-slate-800 before:absolute before:inset-y-0 before:right-0 before:left-[calc(50%+112px)] before:bg-[#f5f5f5] max-lg:before:hidden max-sm:px-4 max-sm:py-6">
      <div className="relative mx-auto max-w-[1180px]">
        <div className="grid grid-cols-[minmax(0,1.4fr)_minmax(320px,1fr)] items-start gap-8 max-lg:grid-cols-1 max-lg:gap-5 max-sm:gap-0">
          <div className="min-w-0">
            <div className="mb-5 w-full">
              <h1 className="sr-only">Checkout</h1>
              <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#08788c]">
                OralNex checkout
              </p>
              <ol className="grid w-full grid-cols-3 gap-1.5" aria-label="Checkout progress">
                <li
                  aria-current={!activePaymentSession ? "step" : undefined}
                  aria-label="Details"
                  className="h-1.5 rounded-full bg-[#0a8d99]"
                />
                <li
                  aria-current={activePaymentSession ? "step" : undefined}
                  aria-label="Payment"
                  className={`h-1.5 rounded-full ${activePaymentSession ? "bg-[#0a8d99]" : "bg-slate-200"}`}
                />
                <li aria-label="Confirmation" className="h-1.5 rounded-full bg-slate-200" />
              </ol>
            </div>
            <form
              ref={formRef}
              className={`min-w-0 gap-4 max-sm:gap-7 max-sm:pt-7 ${activePaymentSession ? "hidden" : "grid"}`}
              onSubmit={submit}
              onChange={(event) => {
                if (
                  (event.nativeEvent.target as HTMLElement).getAttribute("name") !==
                  "shippingService"
                ) {
                  setShippingQuotes(null);
                  setSelectedRate("");
                  setSuggestedAddress(null);
                }
              }}
            >
              <CheckoutDetailsFields
                buyer={account.buyer}
                savedAddress={savedAddress}
                canSaveAddress={canSaveAddress}
              />
              {shippingQuotes && (
                <section className="min-w-0 bg-white py-4">
                  <h2 className="mb-3 text-base font-semibold">Choose shipping</h2>
                  <div className="grid gap-2">
                    {shippingQuotes.map((rate) => (
                      <label
                        key={rate.key}
                        className="flex cursor-pointer items-center gap-3 rounded-lg border border-slate-200 p-3 text-sm has-checked:border-[#0a8d99] has-checked:bg-[#f0fafb]"
                      >
                        <input
                          type="radio"
                          name="shippingService"
                          value={rate.key}
                          checked={selectedRate === rate.key}
                          onChange={() => setSelectedRate(rate.key)}
                        />
                        <span className="flex-1">{rate.serviceName}</span>
                        <strong>${(rate.amountCents / 100).toFixed(2)}</strong>
                      </label>
                    ))}
                  </div>
                </section>
              )}
              <button
                className="min-h-12 rounded-lg bg-[#0a8d99] px-6 text-sm font-bold text-white transition hover:bg-[#087b86] disabled:cursor-not-allowed disabled:opacity-60"
                type="submit"
                disabled={submitting || !paymentReady || !shippingReady}
              >
                {submitting ? (
                  <LoadingIndicator
                    label={
                      shippingQuotes ? "Preparing secure payment…" : "Checking shipping rates…"
                    }
                  />
                ) : paymentReady && shippingReady ? (
                  shippingQuotes ? (
                    "Continue to payment"
                  ) : (
                    "Check shipping rates"
                  )
                ) : (
                  "Checkout unavailable"
                )}
              </button>
              {!paymentReady || !shippingReady ? (
                <p className="-mt-2 text-center text-xs text-slate-500">
                  Online checkout is unavailable until payment, shipping, and order email are
                  configured. No payment will be created.
                </p>
              ) : null}
              <p className="text-center text-xs text-slate-500">
                By continuing, you agree to the{" "}
                <Link className="underline" href="/terms-of-service">
                  Terms of Service
                </Link>{" "}
                and acknowledge the{" "}
                <Link className="underline" href="/privacy-policy">
                  Privacy Policy
                </Link>
                .
              </p>
            </form>
            {activePaymentSession && (
              <section className="min-w-0 bg-white">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-semibold leading-tight text-[#172d36]">Payment</h2>
                    <p className="mt-1 text-[13px] text-slate-500">
                      All transactions are secure and encrypted.
                    </p>
                  </div>
                  <button
                    className="grid size-10 shrink-0 place-items-center rounded-full text-[#08788c] transition-colors hover:bg-[#e9f7f8] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#08788c]"
                    type="button"
                    aria-label="Edit checkout details"
                    title="Edit checkout details"
                    onClick={() => {
                      paymentAttemptRef.current = null;
                      setPaymentSession(null);
                    }}
                  >
                    <svg
                      aria-hidden="true"
                      className="size-5"
                      fill="none"
                      stroke="currentColor"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="1.8"
                      viewBox="0 0 24 24"
                    >
                      <path d="M12 20h9" />
                      <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L9 17l-4 1 1-4L16.5 3.5Z" />
                    </svg>
                  </button>
                </div>
                <EmbeddedPayment
                  clientSecret={activePaymentSession.clientSecret}
                  publishableKey={stripePublishableKey}
                />
              </section>
            )}
          </div>
          <OrderSummary
            rows={rows}
            itemCount={cart.itemCount}
            subtotal={subtotal}
            shippingRate={
              activePaymentSession?.shippingRate ??
              shippingQuotes?.find((rate) => rate.key === selectedRate)
            }
            totals={activePaymentSession?.totals}
          />
        </div>
      </div>
      <AddressConfirmationDialog
        dialogRef={addressDialogRef}
        address={suggestedAddress}
        onUseAddress={applyVerifiedAddress}
        onClose={() => setSuggestedAddress(null)}
      />
      <ActionResultModal result={result} onClose={closeResult} />
    </main>
  );
}
