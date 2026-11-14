"use client";

import type { ReactNode } from "react";
import type { Collection, Product } from "../../data/catalog";
import { generatedVariantSku } from "../../lib/product-options";
import { cartonsAndSinglesDraft } from "../../../lib/shipping/measured-packages";
import type { AutomaticPacking } from "../../../lib/shipping/automatic-packing";
import styles from "./product-editor.module.css";

export const editorTabs = [
  { id: "details", label: "Details" },
  { id: "packaging", label: "Packaging" },
  { id: "inventory", label: "Inventory" },
  { id: "shipping", label: "Shipping" },
  { id: "pricing", label: "Pricing" },
  { id: "media", label: "Media" },
  { id: "specifications", label: "Specifications" },
] as const;

export type EditorTab = (typeof editorTabs)[number]["id"];

export function EditorSection({
  tab,
  activeTab,
  title,
  description,
  children,
}: {
  tab: EditorTab;
  activeTab: EditorTab;
  title?: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section
      data-editor-tab={tab}
      hidden={activeTab !== tab}
      className={`${styles.tabPanel} grid min-w-0 grid-cols-2 gap-x-4 gap-y-4 rounded-xl border border-slate-200 bg-white p-4 max-sm:grid-cols-1`}
    >
      {(title || description) && (
        <div className="col-span-2 border-b border-slate-100 pb-3 max-sm:col-span-1">
          {title && <h3 className="text-base font-semibold text-slate-900">{title}</h3>}
          {description && <p className="mt-1 text-xs leading-5 text-slate-500">{description}</p>}
        </div>
      )}
      {children}
    </section>
  );
}

export function ProductDetailsFields({
  product,
  collections,
  productSku,
  setProductSku,
  setVariants,
  setVariantError,
  hasVariants,
}: {
  product?: Product;
  collections: Collection[];
  productSku: string;
  setProductSku: (sku: string) => void;
  setVariants: React.Dispatch<React.SetStateAction<NonNullable<Product["variants"]>>>;
  setVariantError: (error: string) => void;
  hasVariants: boolean;
}) {
  return (
    <>
      <label className="col-span-2 max-sm:col-span-1">
        Product name
        <input name="name" defaultValue={product?.name} required maxLength={100} />
      </label>
      <label>
        SKU
        <input
          name="sku"
          value={productSku}
          onChange={(event) => {
            const nextSku = event.target.value.toUpperCase();
            setVariants((current) =>
              current.map((variant, index) => {
                const currentSku = variant.sku?.trim().toUpperCase();
                const wasGenerated =
                  !currentSku ||
                  currentSku === generatedVariantSku(productSku, index) ||
                  currentSku === generatedVariantSku("ON", index);
                return wasGenerated
                  ? { ...variant, sku: generatedVariantSku(nextSku, index) }
                  : variant;
              }),
            );
            setProductSku(nextSku);
            setVariantError("");
          }}
          maxLength={40}
          required
        />
      </label>
      <label>
        Category
        <select name="category" defaultValue={product?.category} required>
          {collections.map((item) => (
            <option key={item.slug}>{item.name}</option>
          ))}
        </select>
      </label>
      <label>
        Product type
        <input name="type" defaultValue={product?.type} required maxLength={60} />
      </label>
      <label>
        Price (USD)
        <input
          name="price"
          type="number"
          min="0"
          step="0.01"
          defaultValue={product?.price}
          required
        />
      </label>
      <label>
        Compare-at price
        <input
          name="oldPrice"
          type="number"
          min="0"
          step="0.01"
          defaultValue={product?.oldPrice ?? ""}
        />
      </label>
      {!hasVariants && (
        <label>
          Inventory quantity
          <input
            name="inventory"
            type="number"
            min="0"
            step="1"
            defaultValue={product?.inventory ?? 0}
            required
          />
        </label>
      )}
      <label>
        Status
        <select name="status" defaultValue={product?.status ?? "active"}>
          <option value="active">Active</option>
          <option value="draft">Draft</option>
        </select>
      </label>
    </>
  );
}

export function ProductPackagingFields({
  product,
  boxesPerCarton,
  setBoxesPerCarton,
  setAutomaticPacking,
}: {
  product?: Product;
  boxesPerCarton: number;
  setBoxesPerCarton: (count: number) => void;
  setAutomaticPacking: React.Dispatch<React.SetStateAction<AutomaticPacking>>;
}) {
  return (
    <>
      <label>
        Pieces per box
        <input
          name="piecesPerBox"
          type="number"
          min="1"
          step="1"
          defaultValue={product?.packaging?.piecesPerBox ?? 1}
          required
        />
      </label>
      <label>
        Boxes per carton
        <input
          name="boxesPerCarton"
          type="number"
          min="1"
          step="1"
          value={boxesPerCarton}
          onChange={(event) => {
            const count = Math.max(1, Math.floor(Number(event.target.value)) || 1);
            setBoxesPerCarton(count);
            setAutomaticPacking((current) => cartonsAndSinglesDraft(current, count));
          }}
          required
        />
      </label>
      <p className="col-span-2 text-xs font-normal leading-5 text-slate-500 max-sm:col-span-1">
        Prices and inventory are managed by box. Carton quantity is used for case ordering and
        fulfillment.
      </p>
    </>
  );
}
