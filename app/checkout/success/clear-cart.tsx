"use client";

import { useEffect } from "react";
import { useCart } from "../../data/cart-store";
import { takePendingCheckout } from "../pending-checkout";

export function ClearPaidCart({ sessionId }: { sessionId: string }) {
  const { hydrated, removePurchased } = useCart();
  useEffect(() => {
    if (!hydrated) return;
    const purchased = takePendingCheckout(sessionId);
    if (purchased) removePurchased(purchased);
  }, [hydrated, removePurchased, sessionId]);
  return null;
}
