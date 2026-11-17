import { validPackageProfiles } from "../../lib/shipping/package-profiles";
import { validAutomaticPacking, emptyAutomaticPacking } from "../../lib/shipping/automatic-packing";
import {
  collections as seedCollections,
  products as seedProducts,
  type Collection,
  type Product,
} from "./catalog";

export type CatalogState = {
  products: Product[];
  collections: Collection[];
};

export const defaultCatalogState: CatalogState = {
  products: seedProducts.map((product, index) => ({
    ...product,
    inventory: product.inventory ?? (product.stock ? 18 + index * 7 : 0),
    status: product.status ?? "active",
    sku: product.sku ?? `ON-${String(product.id).padStart(4, "0")}`,
  })),
  collections: seedCollections,
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

const isNonEmptyString = (value: unknown): value is string =>
  typeof value === "string" && Boolean(value.trim());

const isNonNegativeNumber = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value) && value >= 0;

function sanitizeProduct(value: unknown): Product | null {
  if (!isRecord(value)) return null;
  if (
    !Number.isInteger(value.id) ||
    Number(value.id) <= 0 ||
    !isNonEmptyString(value.slug) ||
    !isNonEmptyString(value.name) ||
    !isNonEmptyString(value.category) ||
    !isNonEmptyString(value.type) ||
    !isNonNegativeNumber(value.price) ||
    !(value.oldPrice === null || isNonNegativeNumber(value.oldPrice)) ||
    !isNonEmptyString(value.image) ||
    typeof value.stock !== "boolean" ||
    !isNonEmptyString(value.summary) ||
    !isNonEmptyString(value.description) ||
    !Array.isArray(value.features) ||
    !value.features.every(isNonEmptyString) ||
    !Array.isArray(value.specifications)
  ) {
    return null;
  }

  const specifications = value.specifications.filter(
    (item): item is { label: string; value: string } =>
      isRecord(item) && isNonEmptyString(item.label) && isNonEmptyString(item.value),
  );
  if (specifications.length !== value.specifications.length) return null;

  const images = Array.isArray(value.images)
    ? value.images.filter(isNonEmptyString).slice(0, 6)
    : undefined;
  const sizes = Array.isArray(value.sizes)
    ? value.sizes.filter(isNonEmptyString).slice(0, 12)
    : undefined;
  const colors = Array.isArray(value.colors)
    ? value.colors.filter(isNonEmptyString).slice(0, 12)
    : undefined;
  const options = Array.isArray(value.options)
    ? value.options
        .filter(
          (option) =>
            isRecord(option) &&
            isNonEmptyString(option.name) &&
            Array.isArray(option.values) &&
            option.values.every(isNonEmptyString),
        )
        .map((option) => ({
          name: String(option.name).trim().slice(0, 40),
          values: [
            ...new Set((option.values as string[]).map((item) => item.trim().slice(0, 40))),
          ].slice(0, 20),
        }))
        .filter((option) => option.values.length)
        .slice(0, 10)
    : undefined;
  const bulkPricing = Array.isArray(value.bulkPricing)
    ? value.bulkPricing
        .filter(
          (tier): tier is { minQuantity: number; discountPercent: number } =>
            isRecord(tier) &&
            Number.isInteger(tier.minQuantity) &&
            Number(tier.minQuantity) >= 2 &&
            isNonNegativeNumber(tier.discountPercent) &&
            tier.discountPercent > 0 &&
            tier.discountPercent < 100,
        )
        .slice(0, 6)
        .sort((first, second) => first.minQuantity - second.minQuantity)
    : undefined;
  const variants = Array.isArray(value.variants)
    ? value.variants
        .filter(
          (variant) =>
            isRecord(variant) &&
            isNonEmptyString(variant.id) &&
            isRecord(variant.options) &&
            Object.entries(variant.options).every(
              ([name, optionValue]) => isNonEmptyString(name) && isNonEmptyString(optionValue),
            ) &&
            Number.isInteger(variant.inventory) &&
            Number(variant.inventory) >= 0,
        )
        .map((variant) => ({
          id: String(variant.id).trim().slice(0, 200),
          options: Object.fromEntries(
            Object.entries(variant.options as Record<string, unknown>)
              .filter((entry): entry is [string, string] => isNonEmptyString(entry[1]))
              .map(([name, optionValue]) => [
                name.trim().slice(0, 40),
                optionValue.trim().slice(0, 40),
              ]),
          ),
          sku: typeof variant.sku === "string" ? variant.sku.trim().slice(0, 40) : undefined,
          inventory: Math.max(0, Number(variant.inventory)),
        }))
        .slice(0, 100)
    : undefined;
  const status = value.status === "draft" ? "draft" : "active";
  const inventory = Number.isInteger(value.inventory)
    ? Math.max(0, Number(value.inventory))
    : value.stock
      ? 1
      : 0;
  const packaging =
    isRecord(value.packaging) &&
    Number.isInteger(value.packaging.piecesPerBox) &&
    Number(value.packaging.piecesPerBox) > 0 &&
    Number.isInteger(value.packaging.boxesPerCarton) &&
    Number(value.packaging.boxesPerCarton) > 0
      ? {
          piecesPerBox: Number(value.packaging.piecesPerBox),
          boxesPerCarton: Number(value.packaging.boxesPerCarton),
        }
      : undefined;
  const shipping =
    isRecord(value.shipping) &&
    isNonNegativeNumber(value.shipping.weightOunces) &&
    Number(value.shipping.weightOunces) > 0 &&
    isNonNegativeNumber(value.shipping.lengthInches) &&
    Number(value.shipping.lengthInches) > 0 &&
    isNonNegativeNumber(value.shipping.widthInches) &&
    Number(value.shipping.widthInches) > 0 &&
    isNonNegativeNumber(value.shipping.heightInches) &&
    Number(value.shipping.heightInches) > 0 &&
    Number.isInteger(value.shipping.unitsPerPackage) &&
    Number(value.shipping.unitsPerPackage) > 0
      ? {
          weightOunces: Number(value.shipping.weightOunces),
          lengthInches: Number(value.shipping.lengthInches),
          widthInches: Number(value.shipping.widthInches),
          heightInches: Number(value.shipping.heightInches),
          unitsPerPackage: Number(value.shipping.unitsPerPackage),
        }
      : undefined;

  return {
    id: Number(value.id),
    slug: value.slug.trim(),
    name: value.name.trim().slice(0, 100),
    category: value.category.trim().slice(0, 100),
    type: value.type.trim().slice(0, 60),
    price: value.price,
    oldPrice: value.oldPrice,
    image: value.image,
    images,
    sizes: sizes?.map((size) => size.trim().slice(0, 40)),
    colors: colors?.map((color) => color.trim().slice(0, 40)),
    options,
    variants,
    bulkPricing,
    packaging,
    shipping,
    automaticPacking: validAutomaticPacking(value.automaticPacking)
      ? value.automaticPacking
      : emptyAutomaticPacking,
    shippingProfiles: validPackageProfiles(value.shippingProfiles) ? value.shippingProfiles : [],
    stock: inventory > 0,
    inventory,
    status,
    sku: typeof value.sku === "string" ? value.sku.trim().slice(0, 40) : undefined,
    summary: value.summary.trim().slice(0, 240),
    description: value.description.trim().slice(0, 10_000),
    features: value.features.map((feature) => feature.trim().slice(0, 200)),
    specifications: specifications.map((item) => ({
      label: item.label.trim().slice(0, 100),
      value: item.value.trim().slice(0, 300),
    })),
  };
}

function sanitizeCollection(value: unknown): Collection | null {
  if (
    !isRecord(value) ||
    !isNonEmptyString(value.slug) ||
    !isNonEmptyString(value.name) ||
    !isNonEmptyString(value.image)
  ) {
    return null;
  }

  return {
    slug: value.slug.trim().slice(0, 100),
    name: value.name.trim().slice(0, 100),
    image: value.image,
  };
}

export function sanitizeCatalogState(value: unknown): CatalogState | null {
  if (!isRecord(value) || !Array.isArray(value.products) || !Array.isArray(value.collections)) {
    return null;
  }

  const products = value.products.map(sanitizeProduct).filter((item): item is Product => !!item);
  const collections = value.collections
    .map(sanitizeCollection)
    .filter((item): item is Collection => !!item);
  if (
    products.length !== value.products.length ||
    collections.length !== value.collections.length
  ) {
    return null;
  }

  return {
    products,
    collections,
  };
}
