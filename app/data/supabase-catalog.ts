import { createClient } from "../../lib/supabase/client";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseConfig } from "../../lib/supabase/config";
import type { Collection, Product, ProductOption, ProductVariant } from "./catalog";
import type { Merchandising } from "./catalog-state";

type CategoryRow = {
  id: string;
  name: string;
  slug: string;
  description: string;
  image_path: string | null;
};

type ProductRow = {
  id: string;
  category_id: string | null;
  name: string;
  slug: string;
  sku: string;
  summary: string;
  description: string;
  price_cents: number;
  compare_at_price_cents: number | null;
  stock_quantity: number;
  status: "draft" | "active" | "archived";
  product_type: string;
  pieces_per_box: number | null;
  boxes_per_carton: number | null;
  shipping_package_profiles?: Product["shippingProfiles"];
  automatic_packing?: Product["automaticPacking"];
  shipping_weight_ounces: number | null;
  shipping_length_inches: number | null;
  shipping_width_inches: number | null;
  shipping_height_inches: number | null;
  shipping_units_per_package: number | null;
};

type ImageRow = { product_id: string; storage_path: string; display_order: number };
type VariantRow = {
  id: string;
  product_id: string;
  options: Record<string, string>;
  sku: string;
  stock_quantity: number;
  is_active: boolean;
};
type FeatureRow = { product_id: string; feature: string; display_order: number };
type SpecificationRow = {
  product_id: string;
  label: string;
  value: string;
  display_order: number;
};
type BulkTierRow = { product_id: string; min_quantity: number; discount_percent: number };
type StorefrontSettingsRow = {
  hero_images: string[];
  hero_slides?: Array<{
    desktop_image: string;
    mobile_image: string;
    alt: string;
    published: boolean;
  }>;
  hero_eyebrow: string;
  hero_title: string;
  bulk_product_ids: string[];
};

const knownProductIds: Record<string, number> = {
  "nitrile-exam-gloves": 3,
  "disposable-face-mask": 9,
};

function storefrontProductId(databaseId: string, slug: string) {
  if (knownProductIds[slug]) return knownProductIds[slug];
  const compactId = databaseId.replaceAll("-", "").slice(0, 12);
  return Number.parseInt(compactId, 16);
}

function groupByProduct<T extends { product_id: string }>(rows: T[]) {
  return rows.reduce<Record<string, T[]>>((groups, row) => {
    (groups[row.product_id] ??= []).push(row);
    return groups;
  }, {});
}

function productOptions(variants: ProductVariant[]): ProductOption[] {
  const values = new Map<string, string[]>();
  variants.forEach((variant) => {
    Object.entries(variant.options).forEach(([name, value]) => {
      const current = values.get(name) ?? [];
      if (!current.includes(value)) current.push(value);
      values.set(name, current);
    });
  });
  return [...values].map(([name, optionValues]) => ({ name, values: optionValues }));
}

function catalogMediaUrl(path: string) {
  if (path.startsWith("/") || path.startsWith("http") || path.startsWith("data:")) return path;
  const { url } = getSupabaseConfig();
  return `${url}/storage/v1/object/public/product-media/${path
    .split("/")
    .map(encodeURIComponent)
    .join("/")}`;
}

export async function loadSupabaseCatalog(client?: SupabaseClient) {
  const supabase = client ?? createClient();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15_000);
  try {
    const [
      categories,
      products,
      images,
      variants,
      features,
      specifications,
      bulkTiers,
      settingsResult,
    ] = await Promise.all([
      supabase
        .from("categories")
        .select("id,name,slug,description,image_path")
        .order("display_order")
        .abortSignal(controller.signal),
      // RLS returns active products publicly and additionally exposes drafts to an MFA admin.
      supabase
        .from("products")
        .select(
          "id,category_id,name,slug,sku,summary,description,price_cents,compare_at_price_cents,stock_quantity,status,product_type,pieces_per_box,boxes_per_carton,shipping_package_profiles,automatic_packing,shipping_weight_ounces,shipping_length_inches,shipping_width_inches,shipping_height_inches,shipping_units_per_package",
        )
        .order("created_at")
        .abortSignal(controller.signal),
      supabase
        .from("product_images")
        .select("product_id,storage_path,display_order")
        .order("display_order")
        .abortSignal(controller.signal),
      supabase
        .from("product_variants")
        .select("id,product_id,options,sku,stock_quantity,is_active")
        .eq("is_active", true)
        .order("created_at")
        .abortSignal(controller.signal),
      supabase
        .from("product_features")
        .select("product_id,feature,display_order")
        .order("display_order")
        .abortSignal(controller.signal),
      supabase
        .from("product_specifications")
        .select("product_id,label,value,display_order")
        .order("display_order")
        .abortSignal(controller.signal),
      supabase
        .from("product_bulk_pricing_tiers")
        .select("product_id,min_quantity,discount_percent")
        .order("min_quantity")
        .abortSignal(controller.signal),
      supabase
        .from("storefront_settings")
        .select("hero_images,hero_slides,hero_eyebrow,hero_title,bulk_product_ids")
        .eq("id", true)
        .abortSignal(controller.signal)
        .maybeSingle(),
    ]);
    // Older installations have hero_images but not the responsive hero_slides
    // column. Keep the public storefront available until its migration is applied.
    // Do not suppress any other schema or connectivity failure.
    const settings =
      settingsResult.error?.code === "42703" && settingsResult.error.message.includes("hero_slides")
        ? await supabase
            .from("storefront_settings")
            .select("hero_images,hero_eyebrow,hero_title,bulk_product_ids")
            .eq("id", true)
            .abortSignal(controller.signal)
            .maybeSingle()
        : settingsResult;
    const error = [
      categories,
      products,
      images,
      variants,
      features,
      specifications,
      bulkTiers,
      settings,
    ].find((result) => result.error)?.error;
    if (error) return { catalog: null, error };
    const categoryRows = (categories.data ?? []) as CategoryRow[];
    const categoryById = new Map(categoryRows.map((category) => [category.id, category]));
    const imageGroups = groupByProduct((images.data ?? []) as ImageRow[]);
    const variantGroups = groupByProduct((variants.data ?? []) as VariantRow[]);
    const featureGroups = groupByProduct((features.data ?? []) as FeatureRow[]);
    const specificationGroups = groupByProduct((specifications.data ?? []) as SpecificationRow[]);
    const bulkTierGroups = groupByProduct((bulkTiers.data ?? []) as BulkTierRow[]);

    const mappedProducts: Product[] = ((products.data ?? []) as ProductRow[]).map((product) => {
      const category = product.category_id ? categoryById.get(product.category_id) : undefined;
      const productImagePaths = imageGroups[product.id]?.map((image) => image.storage_path) ?? [];
      const productImages = productImagePaths.map(catalogMediaUrl);
      const productVariants: ProductVariant[] = (variantGroups[product.id] ?? []).map(
        (variant) => ({
          id: variant.id,
          options: variant.options,
          sku: variant.sku,
          inventory: variant.stock_quantity,
        }),
      );
      const options = productOptions(productVariants);

      return {
        id: storefrontProductId(product.id, product.slug),
        databaseId: product.id,
        imagePaths: productImagePaths,
        slug: product.slug,
        name: product.name,
        category: category?.name ?? "Uncategorized",
        type: product.product_type || category?.name || "Medical equipment",
        price: product.price_cents / 100,
        oldPrice:
          product.compare_at_price_cents === null ? null : product.compare_at_price_cents / 100,
        image: productImages[0] ?? category?.image_path ?? "/logo.jpg",
        images: productImages,
        stock: product.stock_quantity > 0,
        inventory: product.stock_quantity,
        status: product.status === "active" ? "active" : "draft",
        sku: product.sku,
        summary: product.summary,
        description: product.description,
        features: (featureGroups[product.id] ?? []).map((feature) => feature.feature),
        specifications: (specificationGroups[product.id] ?? []).map((item) => ({
          label: item.label,
          value: item.value,
        })),
        sizes: options.find((option) => option.name.toLowerCase() === "size")?.values,
        colors: options.find((option) => option.name.toLowerCase() === "color")?.values,
        options,
        variants: productVariants,
        bulkPricing: (bulkTierGroups[product.id] ?? []).map((tier) => ({
          minQuantity: tier.min_quantity,
          discountPercent: tier.discount_percent,
        })),
        packaging:
          product.pieces_per_box && product.boxes_per_carton
            ? {
                piecesPerBox: product.pieces_per_box,
                boxesPerCarton: product.boxes_per_carton,
              }
            : undefined,
        shippingProfiles: product.shipping_package_profiles ?? [],
        automaticPacking: product.automatic_packing,
        shipping:
          product.shipping_weight_ounces &&
          product.shipping_length_inches &&
          product.shipping_width_inches &&
          product.shipping_height_inches &&
          product.shipping_units_per_package
            ? {
                weightOunces: Number(product.shipping_weight_ounces),
                lengthInches: Number(product.shipping_length_inches),
                widthInches: Number(product.shipping_width_inches),
                heightInches: Number(product.shipping_height_inches),
                unitsPerPackage: product.shipping_units_per_package,
              }
            : undefined,
      };
    });

    const mappedCollections: Collection[] = categoryRows.map((category) => ({
      databaseId: category.id,
      imagePath: category.image_path ?? undefined,
      slug: category.slug,
      name: category.name,
      description: category.description,
      image: category.image_path ? catalogMediaUrl(category.image_path) : "/logo.jpg",
    }));

    const settingsRow = settings.data as StorefrontSettingsRow | null;
    const productIdByDatabaseId = new Map(
      mappedProducts.map((product) => [product.databaseId, product.id]),
    );
    const merchandising: Merchandising | undefined = settingsRow
      ? {
          heroSlides: settingsRow.hero_slides?.length
            ? settingsRow.hero_slides.map((slide) => ({
                desktopImage: catalogMediaUrl(slide.desktop_image),
                mobileImage: catalogMediaUrl(slide.mobile_image || slide.desktop_image),
                alt: slide.alt,
                published: slide.published,
              }))
            : settingsRow.hero_images.map((image, index) => ({
                desktopImage: catalogMediaUrl(image),
                mobileImage: catalogMediaUrl(image),
                alt: `OralNex featured medical supplies ${index + 1}`,
                published: true,
              })),
          heroEyebrow: settingsRow.hero_eyebrow,
          heroTitle: settingsRow.hero_title,
          dealProductIds: settingsRow.bulk_product_ids
            .map((id) => productIdByDatabaseId.get(id))
            .filter((id): id is number => typeof id === "number"),
        }
      : undefined;

    return {
      catalog: {
        products: mappedProducts,
        collections: mappedCollections,
        ...(merchandising ? { merchandising } : {}),
      },
      error: null,
    };
  } catch (error) {
    return {
      catalog: null,
      error: error instanceof Error ? error : new Error("The live catalog could not be loaded."),
    };
  } finally {
    clearTimeout(timeout);
  }
}
