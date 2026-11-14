/** Checkout messages are selected locally; never render a provider or server error verbatim. */
export class CheckoutDisplayError extends Error {}

export function checkoutErrorMessage(status: number, code?: string): string {
  switch (code) {
    case "CHECKOUT_SETUP_REQUIRED":
      return "Checkout is being updated and cannot take payment yet. No payment was started. Please contact us if you need to place an order now.";
    case "ADDRESS_UNVERIFIED":
      return "We could not verify this delivery address. Check the street, city, state, ZIP code, and apartment number before checking rates again.";
    case "STOCK_UNAVAILABLE":
      return "An item in your cart is no longer available in that quantity. Review your cart and try again.";
    case "OPTION_UNAVAILABLE":
      return "A product option in your cart is no longer available. Review your cart and try again.";
    case "SHIPPING_QUOTE_REQUIRED":
      return "We need to confirm shipping for this quantity. Your cart is unchanged. Please contact us before payment.";
    case "RATE_CHANGED":
      return "The carrier rate changed. Check shipping rates again before payment.";
    case "SHIPPING_RATE_UNAVAILABLE":
      return "We could not reach the shipping carrier. Please try checking rates again. No payment was started.";
    case "SHIPPING_DETAILS_INVALID":
      return "We could not get a rate for this delivery address and package. Check the address and try again.";
    case "SHIPPING_SETUP_ERROR":
      return "Shipping rates are unavailable right now. Please try again later. No payment was started.";
  }
  if (status === 429) return "Too many attempts. Please wait a few minutes and try again.";
  if (status === 400 || status === 422)
    return "Review your checkout details and try again. Your cart has not changed.";
  return "Checkout is temporarily unavailable. No payment was started. Please try again later.";
}
