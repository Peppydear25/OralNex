"use client";

import Image from "next/image";
import type { Collection, Product } from "../../data/catalog";
import { money } from "./utils";

type Props = {
  products: Product[];
  collections: Collection[];
  query: string;
  category: string;
  onQuery: (value: string) => void;
  onCategory: (value: string) => void;
  onAdd: () => void;
  onEdit: (product: Product) => void;
  onDelete: (product: Product) => void;
};

export function InventoryPanel({
  products,
  collections,
  query,
  category,
  onQuery,
  onCategory,
  onAdd,
  onEdit,
  onDelete,
}: Props) {
  const statusStyle = (product: Product) =>
    product.status === "draft"
      ? "bg-slate-100 text-slate-600"
      : !product.stock
        ? "bg-red-50 text-red-700"
        : (product.inventory ?? 0) < 10
          ? "bg-amber-50 text-amber-700"
          : "bg-emerald-50 text-emerald-700";
  return (
    <div className="mx-auto w-full max-w-[1440px] px-8 py-6 max-sm:px-4 max-sm:py-5">
      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <div className="flex items-center gap-3 border-b border-slate-200 p-4 max-sm:grid max-sm:grid-cols-[minmax(0,1fr)_auto] [&>select]:h-10 [&>select]:rounded-lg [&>select]:border [&>select]:border-slate-300 [&>select]:px-3">
          <div className="relative w-full max-w-sm flex-1 max-sm:col-span-2 max-sm:max-w-none [&_svg]:absolute [&_svg]:left-3 [&_svg]:top-1/2 [&_svg]:-translate-y-1/2 [&_input]:h-10 [&_input]:w-full [&_input]:rounded-lg [&_input]:border [&_input]:border-slate-300 [&_input]:pl-9 [&_input]:pr-3">
            <svg
              aria-hidden="true"
              className="size-4 text-slate-500"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="11" cy="11" r="7" />
              <path d="m20 20-4-4" />
            </svg>
            <input
              value={query}
              onChange={(event) => onQuery(event.target.value)}
              placeholder="Search by product or SKU"
              aria-label="Search inventory"
            />
          </div>
          <select
            value={category}
            onChange={(event) => onCategory(event.target.value)}
            aria-label="Filter by category"
          >
            <option value="all">All categories</option>
            {collections.map((item) => (
              <option key={item.slug}>{item.name}</option>
            ))}
          </select>
          <button
            className="ml-auto min-h-10 shrink-0 rounded-lg bg-[#08788c] px-4 text-sm font-semibold text-white transition hover:bg-[#07697a] max-sm:ml-0"
            type="button"
            onClick={onAdd}
          >
            Add product
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm [&_th]:bg-slate-50 [&_th]:px-4 [&_th]:py-3 [&_th]:text-left [&_th]:text-xs [&_th]:uppercase [&_th]:tracking-wider [&_th]:text-slate-500 [&_td]:whitespace-nowrap [&_td]:border-t [&_td]:border-slate-100 [&_td]:px-4 [&_td]:py-2.5">
            <thead>
              <tr>
                <th>Product</th>
                <th>Category</th>
                <th>Price</th>
                <th>Inventory</th>
                <th>Status</th>
                <th>
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {products.map((product) => (
                <tr key={product.id}>
                  <td>
                    <div className="flex min-w-[230px] items-center gap-3 [&_p]:flex [&_p]:flex-col [&_strong]:text-sm [&_small]:text-xs [&_small]:text-slate-500">
                      <span className="grid size-10 shrink-0 place-items-center overflow-hidden rounded-lg bg-slate-50 [&_img]:h-full [&_img]:w-full [&_img]:object-cover">
                        <Image src={product.image} alt="" width={50} height={50} />
                      </span>
                      <p>
                        <strong>{product.name}</strong>
                        <small>{product.sku}</small>
                      </p>
                    </div>
                  </td>
                  <td>{product.category}</td>
                  <td>
                    <strong>{money(product.price)}</strong>
                    {product.oldPrice && (
                      <small className="block text-xs text-slate-400 line-through">
                        {money(product.oldPrice)}
                      </small>
                    )}
                  </td>
                  <td>
                    <strong>{product.inventory ?? 0}</strong> boxes
                  </td>
                  <td>
                    <span
                      className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${statusStyle(product)}`}
                    >
                      {product.status === "draft"
                        ? "Draft"
                        : !product.stock
                          ? "Out of stock"
                          : (product.inventory ?? 0) < 10
                            ? "Low stock"
                            : "Active"}
                    </span>
                  </td>
                  <td>
                    <div className="flex justify-end gap-2 [&_button]:rounded-md [&_button]:border [&_button]:border-slate-300 [&_button]:px-3 [&_button]:py-1.5 [&_button]:text-xs">
                      <button type="button" onClick={() => onEdit(product)}>
                        Edit
                      </button>
                      <button
                        type="button"
                        className="text-red-600!"
                        onClick={() => onDelete(product)}
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {products.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-12! text-center! text-sm text-slate-500">
                    {query || category !== "all" ? "No matching products." : "No products yet."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
