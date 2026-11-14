import type { BulkPricingTier, Product } from "../data/catalog";

export function getBulkTier(tiers: BulkPricingTier[] | undefined, quantity: number) {
  return getIncreasingBulkTiers(tiers)
    .filter((tier) => quantity >= tier.minQuantity)
    .at(-1);
}

/** Ignore breaks that would make the per-box price rise or stay unchanged. */
export function getIncreasingBulkTiers(tiers: BulkPricingTier[] | undefined) {
  const sorted = [...(tiers ?? [])]
    .filter(
      (tier) =>
        Number.isInteger(tier.minQuantity) &&
        tier.minQuantity >= 2 &&
        Number.isFinite(tier.discountPercent) &&
        tier.discountPercent > 0 &&
        tier.discountPercent < 100,
    )
    .sort(
      (first, second) =>
        first.minQuantity - second.minQuantity || second.discountPercent - first.discountPercent,
    );
  let bestDiscount = 0;
  return sorted.filter((tier) => {
    if (tier.discountPercent <= bestDiscount) return false;
    bestDiscount = tier.discountPercent;
    return true;
  });
}

export function hasIncreasingBulkDiscounts(tiers: BulkPricingTier[]) {
  const sorted = [...tiers].sort((first, second) => first.minQuantity - second.minQuantity);
  return sorted.every(
    (tier, index) =>
      Number.isInteger(tier.minQuantity) &&
      tier.minQuantity >= 2 &&
      Number.isInteger(tier.discountPercent) &&
      tier.discountPercent >= 1 &&
      tier.discountPercent <= 99 &&
      (index === 0 ||
        (tier.minQuantity > sorted[index - 1].minQuantity &&
          tier.discountPercent > sorted[index - 1].discountPercent)),
  );
}

export function getUnitPrice(product: Product, quantity: number) {
  const discount = getBulkTier(product.bulkPricing, quantity)?.discountPercent ?? 0;
  return Math.round(product.price * (1 - discount / 100) * 100) / 100;
}

export function getLinePricing(product: Product, quantity: number) {
  const unitPrice = getUnitPrice(product, quantity);
  const total = Math.round(unitPrice * quantity * 100) / 100;
  const regularTotal = Math.round(product.price * quantity * 100) / 100;
  return {
    unitPrice,
    total,
    savings: Math.round((regularTotal - total) * 100) / 100,
    tier: getBulkTier(product.bulkPricing, quantity),
  };
}
