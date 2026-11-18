/** Checkout messages are selected locally; never render a provider or server error verbatim. */
export class CheckoutDisplayError extends Error {}

export function checkoutErrorMessage(status: number, code?: string): string {
  switch (code) {
    case "CHECKOUT_EXPIRED":
      return "Your payment session expired. Please try again to start a new session.";
    case "CHECKOUT_SETUP_REQUIRED":
      return "Checkout is unavailable. No payment was started. Contact us for help.";
    case "ADDRESS_UNVERIFIED":
      return "Check your delivery address and try again.";
    case "STOCK_UNAVAILABLE":
      return "An item is unavailable in this quantity. Check your cart.";
    case "OPTION_UNAVAILABLE":
      return "An option is unavailable. Check your cart.";
    case "SHIPPING_QUOTE_REQUIRED":
      return "Contact us to confirm shipping. Your cart is unchanged.";
    case "RATE_CHANGED":
      return "Shipping rates changed. Please review the updated rates.";
    case "SHIPPING_RATE_UNAVAILABLE":
      return "The shipping carrier is temporarily unavailable. Please try again. No payment was started.";
    case "SHIPPING_DETAILS_INVALID":
      return "Check your address and try again.";
    case "SHIPPING_SETUP_ERROR":
      return "Shipping rates are unavailable. No payment was started.";
  }
  if (status === 429) return "Too many attempts. Please wait a few minutes and try again.";
  if (status === 400 || status === 422)
    return "Check your checkout details. Your cart is unchanged.";
  return "Checkout is unavailable. No payment was started. Try again later.";
}
