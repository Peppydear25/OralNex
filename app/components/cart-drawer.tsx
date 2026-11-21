"use client";

import { useEffect, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { useCatalog } from "../data/catalog-store";
import { useCart } from "../data/cart-store";
import { getLinePricing } from "../lib/pricing";
import { selectionEntries } from "../lib/product-options";

export function CartDrawer() {
  const cart = useCart();
  const { open, closeCart } = cart;
  const popoverRef = useRef<HTMLElement>(null);
  const { products, catalogLoading, catalogError } = useCatalog();
  const rows = cart.items
    .map((item) => ({ item, product: products.find((product) => product.id === item.productId) }))
    .filter((row) => Boolean(row.product));
  const subtotal = rows.reduce(
    (total, row) =>
      total + (row.product ? getLinePricing(row.product, row.item.quantity).total : 0),
    0,
  );

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (event.target instanceof Element && event.target.closest("[data-cart-trigger]")) return;
      if (!popoverRef.current?.contains(event.target as Node)) closeCart();
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeCart();
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open, closeCart]);

  if (!cart.open) return null;
  return (
    <aside
      ref={popoverRef}
      className="fixed right-4 top-24 z-[120] flex max-h-[min(70vh,32rem)] w-[min(23rem,calc(100vw-2rem))] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_18px_55px_rgba(15,45,55,.2)] sm:right-6 sm:top-32"
      role="dialog"
      aria-label="Cart preview"
    >
      <header className="flex items-center justify-between gap-3 border-b border-slate-200 px-4 py-3">
        <h2 className="text-sm font-semibold text-[#172d36]">Your cart ({cart.itemCount})</h2>
        <button
          type="button"
          className="grid size-9 shrink-0 place-items-center rounded-full text-xl text-slate-600 hover:bg-slate-100"
          onClick={cart.closeCart}
          aria-label="Close cart preview"
        >
          ×
        </button>
      </header>
      <div className="min-h-0 overflow-y-auto px-4 py-2">
        {catalogLoading || catalogError ? (
          <p role="status" className="py-7 text-center text-sm text-slate-600">
            {catalogLoading ? "Loading your cart…" : "Cart details are temporarily unavailable."}
          </p>
        ) : rows.length ? (
          <ul className="divide-y divide-slate-100">
            {rows.map(({ item, product }) =>
              product ? (
                <li
                  className="flex min-w-0 gap-3 py-3"
                  key={`${product.id}-${item.size ?? ""}-${item.color ?? ""}-${JSON.stringify(item.options ?? {})}`}
                >
                  <Link
                    className="relative size-16 shrink-0 overflow-hidden rounded-lg bg-slate-50"
                    href={`/products/${product.slug}`}
                    onClick={cart.closeCart}
                    aria-label={`View ${product.name}`}
                  >
                    <Image src={product.image} alt="" fill sizes="64px" className="object-cover" />
                  </Link>
                  <div className="min-w-0 flex-1">
                    <p className="line-clamp-2 text-sm font-semibold text-[#172d36]">
                      {product.name}
                    </p>
                    {(item.size || item.color || selectionEntries(item.options).length > 0) && (
                      <p className="mt-1 truncate text-xs text-slate-500">
                        {[
                          item.size,
                          item.color,
                          ...selectionEntries(item.options).map(
                            ([name, value]) => `${name}: ${value}`,
                          ),
                        ]
                          .filter(Boolean)
                          .join(" · ")}
                      </p>
                    )}
                    <p className="mt-1 text-xs text-slate-600">
                      Qty: {item.quantity} {product.packaging ? "boxes" : "items"}
                    </p>
                  </div>
                  <strong className="shrink-0 text-sm text-[#08788c]">
                    ${getLinePricing(product, item.quantity).total.toFixed(2)}
                  </strong>
                </li>
              ) : null,
            )}
          </ul>
        ) : (
          <p className="py-7 text-center text-sm text-slate-600">Your cart is empty.</p>
        )}
      </div>
      <footer className="border-t border-slate-200 px-4 py-4">
        {!catalogLoading && !catalogError && rows.length > 0 && (
          <p className="mb-3 flex items-center justify-between text-sm font-semibold text-[#172d36]">
            <span>Subtotal</span>
            <span>${subtotal.toFixed(2)}</span>
          </p>
        )}
        <Link
          className="flex min-h-11 items-center justify-center rounded-lg bg-[#08788c] px-4 text-sm font-semibold text-white no-underline hover:bg-[#066475]"
          href={cart.itemCount ? "/cart" : "/shop"}
          onClick={cart.closeCart}
        >
          {cart.itemCount ? "View cart" : "Shop products"}
        </Link>
        <button
          type="button"
          className="mt-2 min-h-10 w-full text-sm font-medium text-[#08788c] hover:underline"
          onClick={cart.closeCart}
        >
          Continue shopping
        </button>
      </footer>
    </aside>
  );
}
