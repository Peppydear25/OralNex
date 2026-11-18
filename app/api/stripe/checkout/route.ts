import { NextResponse } from "next/server";
import { reportServiceFailure } from "../../../../lib/errors/report-service-failure";
import { checkoutEmailReady } from "../../../../lib/email/order-email-config";
import { allowApiRequest, rateLimitResponse } from "../../../../lib/network/api-rate-limit";
import { readJsonBody, RequestBodyError } from "../../../../lib/network/read-json-body";
import {
  invalidRequestOrigin,
  trustedSiteOrigin,
} from "../../../../lib/network/trusted-site-origin";
import { createClient } from "../../../../lib/supabase/server";
import { getStripe, stripeIsReady } from "../../../../lib/stripe/server";
import { checkoutTotals } from "../../../../lib/stripe/checkout-totals";
import { receiptCookieName, receiptTokenHash } from "../../../../lib/stripe/receipt-access";
import { checkoutAttemptKeys } from "../../../../lib/stripe/checkout-attempt";
import {
  CheckoutSetupError,
  InventoryReservationError,
  reserveCheckoutInventory,
  checkoutReservationExpiry,
  linkCheckoutInventory,
  releaseCheckoutInventory,
} from "../../../../lib/stripe/inventory-reservations";
import {
  prepareCheckout,
  CheckoutValidationError,
  type CheckoutItem,
} from "../../../../lib/shipping/checkout-quote";
import {
  EasyPostUnavailable,
  easypostReady,
  quoteEasyPost,
  type DeliveryAddress,
} from "../../../../lib/shipping/easypost-rates";
import {
  AddressVerificationError,
  addressNeedsConfirmation,
  verifyDeliveryAddress,
} from "../../../../lib/shipping/easypost-address";
import { createQuoteToken, readQuoteToken } from "../../../../lib/shipping/quote-token";

const noStore = { "Cache-Control": "no-store" };

function parseInput(value: unknown): {
  action: "quote" | "pay";
  email: string;
  phone: string;
  address: DeliveryAddress;
  items: CheckoutItem[];
  selectedRate?: string;
  expectedShippingCents?: number;
  attemptId?: string;
  quoteToken?: string;
} | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const body = value as Record<string, unknown>;
  if (body.action !== "quote" && body.action !== "pay") return null;
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const phone = typeof body.phone === "string" ? body.phone.trim() : "";
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || phone.length > 35)
    return null;
  const raw = body.shippingAddress;
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const source = raw as Record<string, unknown>;
  const field = (name: string, max: number) =>
    typeof source[name] === "string" && (source[name] as string).trim().length <= max
      ? (source[name] as string).trim()
      : "";
  const address: DeliveryAddress = {
    firstName: field("firstName", 60),
    lastName: field("lastName", 60),
    company: field("company", 100) || undefined,
    address1: field("address1", 120),
    address2: field("address2", 80) || undefined,
    city: field("city", 80),
    state: field("state", 2),
    postalCode: field("postalCode", 10),
  };
  if (
    !address.firstName ||
    !address.lastName ||
    !address.address1 ||
    !address.city ||
    !/^[A-Z]{2}$/.test(address.state) ||
    !/^\d{5}(?:-\d{4})?$/.test(address.postalCode)
  )
    return null;
  if (!Array.isArray(body.items) || !body.items.length || body.items.length > 30) return null;
  const items: CheckoutItem[] = [];
  for (const item of body.items) {
    if (!item || typeof item !== "object" || Array.isArray(item)) return null;
    const row = item as Record<string, unknown>;
    if (
      typeof row.productId !== "string" ||
      !/^[0-9a-f-]{36}$/i.test(row.productId) ||
      !(
        row.variantId === null ||
        (typeof row.variantId === "string" && /^[0-9a-f-]{36}$/i.test(row.variantId))
      ) ||
      !Number.isInteger(row.quantity) ||
      (row.quantity as number) < 1 ||
      (row.quantity as number) > 999 ||
      !row.selectedOptions ||
      typeof row.selectedOptions !== "object" ||
      Array.isArray(row.selectedOptions)
    )
      return null;
    const options = row.selectedOptions as Record<string, unknown>;
    if (
      Object.keys(options).length > 10 ||
      Object.entries(options).some(
        ([k, v]) => k.length > 40 || typeof v !== "string" || !v || v.length > 80,
      )
    )
      return null;
    items.push({
      productId: row.productId,
      variantId: row.variantId as string | null,
      quantity: row.quantity as number,
      selectedOptions: options as Record<string, string>,
    });
  }
  const selectedRate = body.selectedRate;
  if (
    body.quoteToken !== undefined &&
    (typeof body.quoteToken !== "string" || body.quoteToken.length > 24_000)
  )
    return null;
  if (body.action === "pay" && (typeof selectedRate !== "string" || selectedRate.length > 100))
    return null;
  if (
    body.action === "pay" &&
    (!Number.isSafeInteger(body.expectedShippingCents) ||
      (body.expectedShippingCents as number) < 0)
  )
    return null;
  if (
    body.action === "pay" &&
    (typeof body.attemptId !== "string" ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        body.attemptId,
      ))
  )
    return null;
  return {
    action: body.action,
    email,
    phone,
    address,
    items,
    selectedRate: selectedRate as string | undefined,
    expectedShippingCents: body.expectedShippingCents as number | undefined,
    attemptId: body.attemptId as string | undefined,
    quoteToken: body.quoteToken as string | undefined,
  };
}

export async function POST(request: Request) {
  const origin = trustedSiteOrigin(request);
  if (!origin || request.headers.get("origin") !== origin || invalidRequestOrigin(request, origin))
    return Response.json({ error: "Invalid checkout request." }, { status: 403, headers: noStore });
  if (!stripeIsReady() || !easypostReady() || !checkoutEmailReady())
    return Response.json(
      { error: "Online checkout is temporarily unavailable." },
      { status: 503, headers: noStore },
    );
  let reservationId: string | null = null;
  let creatingSession = false;
  try {
    const input = parseInput(await readJsonBody(request, 16_384));
    if (!input)
      return Response.json(
        { error: "Review your checkout details.", code: "INVALID_CHECKOUT" },
        { status: 400, headers: noStore },
      );
    const allowed = await allowApiRequest("checkout", input.email).catch((error: unknown) => {
      reportServiceFailure("checkout.rate_limit", error);
      throw error;
    });
    if (!allowed) return rateLimitResponse("checkout");
    const useQuoteToken = input.action === "pay" && Boolean(input.quoteToken);
    const [verifiedAddress, checkout] = await Promise.all([
      useQuoteToken ? Promise.resolve(input.address) : verifyDeliveryAddress(input.address),
      prepareCheckout(input.items, input.action === "pay" ? input.attemptId : undefined).catch(
        (error: unknown) => {
          if (!(error instanceof CheckoutValidationError))
            reportServiceFailure("checkout.catalog", error);
          throw error;
        },
      ),
    ]);
    if (addressNeedsConfirmation(input.address, verifiedAddress))
      return Response.json(
        { code: "ADDRESS_CONFIRMATION_REQUIRED", address: verifiedAddress },
        { status: 409, headers: noStore },
      );
    const { parcels, lines } = checkout;
    const rates = useQuoteToken
      ? readQuoteToken(process.env.STRIPE_SECRET_KEY!, input.quoteToken!, input.address, parcels)
      : await quoteEasyPost(parcels, verifiedAddress);
    if (!rates)
      return Response.json(
        { error: "Shipping quote expired. Please check rates again.", code: "RATE_CHANGED" },
        { status: 409, headers: noStore },
      );
    if (!rates.length)
      return Response.json(
        { error: "Shipping is unavailable for this address.", code: "SHIPPING_QUOTE_REQUIRED" },
        { status: 422, headers: noStore },
      );
    if (input.action === "quote")
      return Response.json(
        {
          rates,
          quoteToken: createQuoteToken(
            process.env.STRIPE_SECRET_KEY!,
            input.address,
            parcels,
            rates,
          ),
        },
        { headers: noStore },
      );
    const selected = rates.find((rate) => rate.key === input.selectedRate);
    if (!selected)
      return Response.json(
        {
          error: "Shipping services changed. Please review the new quote.",
          code: "RATE_CHANGED",
          rates,
        },
        { status: 409, headers: noStore },
      );
    if (selected.amountCents !== input.expectedShippingCents)
      return Response.json(
        {
          error: "Shipping rates changed. Please review the new quote.",
          code: "RATE_CHANGED",
          rates,
        },
        { status: 409, headers: noStore },
      );

    const { data: userData } = await (await createClient()).auth.getUser();
    // A shopper may enter a different receipt email. Do not attach that order
    // to their account unless the authenticated email matches the checkout.
    const buyerId =
      userData.user?.email?.trim().toLowerCase() === input.email ? userData.user.id : undefined;
    const stripe = getStripe();
    const automaticTaxEnabled = process.env.STRIPE_AUTOMATIC_TAX_ENABLED === "true";
    const keys = checkoutAttemptKeys(process.env.STRIPE_SECRET_KEY!, input.attemptId!, {
      origin,
      email: input.email,
      phone: input.phone,
      address: verifiedAddress,
      buyerId,
      lines,
      rate: selected,
      automaticTaxEnabled,
    });
    reservationId = await reserveCheckoutInventory(
      input.attemptId!,
      keys.session,
      lines.map((line) => ({
        product_id: line.metadata.on_product_id,
        variant_id: line.metadata.on_variant_id || null,
        quantity: line.quantity,
      })),
    );
    const sessionExpiresAt = await checkoutReservationExpiry(reservationId);
    const shipping = {
      name: `${verifiedAddress.firstName} ${verifiedAddress.lastName}`,
      phone: input.phone || undefined,
      address: {
        line1: verifiedAddress.address1,
        line2: verifiedAddress.address2,
        city: verifiedAddress.city,
        state: verifiedAddress.state,
        postal_code: verifiedAddress.postalCode,
        country: "US",
      },
    };
    // Stripe Tax uses the Customer's shipping location and rejects an explicit
    // PaymentIntent shipping field. Non-tax sessions can retain that field.
    const customer = await stripe.customers.create(
      { email: input.email, shipping },
      { idempotencyKey: keys.customer },
    );
    creatingSession = true;
    const session = await stripe.checkout.sessions.create(
      {
        mode: "payment",
        ui_mode: "embedded_page",
        expires_at: sessionExpiresAt,
        return_url: `${origin}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
        customer: customer.id,
        client_reference_id: buyerId,
        line_items: lines.map((line) => ({
          quantity: line.quantity,
          price_data: {
            currency: "usd",
            unit_amount: line.unitAmountCents,
            product_data: { name: line.name, metadata: line.metadata },
          },
        })),
        shipping_options: [
          {
            shipping_rate_data: {
              type: "fixed_amount",
              fixed_amount: { amount: selected.amountCents, currency: "usd" },
              display_name: selected.serviceName,
            },
          },
        ],
        payment_intent_data: {
          ...(!automaticTaxEnabled ? { shipping } : {}),
          metadata: {
            shipping_company: verifiedAddress.company ?? "",
            easypost_service: selected.key,
          },
        },
        automatic_tax: { enabled: automaticTaxEnabled },
        metadata: {
          easypost_service: selected.key,
          shipping_method: selected.serviceName,
          receipt_token_hash: receiptTokenHash(keys.receiptToken),
          inventory_reservation_id: reservationId,
        },
      },
      { idempotencyKey: keys.session },
    );
    if (session.status === "expired")
      return Response.json({ code: "CHECKOUT_EXPIRED" }, { status: 409, headers: noStore });
    if (session.status === "complete") {
      const response = NextResponse.json(
        { sessionId: session.id, status: "complete" },
        { headers: noStore },
      );
      response.cookies.set(receiptCookieName(session.id), keys.receiptToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/checkout/success",
        maxAge: 24 * 60 * 60,
      });
      return response;
    }
    await linkCheckoutInventory(reservationId, session.id, session.expires_at);
    if (!session.client_secret) throw new Error("Stripe returned no client secret.");
    const response = NextResponse.json(
      {
        clientSecret: session.client_secret,
        sessionId: session.id,
        shippingRate: selected,
        totals: checkoutTotals(session),
      },
      { headers: noStore },
    );
    response.cookies.set(receiptCookieName(session.id), keys.receiptToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/checkout/success",
      maxAge: 24 * 60 * 60,
    });
    return response;
  } catch (error) {
    // Once creation starts, another retry may already have received the same
    // idempotent session. Never expire it or release its stock here.
    if (reservationId && !creatingSession) {
      try {
        await releaseCheckoutInventory(reservationId);
      } catch (releaseError) {
        reportServiceFailure("checkout.reservation_release", releaseError);
      }
    }
    if (error instanceof InventoryReservationError)
      return Response.json(
        {
          error: "This item is no longer available. Please review your cart.",
          code: "STOCK_UNAVAILABLE",
        },
        { status: 422, headers: noStore },
      );
    if (error instanceof CheckoutSetupError) {
      reportServiceFailure("checkout.inventory_setup", error);
      return Response.json(
        {
          error: "Checkout setup is incomplete. No payment was started.",
          code: "CHECKOUT_SETUP_REQUIRED",
        },
        { status: 503, headers: noStore },
      );
    }
    if (error instanceof AddressVerificationError)
      return Response.json(
        { error: error.message, code: "ADDRESS_UNVERIFIED" },
        { status: 422, headers: noStore },
      );
    if (error instanceof RequestBodyError)
      return Response.json({ error: error.message }, { status: error.status, headers: noStore });
    if (error instanceof CheckoutValidationError)
      return Response.json(
        { error: "Review your cart and shipping setup.", code: error.code },
        { status: 422, headers: noStore },
      );
    if (error instanceof EasyPostUnavailable) {
      reportServiceFailure("checkout.shipping_quote", error);
      if (process.env.NODE_ENV !== "production")
        console.error(
          `Checkout shipping quote failed: ${error.code}; ${error.message}; cause: ${error.cause instanceof Error ? error.cause.name : "unknown"}`,
        );
      return Response.json(
        { error: "Shipping rates are temporarily unavailable.", code: error.code },
        { status: error.code === "SHIPPING_DETAILS_INVALID" ? 422 : 503, headers: noStore },
      );
    }
    reportServiceFailure("checkout.create", error);
    return Response.json(
      { error: "Checkout is temporarily unavailable." },
      { status: 503, headers: noStore },
    );
  }
}
