import type { Product, ProductOption, ProductVariant } from "../data/catalog";

export function getProductOptions(product: Product): ProductOption[] {
  if (product.options?.length) return product.options;
  return [
    ...(product.sizes?.length ? [{ name: "Size", values: product.sizes }] : []),
    ...(product.colors?.length ? [{ name: "Color", values: product.colors }] : []),
  ];
}

export function getInitialOptionSelection(product: Product) {
  const options = getProductOptions(product);
  const firstAvailableVariant = product.variants?.find((variant) => variant.inventory > 0);
  return Object.fromEntries(
    options.map((option) => [
      option.name,
      firstAvailableVariant?.options[option.name] ?? option.values[0] ?? "",
    ]),
  );
}

/** Disable a choice only when none of its combinations can be purchased. */
export function isOptionValueAvailable(product: Product, optionName: string, value: string) {
  if (!product.stock) return false;
  if (!product.variants?.length) return true;
  return product.variants.some(
    (variant) => variant.inventory > 0 && variant.options[optionName] === value,
  );
}

export function selectionEntries(options?: Record<string, string>) {
  return Object.entries(options ?? {}).filter(([, value]) => Boolean(value));
}

export function optionSelectionKey(options: Record<string, string>) {
  return Object.entries(options)
    .sort(([first], [second]) => first.localeCompare(second))
    .map(([name, value]) => `${name.trim().toLowerCase()}:${value.trim().toLowerCase()}`)
    .join("|");
}

export function buildOptionCombinations(options: ProductOption[], limit = 100) {
  const completeOptions = options
    .map((option) => ({
      name: option.name.trim(),
      values: [...new Set(option.values.map((value) => value.trim()).filter(Boolean))],
    }))
    .filter((option) => option.name && option.values.length);

  if (!completeOptions.length) return [];
  return completeOptions.reduce<Record<string, string>[]>(
    (combinations, option) => {
      const next = combinations.flatMap((combination) =>
        option.values.map((value) => ({ ...combination, [option.name]: value })),
      );
      return next.slice(0, limit);
    },
    [{}],
  );
}

export function generatedVariantSku(baseSku: string, index: number) {
  const normalizedBase = baseSku.trim().toUpperCase() || "ON";
  return `${normalizedBase}-V${String(index + 1).padStart(2, "0")}`;
}

export function syncProductVariants(
  options: ProductOption[],
  variants: ProductVariant[],
  baseSku = "ON",
) {
  const existing = new Map(
    variants.map((variant) => [optionSelectionKey(variant.options), variant]),
  );
  return buildOptionCombinations(options).map((selection, index) => {
    const key = optionSelectionKey(selection);
    const prior = existing.get(key);
    return (
      prior ?? {
        id: key.replaceAll(/[^a-z0-9]+/g, "-").replaceAll(/^-|-$/g, ""),
        options: selection,
        sku: generatedVariantSku(baseSku, index),
        inventory: 0,
      }
    );
  });
}

export function findProductVariant(product: Product, selection: Record<string, string>) {
  const key = optionSelectionKey(selection);
  return product.variants?.find((variant) => optionSelectionKey(variant.options) === key);
}

export function getSelectionInventory(product: Product, selection?: Record<string, string>) {
  if (!product.variants?.length) return product.inventory ?? (product.stock ? 999 : 0);
  if (!selection) return product.variants.reduce((total, variant) => total + variant.inventory, 0);
  return findProductVariant(product, selection)?.inventory ?? 0;
}
