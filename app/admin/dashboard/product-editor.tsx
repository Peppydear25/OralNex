"use client";

import { FormEvent, useRef, useState } from "react";
import type { Collection, Product, ProductOption } from "../../data/catalog";
import { useOverlayBehavior } from "../../hooks/use-overlay-behavior";
import {
  BulkPricingFields,
  ProductOptionFields,
  SpecificationFields,
} from "./product-editor-fields";
import {
  generatedVariantSku,
  getProductOptions,
  syncProductVariants,
} from "../../lib/product-options";
import { ProductImageField } from "./product-image-field";
import { imagePreparationMessage, prepareImage, slugify } from "./utils";
import { VariantInventoryFields } from "./variant-inventory-fields";
import { LoadingIndicator } from "../../components/loading-indicator";
import { hasIncreasingBulkDiscounts } from "../../lib/pricing";
import styles from "./product-editor.module.css";

import { ShippingPackageFields } from "./shipping-package-fields";
import { cartonsAndSinglesDraft } from "../../../lib/shipping/measured-packages";
import {
  EditorSection,
  ProductDetailsFields,
  ProductPackagingFields,
  editorTabs,
  type EditorTab,
} from "./product-editor-sections";
import {
  cartonCountMatchesPacking,
  coversAllBoxQuantities,
  validAutomaticPacking,
  emptyAutomaticPacking,
} from "../../../lib/shipping/automatic-packing";

type Props = {
  product?: Product;
  collections: Collection[];
  onClose: () => void;
  onSave: (product: Product) => void | Promise<void>;
};

export function ProductEditor({ product, collections, onClose, onSave }: Props) {
  useOverlayBehavior(true, onClose);
  const [activeTab, setActiveTab] = useState<EditorTab>("details");
  const contentRef = useRef<HTMLDivElement>(null);
  const [images, setImages] = useState<string[]>(
    product?.images?.length ? product.images : product?.image ? [product.image] : [],
  );
  const [specifications, setSpecifications] = useState(
    product?.specifications.length ? product.specifications : [{ label: "", value: "" }],
  );
  const [bulkPricing, setBulkPricing] = useState(product?.bulkPricing ?? []);
  const [boxesPerCarton, setBoxesPerCarton] = useState(product?.packaging?.boxesPerCarton ?? 1);
  const [productSku, setProductSku] = useState(product?.sku ?? "");
  const [options, setOptions] = useState(product ? getProductOptions(product) : []);
  const [variants, setVariants] = useState(() =>
    product
      ? syncProductVariants(getProductOptions(product), product.variants ?? [], product.sku)
      : [],
  );
  const [imageError, setImageError] = useState("");
  const [variantError, setVariantError] = useState("");
  const [shippingError, setShippingError] = useState("");
  const [bulkPricingError, setBulkPricingError] = useState("");
  const [automaticPacking, setAutomaticPacking] = useState(() =>
    cartonsAndSinglesDraft(product?.automaticPacking ?? emptyAutomaticPacking, boxesPerCarton),
  );
  const [saving, setSaving] = useState(false);

  const uploadImages = async (files: FileList | null) => {
    if (!files) return;
    setImageError("");
    try {
      const available = Math.max(0, 6 - images.length);
      const prepared = await Promise.all(Array.from(files).slice(0, available).map(prepareImage));
      setImages((current) => [...current, ...prepared]);
    } catch (error) {
      setImageError(
        imagePreparationMessage(error, "The image could not be prepared. Try another file."),
      );
    }
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setVariantError("");
    setShippingError("");
    setBulkPricingError("");
    const firstInvalid = Array.from(event.currentTarget.elements).find(
      (element): element is HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement =>
        (element instanceof HTMLInputElement ||
          element instanceof HTMLSelectElement ||
          element instanceof HTMLTextAreaElement) &&
        !element.checkValidity(),
    );
    if (firstInvalid) {
      const tab = firstInvalid.closest<HTMLElement>("[data-editor-tab]")?.dataset.editorTab as
        EditorTab | undefined;
      if (tab) setActiveTab(tab);
      contentRef.current?.scrollTo({ top: 0 });
      window.requestAnimationFrame(() => {
        firstInvalid.focus();
        firstInvalid.reportValidity();
      });
      return;
    }
    if (!hasIncreasingBulkDiscounts(bulkPricing)) {
      setActiveTab("pricing");
      contentRef.current?.scrollTo({ top: 0 });
      setBulkPricingError(
        "Each volume tier needs a unique, larger quantity and a higher discount than the previous tier.",
      );
      return;
    }
    if (!validAutomaticPacking(automaticPacking)) {
      setActiveTab("shipping");
      contentRef.current?.scrollTo({ top: 0 });
      setShippingError(
        "Review shipping setup: enter each parcel’s exact box count, packed weight, and outside dimensions.",
      );
      return;
    }
    if (!cartonCountMatchesPacking(automaticPacking, boxesPerCarton)) {
      setActiveTab("shipping");
      contentRef.current?.scrollTo({ top: 0 });
      setShippingError(
        `The largest parcel for each product option must contain ${boxesPerCarton} box${boxesPerCarton === 1 ? "" : "es"}, matching Packaging → Boxes per carton. Check the counts before saving.`,
      );
      return;
    }
    if (automaticPacking.verified && !coversAllBoxQuantities(automaticPacking, boxesPerCarton)) {
      setActiveTab("shipping");
      contentRef.current?.scrollTo({ top: 0 });
      setShippingError(
        "Complete the box weight and smaller-parcel measurements for each product option before confirming shipping.",
      );
      return;
    }
    const data = new FormData(event.currentTarget);
    const normalizedOptions = options
      .map((option) => ({
        name: option.name.trim(),
        values: [...new Set(option.values.map((value) => value.trim()).filter(Boolean))],
      }))
      .filter((option) => option.name && option.values.length);
    const normalizedVariants = syncProductVariants(normalizedOptions, variants, productSku).map(
      (variant, index) => {
        const normalizedSku = variant.sku?.trim().toUpperCase();
        const sku =
          normalizedSku === generatedVariantSku("ON", index)
            ? generatedVariantSku(productSku, index)
            : normalizedSku;
        return {
          ...variant,
          sku: sku || generatedVariantSku(productSku, index),
          inventory: Math.max(0, Math.floor(variant.inventory) || 0),
        };
      },
    );
    const variantSkus = normalizedVariants.map((variant) => variant.sku).filter(Boolean);
    if (new Set(variantSkus).size !== variantSkus.length) {
      setActiveTab("inventory");
      contentRef.current?.scrollTo({ top: 0 });
      setVariantError(
        "Each variant must have a unique SKU. Update the repeated SKU and try again.",
      );
      return;
    }
    const inventory = normalizedVariants.length
      ? normalizedVariants.reduce((total, variant) => total + variant.inventory, 0)
      : Math.max(0, Number(data.get("inventory")) || 0);
    const name = String(data.get("name") ?? "").trim();
    const description = String(data.get("description") ?? "").trim();
    const productId = product?.id ?? Date.now();
    const primaryImage = images[0] ?? product?.image;
    if (!primaryImage) {
      setActiveTab("media");
      contentRef.current?.scrollTo({ top: 0 });
      setImageError("Upload at least one product image before saving.");
      return;
    }
    setSaving(true);
    try {
      await onSave({
        id: productId,
        databaseId: product?.databaseId,
        imagePaths: images.map((image) => {
          const existingIndex = product?.images?.indexOf(image) ?? -1;
          return existingIndex >= 0 ? (product?.imagePaths?.[existingIndex] ?? image) : image;
        }),
        name,
        slug: slugify(name),
        sku: productSku.trim().toUpperCase() || `ON-${String(productId).slice(-6)}`,
        category: String(data.get("category") ?? ""),
        type: String(data.get("type") ?? "Medical equipment"),
        price: Math.max(0, Number(data.get("price")) || 0),
        oldPrice: Number(data.get("oldPrice")) || null,
        image: primaryImage,
        images: images.length ? images : [primaryImage],
        inventory,
        stock: inventory > 0,
        status: String(data.get("status")) as "active" | "draft",
        // Keep the legacy summary value populated for the catalog/API contract without
        // asking staff to maintain a second, duplicate description.
        summary: description.slice(0, 240),
        description,
        features: [],
        specifications: specifications
          .map((item) => ({ label: item.label.trim(), value: item.value.trim() }))
          .filter((item) => item.label && item.value),
        sizes: undefined,
        colors: undefined,
        options: normalizedOptions,
        variants: normalizedVariants.length ? normalizedVariants : undefined,
        bulkPricing: bulkPricing
          .filter(
            (tier) =>
              Number.isInteger(tier.minQuantity) &&
              tier.minQuantity >= 2 &&
              tier.discountPercent > 0 &&
              tier.discountPercent < 100,
          )
          .sort((first, second) => first.minQuantity - second.minQuantity),
        packaging: {
          piecesPerBox: Math.max(1, Math.floor(Number(data.get("piecesPerBox"))) || 1),
          boxesPerCarton,
        },
        shipping: product?.shipping,
        shippingProfiles: product?.shippingProfiles ?? [],
        automaticPacking,
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={styles.backdrop}>
      <section
        className={styles.dialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby="product-editor-title"
      >
        <header className={styles.header}>
          <div>
            <h2 id="product-editor-title">{product ? "Edit product" : "Add product"}</h2>
            {product && <p className={styles.subtitle}>{product.name}</p>}
          </div>
          <button
            className={styles.close}
            type="button"
            onClick={onClose}
            aria-label="Close editor"
          >
            ×
          </button>
        </header>
        <nav className={styles.navigation} aria-label="Product editor sections">
          {editorTabs.map(({ label, id }) => (
            <button
              key={id}
              type="button"
              aria-pressed={activeTab === id}
              onClick={() => {
                setActiveTab(id);
                contentRef.current?.scrollTo({ top: 0 });
              }}
            >
              {label}
            </button>
          ))}
        </nav>
        <form className={styles.form} onSubmit={submit} noValidate>
          <div className={styles.content} ref={contentRef}>
            <EditorSection tab="details" activeTab={activeTab}>
              <ProductDetailsFields
                product={product}
                collections={collections}
                productSku={productSku}
                setProductSku={setProductSku}
                setVariants={setVariants}
                setVariantError={setVariantError}
                hasVariants={variants.length > 0}
              />
            </EditorSection>
            <EditorSection
              tab="packaging"
              activeTab={activeTab}
              title="Packaging"
              description="Customers buy boxes. A carton contains several boxes and is not the storefront quantity."
            >
              <ProductPackagingFields
                product={product}
                boxesPerCarton={boxesPerCarton}
                setBoxesPerCarton={setBoxesPerCarton}
                setAutomaticPacking={setAutomaticPacking}
              />
            </EditorSection>
            <EditorSection tab="inventory" activeTab={activeTab} title="Options and inventory">
              <ProductOptionFields
                options={options}
                onChange={(nextOptions: ProductOption[]) => {
                  setOptions(nextOptions);
                  setVariants((current) => syncProductVariants(nextOptions, current, productSku));
                }}
              />
              <VariantInventoryFields
                variants={variants}
                onChange={(nextVariants) => {
                  setVariants(nextVariants);
                  setVariantError("");
                }}
                error={variantError}
              />
            </EditorSection>
            <div
              className={styles.tabPanel}
              hidden={activeTab !== "shipping"}
              data-editor-tab="shipping"
            >
              <ShippingPackageFields
                value={automaticPacking}
                onChange={(next) => {
                  setAutomaticPacking(next);
                  setShippingError("");
                }}
                variants={variants}
                boxesPerCarton={boxesPerCarton}
                error={shippingError}
              />
            </div>
            <EditorSection
              tab="pricing"
              activeTab={activeTab}
              title="Volume pricing"
              description="Discounts apply automatically at checkout."
            >
              <BulkPricingFields
                tiers={bulkPricing}
                error={bulkPricingError}
                onChange={(next) => {
                  setBulkPricing(next);
                  setBulkPricingError("");
                }}
              />
            </EditorSection>
            <EditorSection tab="media" activeTab={activeTab} title="Media and description">
              <ProductImageField
                images={images}
                error={imageError}
                onUpload={uploadImages}
                onRemove={(index) =>
                  setImages((current) => current.filter((_, itemIndex) => itemIndex !== index))
                }
              />
              <label className="col-span-2 max-sm:col-span-1">
                Product description
                <textarea
                  name="description"
                  rows={4}
                  defaultValue={product?.description}
                  required
                />
              </label>
            </EditorSection>
            <EditorSection tab="specifications" activeTab={activeTab} title="Specifications">
              <SpecificationFields specifications={specifications} onChange={setSpecifications} />
            </EditorSection>
          </div>
          <footer className={styles.footer}>
            <button type="button" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" disabled={saving}>
              {saving ? (
                <LoadingIndicator label={product ? "Saving changes…" : "Creating product…"} />
              ) : product ? (
                "Save changes"
              ) : (
                "Create product"
              )}
            </button>
          </footer>
        </form>
      </section>
    </div>
  );
}
