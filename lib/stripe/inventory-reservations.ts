import "server-only";

import { createAdminClient } from "../supabase/admin";

export class InventoryReservationError extends Error {
  constructor(message = "Inventory is no longer available for this checkout.") {
    super(message);
    this.name = "InventoryReservationError";
  }
}

export class CheckoutSetupError extends Error {
  constructor() {
    super("Checkout inventory reservation setup is missing.");
    this.name = "CheckoutSetupError";
  }
}

export type ReservedItem = {
  product_id: string;
  variant_id: string | null;
  quantity: number;
};

export async function reservedItemsForAttempt(attemptId: string): Promise<ReservedItem[]> {
  const { data, error } = await createAdminClient()
    .from("checkout_inventory_reservations")
    .select("items")
    .eq("attempt_id", attemptId)
    .eq("state", "reserved")
    .maybeSingle();
  if (error) throw error;
  return (data?.items ?? []) as ReservedItem[];
}

export async function reserveCheckoutInventory(
  attemptId: string,
  attemptKey: string,
  items: ReservedItem[],
) {
  const { data, error } = await createAdminClient().rpc("reserve_checkout_inventory", {
    p_attempt_id: attemptId,
    p_attempt_key: attemptKey,
    p_items: items,
  });
  if (error) {
    if (["PGRST202", "PGRST205", "42P01", "42883"].includes(error.code ?? ""))
      throw new CheckoutSetupError();
    if (/out of stock|no longer available/i.test(error.message))
      throw new InventoryReservationError();
    throw error;
  }
  return String(data);
}

export async function linkCheckoutInventory(
  reservationId: string,
  sessionId: string,
  expiresAt: number,
) {
  const { error } = await createAdminClient().rpc("link_checkout_inventory", {
    p_reservation_id: reservationId,
    p_session_id: sessionId,
    p_expires_at: new Date(expiresAt * 1000).toISOString(),
  });
  if (error) throw error;
}

export async function releaseCheckoutInventory(reservationId: string, sessionId?: string) {
  const { error } = await createAdminClient().rpc("release_checkout_inventory", {
    p_reservation_id: reservationId,
    p_session_id: sessionId ?? null,
  });
  if (error) throw error;
}
