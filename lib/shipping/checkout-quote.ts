import "server-only";

import { loadSupabaseCatalog } from "../../app/data/supabase-catalog";
import { getLinePricing } from "../../app/lib/pricing";
import { findProductVariant } from "../../app/lib/product-options";
import { createAdminClient } from "../supabase/admin";
import { reservedItemsForAttempt } from "../stripe/inventory-reservations";
import { packAutomatically } from "./automatic-packing";
import { planPackages, ShippingQuoteRequired } from "./package-profiles";
import type { Parcel } from "./easypost-rates";

export type CheckoutItem = {
  productId: string;
  variantId: string | null;
  quantity: number;
  selectedOptions: Record<string, string>;
};

export class CheckoutValidationError extends Error {
  constructor(
    readonly code: "STOCK_UNAVAILABLE" | "OPTION_UNAVAILABLE" | "SHIPPING_QUOTE_REQUIRED",
  ) {
    super(code);
  }
}

export async function prepareCheckout(items: CheckoutItem[], attemptId?: string) {
  const { catalog, error } = await loadSupabaseCatalog(createAdminClient());
  if (error || !catalog) throw new Error("Current product data is unavailable.");
  const alreadyReserved = attemptId ? await reservedItemsForAttempt(attemptId) : [];
  const reservedByProduct = new Map<string, number>();
  const reservedByVariant = new Map<string, number>();
  for (const item of alreadyReserved) {
    reservedByProduct.set(
      item.product_id,
      (reservedByProduct.get(item.product_id) ?? 0) + item.quantity,
    );
    if (item.variant_id)
      reservedByVariant.set(
        item.variant_id,
        (reservedByVariant.get(item.variant_id) ?? 0) + item.quantity,
      );
  }
  const parcels: Parcel[] = [];
  const lines: Array<{
    name: string;
    unitAmountCents: number;
    quantity: number;
    metadata: Record<string, string>;
  }> = [];
  const quantitiesByProduct = new Map<string, number>();
  const quantitiesByVariant = new Map<string, number>();
  for (const item of items) {
    quantitiesByProduct.set(
      item.productId,
      (quantitiesByProduct.get(item.productId) ?? 0) + item.quantity,
    );
    if (item.variantId)
      quantitiesByVariant.set(
        item.variantId,
        (quantitiesByVariant.get(item.variantId) ?? 0) + item.quantity,
      );
  }
  for (const item of items) {
    const product = catalog.products.find(
      (p) => p.databaseId === item.productId && p.status === "active",
    );
    if (
      !product ||
      (product.inventory ?? 0) + (reservedByProduct.get(item.productId) ?? 0) <
        quantitiesByProduct.get(item.productId)!
    )
      throw new CheckoutValidationError("STOCK_UNAVAILABLE");
    const variant = product.variants?.length
      ? findProductVariant(product, item.selectedOptions)
      : undefined;
    if (
      (product.variants?.length && (!variant || variant.id !== item.variantId)) ||
      (!product.variants?.length && (item.variantId || Object.keys(item.selectedOptions).length))
    )
      throw new CheckoutValidationError("OPTION_UNAVAILABLE");
    if (
      variant &&
      variant.inventory + (reservedByVariant.get(variant.id) ?? 0) <
        quantitiesByVariant.get(variant.id)!
    )
      throw new CheckoutValidationError("STOCK_UNAVAILABLE");
    const sku = variant?.sku || product.sku;
    if (!sku) throw new CheckoutValidationError("SHIPPING_QUOTE_REQUIRED");
    let packed: Array<{
      weightPounds: number;
      lengthInches: number;
      widthInches: number;
      heightInches: number;
      groupPackageCount: number;
    }>;
    try {
      packed = product.automaticPacking?.verified
        ? packAutomatically(product.automaticPacking, item.quantity, sku)
        : planPackages(product.shippingProfiles, item.quantity, sku);
    } catch (error) {
      if (error instanceof ShippingQuoteRequired)
        throw new CheckoutValidationError("SHIPPING_QUOTE_REQUIRED");
      throw error;
    }
    for (const p of packed)
      for (let i = 0; i < p.groupPackageCount; i++) {
        parcels.push({
          weightOunces: Math.ceil(p.weightPounds * 16 * 100) / 100,
          lengthInches: p.lengthInches,
          widthInches: p.widthInches,
          heightInches: p.heightInches,
        });
      }
    const pricing = getLinePricing(product, item.quantity);
    const unitAmountCents = Math.round(pricing.unitPrice * 100);
    lines.push({
      name: product.name,
      unitAmountCents,
      quantity: item.quantity,
      metadata: {
        on_product_id: product.databaseId!,
        on_variant_id: variant?.id ?? "",
        on_sku: sku,
        on_options: JSON.stringify(item.selectedOptions),
        on_volume_discount_percent: String(pricing.tier?.discountPercent ?? ""),
      },
    });
  }
  if (!parcels.length || parcels.length > 20)
    throw new CheckoutValidationError("SHIPPING_QUOTE_REQUIRED");
  return { parcels, lines };
}
