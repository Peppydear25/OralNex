"use client";

import type { Product } from "../../data/catalog";
import { Metric, PanelHead } from "./shared";
import { getStockAlerts } from "./stock-alerts";
import type { AdminTab } from "./types";

type Props = {
  products: Product[];
  collectionCount: number;
  openTab: (tab: AdminTab) => void;
};

export function OverviewPanel({ products, collectionCount, openTab }: Props) {
  const boxesInStock = products.reduce((total, product) => total + (product.inventory ?? 0), 0);
  const stockAlerts = getStockAlerts(products);
  const activeProducts = products.filter((product) => product.status !== "draft").length;
  return (
    <div className="mx-auto grid w-full max-w-[1440px] gap-5 px-8 py-6 max-sm:px-4 max-sm:py-5">
      <section className="grid grid-cols-4 gap-4 max-xl:grid-cols-2">
        <Metric label="Active products" value={String(activeProducts)} />
        <Metric label="Boxes in stock" value={boxesInStock.toLocaleString()} />
        <Metric
          label="Low-stock options"
          value={String(stockAlerts.length)}
          tone={stockAlerts.length ? "warning" : undefined}
        />
        <Metric label="Categories" value={String(collectionCount)} />
      </section>
      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <PanelHead title="Stock alerts" description="Fewer than 10 boxes">
          <button type="button" onClick={() => openTab("inventory")}>
            Manage inventory
          </button>
        </PanelHead>
        <div className="grid gap-0">
          {stockAlerts.length ? (
            stockAlerts.map(({ product, variant, available }) => (
              <div
                className="flex items-center justify-between gap-4 border-t border-slate-100 px-5 py-3 max-sm:items-start"
                key={`${product.id}:${variant?.id ?? "product"}`}
              >
                <p className="min-w-0 text-sm">
                  <strong className="block font-semibold">{product.name}</strong>
                  <small className="block text-xs text-slate-500">
                    {variant &&
                      `${Object.entries(variant.options)
                        .map(([name, value]) => `${name}: ${value}`)
                        .join(" · ")} · `}
                    {variant?.sku ?? product.sku}
                  </small>
                </p>
                <b
                  className={`shrink-0 text-sm ${available === 0 ? "text-red-700" : "text-amber-700"}`}
                >
                  {available} {available === 1 ? "box" : "boxes"}
                </b>
              </div>
            ))
          ) : (
            <p className="border-t border-slate-100 p-6 text-sm text-slate-500">No stock alerts.</p>
          )}
        </div>
      </section>
    </div>
  );
}
