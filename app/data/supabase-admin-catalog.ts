import { createClient } from "../../lib/supabase/client";
import type { Collection, Product } from "./catalog";
import type { Merchandising } from "./catalog-state";
import { validPackageProfiles } from "../../lib/shipping/package-profiles";
import {
  validAutomaticPacking,
  cartonCountMatchesPacking,
  coversAllBoxQuantities,
  emptyAutomaticPacking,
} from "../../lib/shipping/automatic-packing";

const shippingMigrationMessage =
  "Shipping setup is missing from the database. Apply Supabase migrations through 202610090003_simple_shipping_capacity.sql, then retry. Your entries remain in the editor.";

export function sameAutomaticPacking(a: unknown, b: unknown) {
  if (!validAutomaticPacking(a) || !validAutomaticPacking(b)) return false;
  const canonical = (p: typeof a) =>
    JSON.stringify([
      p.mode ?? null,
      p.strategy ?? null,
      p.verified,
      p.units.map((u) => [u.variantSku, u.weightKg, u.lengthCm, u.widthCm, u.heightCm]),
      p.cartons.map((c) => [
        c.name,
        c.innerLengthCm,
        c.innerWidthCm,
        c.innerHeightCm,
        c.lengthCm,
        c.widthCm,
        c.heightCm,
        c.partialDimensionsCm
          ? [
              c.partialDimensionsCm.lengthCm,
              c.partialDimensionsCm.widthCm,
              c.partialDimensionsCm.heightCm,
            ]
          : null,
        c.partialMaxBoxes ?? null,
        c.tareKg,
        c.maxWeightKg,
        Object.entries(c.capacityBySku ?? {}).sort(([a], [b]) => a.localeCompare(b)),
        Object.entries(c.grossWeightBySku ?? {}).sort(([a], [b]) => a.localeCompare(b)),
      ]),
    ]);
  return canonical(a) === canonical(b);
}

function sameShippingProfiles(first: unknown, second: unknown) {
  if (!validPackageProfiles(first) || !validPackageProfiles(second)) return false;
  return (
    first.length === second.length &&
    first.every((p, index) => {
      const other = second[index];
      return (
        p.name === other.name &&
        p.variantSku === other.variantSku &&
        p.boxes === other.boxes &&
        p.weightKg === other.weightKg &&
        p.lengthCm === other.lengthCm &&
        p.widthCm === other.widthCm &&
        p.heightCm === other.heightCm &&
        p.verified === other.verified
      );
    })
  );
}

const mediaBucket = "product-media";

function dataUrlToBlob(value: string) {
  const match = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/.exec(value);
  if (!match) throw new Error("The selected image could not be prepared for upload.");

  const [, contentType, encoded] = match;
  const decoded = window.atob(encoded);
  const bytes = new Uint8Array(decoded.length);
  for (let index = 0; index < decoded.length; index += 1) {
    bytes[index] = decoded.charCodeAt(index);
  }
  return new Blob([bytes], { type: contentType });
}

async function persistImage(value: string, folder: string) {
  if (!value.startsWith("data:")) return value;
  const blob = dataUrlToBlob(value);
  const extension = blob.type === "image/png" ? "png" : blob.type === "image/jpeg" ? "jpg" : "webp";
  const path = `${folder}/${crypto.randomUUID()}.${extension}`;
  const { error } = await createClient().storage.from(mediaBucket).upload(path, blob, {
    contentType: blob.type,
    cacheControl: "31536000",
    upsert: false,
  });
  if (error) {
    throw new Error(`Image upload failed: ${error.message}`, { cause: error });
  }
  return path;
}

export async function saveAdminProduct(product: Product, collections: Collection[]) {
  const category = collections.find((item) => item.name === product.category);
  if (!category?.databaseId) throw new Error("Select a database-backed category.");

  const profiles = product.shippingProfiles ?? [];
  const packing = product.automaticPacking ?? emptyAutomaticPacking;
  if (!validAutomaticPacking(packing))
    throw new Error(
      "Enter the box count, packed weight, and package size for each shipping preset.",
    );
  if (!cartonCountMatchesPacking(packing, product.packaging?.boxesPerCarton ?? 0))
    throw new Error("The full shipping carton must contain the same number of boxes as Packaging.");
  if (packing.verified && !coversAllBoxQuantities(packing, product.packaging?.boxesPerCarton ?? 0))
    throw new Error(
      "Complete the box weight and smaller-parcel shipping measurements for each product option.",
    );
  const shippingSkus = product.variants?.length
    ? product.variants.map((variant) => variant.sku ?? "")
    : [""];
  if (
    packing.verified &&
    shippingSkus.some((sku) => !packing.units.some((unit) => unit.variantSku === sku))
  )
    throw new Error("Set up shipping for every current product option before confirming.");
  if (!validPackageProfiles(profiles))
    throw new Error("Review the shipping package measurements before saving.");
  const client = createClient();
  // Check before uploading images or writing a product with an old RPC contract.
  const { error: schemaError } = await client
    .from("products")
    .select("shipping_package_profiles,automatic_packing")
    .limit(0);
  if (schemaError) {
    if (schemaError.code === "42703" || schemaError.code === "PGRST204")
      throw new Error(shippingMigrationMessage);
    throw new Error(
      "Could not check shipping setup. Check your connection and admin session, then retry.",
    );
  }

  const sourceImages = product.imagePaths?.length
    ? product.imagePaths
    : (product.images ?? [product.image]);
  const imagePaths = await Promise.all(
    sourceImages.map((image) => persistImage(image, `products/${product.databaseId ?? "new"}`)),
  );
  const { data, error } = await client.rpc("admin_save_product", {
    payload: {
      id: product.databaseId ?? null,
      category_id: category.databaseId,
      name: product.name,
      slug: product.slug,
      sku: product.sku,
      product_type: product.type,
      summary: product.summary,
      description: product.description,
      price_cents: Math.round(product.price * 100),
      compare_at_price_cents: product.oldPrice === null ? null : Math.round(product.oldPrice * 100),
      stock_quantity: product.inventory ?? 0,
      low_stock_threshold: 5,
      status: product.status ?? "active",
      is_featured: false,
      pieces_per_box: product.packaging?.piecesPerBox ?? null,
      boxes_per_carton: product.packaging?.boxesPerCarton ?? null,
      shipping_package_profiles: profiles,
      automatic_packing: packing,
      shipping_weight_ounces: product.shipping?.weightOunces ?? null,
      shipping_length_inches: product.shipping?.lengthInches ?? null,
      shipping_width_inches: product.shipping?.widthInches ?? null,
      shipping_height_inches: product.shipping?.heightInches ?? null,
      shipping_units_per_package: product.shipping?.unitsPerPackage ?? null,
      images: imagePaths.map((storagePath, displayOrder) => ({
        storage_path: storagePath,
        alt_text: product.name,
        display_order: displayOrder,
      })),
      variants: (product.variants ?? []).map((variant) => ({
        id: /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
          variant.id,
        )
          ? variant.id
          : null,
        options: variant.options,
        sku: variant.sku,
        stock_quantity: variant.inventory,
        is_active: true,
      })),
      features: [],
      specifications: product.specifications.map((item, displayOrder) => ({
        label: item.label,
        value: item.value,
        display_order: displayOrder,
      })),
      bulk_pricing: (product.bulkPricing ?? []).map((tier) => ({
        min_quantity: tier.minQuantity,
        discount_percent: tier.discountPercent,
      })),
    },
  });
  if (error) {
    if (error.message?.includes("Valid automatic packing settings are required"))
      throw new Error(
        "Shipping settings were rejected. Check the exact package box counts and packed weights, and ensure migration 202610110001_carton_gross_packing.sql has been applied.",
      );
    throw error;
  }
  const { data: saved, error: readError } = await client
    .from("products")
    .select("shipping_package_profiles,automatic_packing")
    .eq("id", String(data))
    .single();
  if (readError || !saved)
    throw new Error(
      "The product save completed, but its shipping profiles could not be checked. Reload the catalog before retrying to avoid creating a duplicate product.",
    );
  if (!sameShippingProfiles(profiles, saved.shipping_package_profiles)) {
    throw new Error(
      "The product was saved, but its shipping profiles were not stored correctly. Check that migration 202610090001_verified_shipping_profiles.sql is fully applied. Reload the catalog before retrying.",
    );
  }
  if (!sameAutomaticPacking(packing, saved.automatic_packing))
    throw new Error(
      "Product saved, but automatic packing was not stored correctly. Apply migration 202610090002_automatic_packing.sql and reload before retrying.",
    );
  return String(data);
}

export async function deleteAdminProduct(product: Product) {
  if (!product.databaseId) throw new Error("This product has no database record.");
  const { error } = await createClient().rpc("admin_delete_product", {
    target_product_id: product.databaseId,
  });
  if (error) throw error;

  const storedPaths = (product.imagePaths ?? []).filter(
    (path) => !path.startsWith("/") && !path.startsWith("http") && !path.startsWith("data:"),
  );
  if (storedPaths.length) await createClient().storage.from(mediaBucket).remove(storedPaths);
}

export async function saveAdminCollection(
  collection: Collection,
  products: Product[],
  productIds: number[],
) {
  const imagePath = await persistImage(
    collection.imagePath ?? collection.image,
    `categories/${collection.databaseId ?? "new"}`,
  );
  const databaseProductIds = products
    .filter((product) => productIds.includes(product.id))
    .map((product) => product.databaseId)
    .filter((id): id is string => Boolean(id));
  const { data, error } = await createClient().rpc("admin_save_category", {
    payload: {
      id: collection.databaseId ?? null,
      name: collection.name,
      slug: collection.slug,
      description: collection.description,
      image_path: imagePath,
      product_ids: databaseProductIds,
    },
  });
  if (error) throw error;
  return String(data);
}

export async function deleteAdminCollection(collection: Collection) {
  if (!collection.databaseId) throw new Error("This category has no database record.");
  const { error } = await createClient().rpc("admin_delete_category", {
    target_category_id: collection.databaseId,
  });
  if (error) throw error;

  const path = collection.imagePath;
  if (path && !path.startsWith("/") && !path.startsWith("http") && !path.startsWith("data:")) {
    await createClient().storage.from(mediaBucket).remove([path]);
  }
}

export async function saveAdminMerchandising(merchandising: Merchandising) {
  if (merchandising.heroSlides.length < 1 || merchandising.heroSlides.length > 3)
    throw new Error("Storefront requires one to three hero slides.");
  const client = createClient();
  const { data: previousSettings } = await client
    .from("storefront_settings")
    .select("hero_images,hero_slides")
    .eq("id", true)
    .maybeSingle();
  const uploadedPaths: string[] = [];
  const persistHeroImage = async (image: string, folder: string) => {
    const path = await persistImage(image, folder);
    if (image.startsWith("data:")) uploadedPaths.push(path);
    return path;
  };
  const heroSlides = await Promise.all(
    merchandising.heroSlides.map(async (slide) => {
      const image = await persistHeroImage(slide.desktopImage, "storefront/hero");
      return {
        desktop_image: image,
        mobile_image: image,
        alt: slide.alt.trim(),
        published: slide.published,
      };
    }),
  );
  const { error } = await client.rpc("admin_save_storefront_settings", {
    payload: {
      hero_images: heroSlides.map((slide) => slide.desktop_image),
      hero_slides: heroSlides,
      hero_eyebrow: merchandising.heroEyebrow,
      hero_title: merchandising.heroTitle,
      bulk_product_ids: [],
    },
  });
  if (error) {
    if (uploadedPaths.length) await client.storage.from(mediaBucket).remove(uploadedPaths);
    throw error;
  }

  const previousRecord = previousSettings as {
    hero_images?: string[];
    hero_slides?: Array<{ desktop_image?: string; mobile_image?: string }>;
  } | null;
  const oldPaths = new Set([
    ...(previousRecord?.hero_images ?? []),
    ...(previousRecord?.hero_slides ?? []).flatMap((slide) => [
      slide.desktop_image ?? "",
      slide.mobile_image ?? "",
    ]),
  ]);
  const retainedPaths = new Set(
    heroSlides.flatMap((slide) => [slide.desktop_image, slide.mobile_image]),
  );
  const obsoletePaths = [...oldPaths].filter(
    (path) =>
      path &&
      !retainedPaths.has(path) &&
      !path.startsWith("/") &&
      !path.startsWith("http") &&
      !path.startsWith("data:"),
  );
  if (obsoletePaths.length) await client.storage.from(mediaBucket).remove(obsoletePaths);
}
