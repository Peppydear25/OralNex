import type { CartItem } from "../data/cart-store";

const STORAGE_KEY = "otm-pending-checkout-v1";

export function rememberPendingCheckout(sessionId: string, items: CartItem[]) {
  try {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ sessionId, items }));
  } catch {
    // Checkout can still proceed if browser session storage is unavailable.
  }
}

export function takePendingCheckout(sessionId: string): CartItem[] | null {
  try {
    const stored = window.sessionStorage.getItem(STORAGE_KEY);
    if (!stored) return null;
    const pending: unknown = JSON.parse(stored);
    if (!pending || typeof pending !== "object") return null;
    const value = pending as { sessionId?: unknown; items?: unknown };
    if (value.sessionId !== sessionId || !Array.isArray(value.items)) return null;
    if (
      !value.items.every(
        (item) =>
          item &&
          typeof item === "object" &&
          Number.isInteger(item.productId) &&
          Number.isInteger(item.quantity) &&
          item.productId > 0 &&
          item.quantity > 0,
      )
    )
      return null;
    window.sessionStorage.removeItem(STORAGE_KEY);
    return value.items as CartItem[];
  } catch {
    return null;
  }
}
