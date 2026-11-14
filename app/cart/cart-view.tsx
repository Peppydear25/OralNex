"use client";

import Image from "next/image";
import Link from "next/link";
import { useCart } from "../data/cart-store";
import { useCatalog } from "../data/catalog-store";
import { getLinePricing } from "../lib/pricing";
import { productUnits } from "../lib/packaging";
import { getSelectionInventory, selectionEntries } from "../lib/product-options";

export function CartView() {
  const cart = useCart();
  const { products } = useCatalog();
  const rows = cart.items.flatMap((item) => {
    const product = products.find(({ id }) => id === item.productId);
    return product ? [{ item, product }] : [];
  });
  const subtotal = rows.reduce(
    (sum, { item, product }) => sum + getLinePricing(product, item.quantity).total,
    0,
  );
  const savings = rows.reduce(
    (sum, { item, product }) => sum + getLinePricing(product, item.quantity).savings,
    0,
  );

  if (!rows.length) {
    return (
      <main className="mx-auto grid min-h-[62vh] max-w-xl place-content-center px-5 text-center">
        <span
          className="mx-auto grid size-20 place-items-center rounded-3xl bg-[#e8f6f7] text-3xl text-[#08788c]"
          aria-hidden="true"
        >
          □
        </span>
        <h1 className="mt-6 text-4xl font-semibold">Your cart is empty</h1>
        <p className="mt-3 text-slate-500">Choose the gloves or masks needed for your order.</p>
        <Link
          className="mx-auto mt-7 rounded-xl bg-[#0a8d99] px-6 py-3.5 font-bold text-white"
          href="/shop"
        >
          Shop equipment
        </Link>
      </main>
    );
  }

  return (
    <main className="min-w-0 bg-white px-6 py-14 max-sm:px-4 max-sm:py-6">
      <div className="mx-auto w-full max-w-[1280px]">
        <header className="mb-10 text-center max-sm:mb-0">
          <h1 className="text-4xl font-medium tracking-tight text-[#172b3a] max-sm:sr-only">
            Your cart
          </h1>
          <Link
            className="mt-3 inline-block text-sm text-[#08788c] underline underline-offset-4 hover:text-[#065f70] max-sm:hidden"
            href="/shop"
          >
            Continue shopping
          </Link>
        </header>

        <section aria-label="Cart items">
          <div className="grid grid-cols-[minmax(0,1fr)_120px_150px_120px] gap-6 border-b border-slate-200 py-4 text-xs font-medium uppercase tracking-wide text-slate-600 max-md:hidden">
            <span>Product</span>
            <span>Price</span>
            <span className="text-center">Quantity</span>
            <span className="text-right">Total</span>
          </div>
          <div className="hidden grid-cols-[minmax(0,1fr)_auto] border-b border-slate-200 py-4 text-xs font-medium uppercase tracking-wide text-slate-600 max-md:grid">
            <span>Product</span>
            <span>Price</span>
          </div>
          {rows.map(({ item, product }) => {
            const pricing = getLinePricing(product, item.quantity);
            const availableInventory = getSelectionInventory(product, item.options);
            return (
              <article
                className="grid min-w-0 grid-cols-[minmax(0,1fr)_120px_150px_120px] items-center gap-6 border-b border-slate-200 py-6 max-md:grid-cols-[minmax(0,1fr)_132px] max-md:items-start max-md:gap-x-3 max-md:gap-y-3"
                key={`${product.id}-${item.size ?? ""}-${item.color ?? ""}-${JSON.stringify(item.options ?? {})}`}
              >
                <div className="flex min-w-0 items-start gap-5 max-md:col-start-1 max-md:row-span-2 max-md:row-start-1 max-sm:gap-3 max-[360px]:col-span-2 max-[360px]:row-span-1">
                  <Link
                    className="relative block size-24 shrink-0 overflow-hidden bg-slate-50 max-md:size-16 max-[360px]:size-14"
                    href={`/products/${product.slug}`}
                  >
                    <Image
                      className="object-contain"
                      src={product.image}
                      alt={product.name}
                      fill
                      sizes="(max-width: 768px) 64px, 96px"
                    />
                  </Link>
                  <div className="min-w-0">
                    <h2 className="font-medium text-[#172b3a]">
                      <Link
                        className="underline-offset-4 hover:underline"
                        href={`/products/${product.slug}`}
                      >
                        {product.name}
                      </Link>
                    </h2>
                    {product.packaging && (
                      <p className="mt-1 text-xs text-slate-500">
                        {product.packaging.piecesPerBox.toLocaleString()} pieces per box
                      </p>
                    )}
                    {(item.size || item.color || selectionEntries(item.options).length > 0) && (
                      <p className="mt-1 text-sm text-slate-600">
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
                    <button
                      className="mt-2 text-sm text-[#08788c] underline underline-offset-4 hover:text-red-600"
                      type="button"
                      onClick={() => cart.remove(product.id, item)}
                    >
                      Remove
                    </button>
                  </div>
                </div>
                <div className="text-sm text-slate-700 max-md:hidden">
                  ${pricing.unitPrice.toFixed(2)}
                </div>
                <div className="flex justify-center max-md:col-start-2 max-md:row-start-2 max-md:flex-col max-md:items-end max-md:gap-1">
                  <span className="hidden text-xs text-slate-500 max-md:block">Qty</span>
                  <div className="flex w-fit items-center overflow-hidden rounded-md border border-slate-300 [&_button]:size-9 [&_button]:text-lg [&_button:disabled]:opacity-40 [&_output]:grid [&_output]:w-9 [&_output]:place-items-center [&_output]:text-sm max-md:[&_button]:size-11 max-md:[&_output]:w-11">
                    <button
                      type="button"
                      onClick={() => cart.setQuantity(product.id, item.quantity - 1, item)}
                      aria-label={`Decrease ${product.name} box quantity`}
                    >
                      −
                    </button>
                    <output
                      aria-label={`Quantity: ${item.quantity} ${productUnits(product, item.quantity)}`}
                    >
                      {item.quantity}
                    </output>
                    <button
                      type="button"
                      disabled={item.quantity >= availableInventory}
                      onClick={() => cart.setQuantity(product.id, item.quantity + 1, item)}
                      aria-label={`Increase ${product.name} box quantity`}
                    >
                      +
                    </button>
                  </div>
                </div>
                <div className="text-right text-sm font-medium text-[#172b3a] max-md:col-start-2 max-md:row-start-1 max-[360px]:col-start-1 max-[360px]:row-start-2 max-[360px]:text-left">
                  ${pricing.total.toFixed(2)}
                  {pricing.tier && (
                    <small className="block text-xs font-normal text-emerald-700">
                      {pricing.tier.discountPercent}% volume savings
                    </small>
                  )}
                </div>
              </article>
            );
          })}
        </section>

        <div className="mt-10 flex justify-end max-sm:mt-10 max-sm:justify-center">
          <div className="w-full max-w-sm text-right max-md:max-w-none">
            <div className="flex items-center justify-between gap-6 text-lg text-[#172b3a] max-sm:justify-center max-sm:gap-5">
              <span>Subtotal</span>
              <strong className="font-semibold">${subtotal.toFixed(2)} USD</strong>
            </div>
            {savings > 0 && (
              <p className="mt-1 text-sm text-emerald-700 max-md:text-left">
                ${savings.toFixed(2)} volume savings included
              </p>
            )}
            <p className="mt-2 text-sm text-slate-600 max-md:text-left max-sm:text-center">
              Taxes and shipping calculated at checkout.
            </p>
            <Link
              className="mt-7 inline-flex min-h-11 items-center justify-center rounded-full bg-[#08788c] px-7 text-sm font-semibold text-white no-underline hover:bg-[#066b7b] max-md:w-full max-sm:mx-auto max-sm:min-h-12 max-sm:max-w-[350px]"
              href="/checkout"
            >
              Check out
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
