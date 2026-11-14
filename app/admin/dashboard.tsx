"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import type { Collection, Product } from "../data/catalog";
import { useCatalog } from "../data/catalog-store";
import { CategoriesPanel } from "./dashboard/categories-panel";
import { InventoryPanel } from "./dashboard/inventory-panel";
import { MerchandisingPanel } from "./dashboard/merchandising-panel";
import { OrdersPanel } from "./dashboard/orders-panel";
import { OverviewPanel } from "./dashboard/overview-panel";
import { ConfirmationDialog, OperationNotice } from "./dashboard/shared";
import type { AdminTab, Editor, Notice } from "./dashboard/types";

const CollectionEditor = dynamic(() =>
  import("./dashboard/collection-editor").then((module) => module.CollectionEditor),
);
const ProductEditor = dynamic(() =>
  import("./dashboard/product-editor").then((module) => module.ProductEditor),
);

type DeleteTarget =
  { kind: "product"; product: Product } | { kind: "collection"; collection: Collection } | null;

function adminOperationError(error: unknown, fallback: string) {
  if (!error || typeof error !== "object") return fallback;
  const details = error as { code?: unknown; message?: unknown };
  const code = typeof details.code === "string" ? details.code : "";
  const message = typeof details.message === "string" ? details.message : "";
  if (code === "23505") {
    return "A name, SKU, or product option is already in use. Choose a unique value and try again.";
  }
  if (code === "23503") return "This item is still in use elsewhere. Remove its assignments first.";
  if (code === "23514")
    return "Some values are outside the allowed range. Review the form and try again.";
  if (message.includes("save completed") || message.includes("was saved"))
    return "The change may have saved, but we could not confirm it. Reload the catalog before trying again.";
  if (message.includes("shipping") || message.includes("Shipping"))
    return "Review the shipping package details and try saving again. If this continues, contact support.";
  return fallback;
}

const tabTitles: Record<AdminTab, string> = {
  overview: "Overview",
  inventory: "Inventory",
  categories: "Categories",
  merchandising: "Storefront merchandising",
  orders: "Orders",
};

const mobileTabs: AdminTab[] = ["overview", "inventory", "categories", "merchandising", "orders"];

export function AdminDashboard({
  initialTab,
  checkoutReady,
}: {
  initialTab: AdminTab;
  checkoutReady: boolean;
}) {
  const catalog = useCatalog();
  const router = useRouter();
  const tab = initialTab;
  const [productQuery, setProductQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [editor, setEditor] = useState<Editor>(null);
  const [saved, setSaved] = useState(false);
  const [publishingStorefront, setPublishingStorefront] = useState(false);
  const [notice, setNotice] = useState<Notice>(null);
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget>(null);

  const visibleProducts = useMemo(
    () =>
      catalog.products.filter(
        (product) =>
          (categoryFilter === "all" || product.category === categoryFilter) &&
          `${product.name} ${product.sku ?? ""}`.toLowerCase().includes(productQuery.toLowerCase()),
      ),
    [catalog.products, productQuery, categoryFilter],
  );

  const openTab = (value: AdminTab) => {
    router.push(value === "overview" ? "/admin" : `/admin?tab=${value}`);
  };

  const deleteProduct = (product: Product) => {
    setDeleteTarget({ kind: "product", product });
  };

  const deleteCollection = (collection: Collection) => {
    const count = catalog.products.filter((product) => product.category === collection.name).length;
    if (count) {
      setNotice({
        title: "Category still contains products",
        message: `Move the ${count} assigned product${count === 1 ? "" : "s"} before deleting this category.`,
        tone: "error",
      });
      return;
    }
    setDeleteTarget({ kind: "collection", collection });
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      if (deleteTarget.kind === "product") {
        await catalog.removeProduct(deleteTarget.product.id);
        setNotice({
          title: "Product deleted",
          message: `${deleteTarget.product.name} was removed from the catalog.`,
        });
      } else {
        await catalog.removeCollection(deleteTarget.collection.slug);
        setNotice({
          title: "Category deleted",
          message: `${deleteTarget.collection.name} was removed from the storefront.`,
        });
      }
      setDeleteTarget(null);
    } catch (error) {
      setNotice({
        title: "Delete unsuccessful",
        message: adminOperationError(
          error,
          "The record was not deleted. Check its assignments and try again.",
        ),
        tone: "error",
      });
    }
  };

  const saveProduct = async (product: Product) => {
    const editing = editor?.kind === "product" && Boolean(editor.product);
    try {
      await catalog.saveProduct(product);
      setEditor(null);
      setNotice({
        title: editing ? "Product updated" : "Product added",
        message: `${product.name} is now saved in your catalog.`,
      });
    } catch (error) {
      setNotice({
        title: "Product not saved",
        message: adminOperationError(
          error,
          "The product could not be saved. Review its required fields and try again.",
        ),
        tone: "error",
      });
    }
  };

  const saveCollection = async (
    collection: Collection,
    previous: string | undefined,
    productIds: number[],
  ) => {
    const editing = editor?.kind === "collection" && Boolean(editor.collection);
    try {
      await catalog.saveCollection(collection, previous, productIds);
      setEditor(null);
      setNotice({
        title: editing ? "Category updated" : "Category added",
        message: `${collection.name} and its product assignments were saved.`,
      });
    } catch (error) {
      setNotice({
        title: "Category not saved",
        message: adminOperationError(
          error,
          "The category could not be saved. Review its details and try again.",
        ),
        tone: "error",
      });
    }
  };

  const publishStorefront = async (value: typeof catalog.merchandising) => {
    if (publishingStorefront) return;
    setPublishingStorefront(true);
    setSaved(false);
    try {
      await catalog.updateMerchandising(value);
      setSaved(true);
      window.setTimeout(() => setSaved(false), 2500);
      setNotice({
        title: "Storefront published",
        message: "The homepage hero was updated.",
      });
    } catch (error) {
      setNotice({
        title: "Storefront not published",
        message: adminOperationError(
          error,
          "The storefront changes could not be saved. Review the images and try again.",
        ),
        tone: "error",
      });
    } finally {
      setPublishingStorefront(false);
    }
  };

  return (
    <>
      <header className="sticky top-0 z-20 flex min-h-20 min-w-0 items-center justify-between gap-5 border-b border-slate-200 bg-white/95 px-8 py-4 backdrop-blur max-sm:px-5 [&_h1]:text-2xl [&_h1]:font-semibold [&_h1]:tracking-tight">
        <div>
          <h1>{tabTitles[tab]}</h1>
        </div>
        <div className="flex shrink-0 items-center">
          <a
            href="/"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Preview store (opens in a new tab)"
            title="Preview store"
            className="inline-flex size-10 items-center justify-center rounded-full border border-slate-300 text-[#08788c] transition hover:border-[#0e96aa] hover:bg-[#e6f5f6] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#08788c]"
          >
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="size-5"
            >
              <path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z" />
              <circle cx="12" cy="12" r="2.75" />
            </svg>
          </a>
        </div>
      </header>
      <nav
        className="hidden gap-2 overflow-x-auto border-b border-slate-200 bg-white px-4 py-2 max-lg:flex max-lg:justify-between"
        aria-label="Admin sections"
      >
        {mobileTabs.map((item) => (
          <Link
            className={`min-w-max flex-1 rounded-lg px-3 py-2 text-center text-sm font-semibold capitalize whitespace-nowrap transition ${tab === item ? "bg-[#e6f5f6] text-[#076d7c]" : "text-slate-600 hover:bg-slate-100"}`}
            href={item === "overview" ? "/admin" : `/admin?tab=${item}`}
            aria-current={tab === item ? "page" : undefined}
            key={item}
          >
            {item === "merchandising" ? "Storefront" : item}
          </Link>
        ))}
      </nav>

      {tab === "overview" && (
        <OverviewPanel
          products={catalog.products}
          collectionCount={catalog.collections.length}
          openTab={openTab}
        />
      )}
      {tab === "inventory" && (
        <InventoryPanel
          products={visibleProducts}
          collections={catalog.collections}
          query={productQuery}
          category={categoryFilter}
          onQuery={setProductQuery}
          onCategory={setCategoryFilter}
          onAdd={() => setEditor({ kind: "product" })}
          onEdit={(product) => setEditor({ kind: "product", product })}
          onDelete={deleteProduct}
        />
      )}
      {tab === "categories" && (
        <CategoriesPanel
          collections={catalog.collections}
          products={catalog.products}
          onAdd={() => setEditor({ kind: "collection" })}
          onEdit={(collection) => setEditor({ kind: "collection", collection })}
          onDelete={deleteCollection}
        />
      )}
      {tab === "merchandising" && (
        <MerchandisingPanel
          merchandising={catalog.merchandising}
          onSave={publishStorefront}
          saved={saved}
          saving={publishingStorefront}
        />
      )}
      {tab === "orders" && <OrdersPanel checkoutReady={checkoutReady} />}

      {editor?.kind === "product" && (
        <ProductEditor
          product={editor.product}
          collections={catalog.collections}
          onClose={() => setEditor(null)}
          onSave={saveProduct}
        />
      )}
      {editor?.kind === "collection" && (
        <CollectionEditor
          collection={editor.collection}
          products={catalog.products}
          onClose={() => setEditor(null)}
          onSave={saveCollection}
        />
      )}
      {deleteTarget && (
        <ConfirmationDialog
          title={`Delete ${
            deleteTarget.kind === "product"
              ? deleteTarget.product.name
              : deleteTarget.collection.name
          }?`}
          message="This removes the item from the storefront and cannot be undone."
          confirmLabel="Delete"
          onConfirm={confirmDelete}
          onClose={() => setDeleteTarget(null)}
        />
      )}
      {notice && <OperationNotice notice={notice} onClose={() => setNotice(null)} />}
    </>
  );
}
