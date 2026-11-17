"use client";

import { useEffect, useState } from "react";
import type { Product } from "../../data/catalog";
import { useCart } from "../../data/cart-store";
import { getIncreasingBulkTiers, getLinePricing } from "../../lib/pricing";
import {
  getInitialOptionSelection,
  getProductOptions,
  getSelectionInventory,
  isOptionValueAvailable,
  optionSelectionKey,
} from "../../lib/product-options";

const currencyFormatter = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });

export function PurchasePanel({ product }: { product: Product }) {
  const [quantity, setQuantity] = useState(1);
  const productOptions = getProductOptions(product);
  const selectableOptions = productOptions.filter((option) => option.values.length > 1);
  const fixedOptions = productOptions.filter(
    (option) => option.values.length === 1 && option.name.trim().toLowerCase() !== "size",
  );
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string>>(() =>
    getInitialOptionSelection(product),
  );
  const [notice, setNotice] = useState<{ message: string; tone: "success" | "warning" } | null>(
    null,
  );
  useEffect(() => {
    if (!notice) return;
    const timeout = window.setTimeout(
      () => setNotice(null),
      notice.tone === "success" ? 4500 : 7000,
    );
    return () => window.clearTimeout(timeout);
  }, [notice]);
  const cart = useCart();
  const maximumQuantity = Math.min(getSelectionInventory(product, selectedOptions), 999);
  const selectionAvailable = maximumQuantity > 0;
  const pricing = getLinePricing(product, quantity);
  const volumeTiers = getIncreasingBulkTiers(product.bulkPricing);
  const nextAvailableTier = volumeTiers.find(
    (tier) => tier.minQuantity > quantity && tier.minQuantity <= maximumQuantity,
  );
  const setSafeQuantity = (value: number) =>
    setQuantity(Math.min(Math.max(1, maximumQuantity), Math.max(1, Math.floor(value) || 1)));
  const addToCart = () => {
    const selection = { options: selectedOptions };
    const selectedKey = optionSelectionKey(selectedOptions);
    const currentProductQuantity = cart.items
      .filter(
        (item) =>
          item.productId === product.id && optionSelectionKey(item.options ?? {}) === selectedKey,
      )
      .reduce((total, item) => total + item.quantity, 0);
    const quantityToAdd = Math.min(quantity, Math.max(0, maximumQuantity - currentProductQuantity));
    if (!quantityToAdd) {
      setNotice({
        message: `Your cart already contains the available quantity of ${product.name}.`,
        tone: "warning",
      });
      cart.openCart();
      return;
    }
    cart.add(product.id, quantityToAdd, true, selection);
    setNotice(null);
  };
  return (
    <div className="grid gap-6 sm:gap-7">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1" aria-live="polite">
        <strong className="text-[30px] font-semibold leading-none tracking-tight text-[#08788c] sm:text-[34px]">
          {formatPrice(pricing.unitPrice)}
        </strong>
        {product.packaging && <small className="text-sm text-slate-500">per box</small>}
        {pricing.tier ? (
          <del className="text-sm text-slate-400">{formatPrice(product.price)}</del>
        ) : (
          product.oldPrice &&
          product.oldPrice > product.price && (
            <>
              <del className="text-sm text-slate-400">{formatPrice(product.oldPrice)}</del>
              <span className="rounded-full bg-[#eaf7f8] px-2.5 py-1 text-xs font-semibold text-[#08788c]">
                Save {formatPrice(product.oldPrice - product.price)}
              </span>
            </>
          )
        )}
      </div>
      {!product.stock && (
        <p className="text-sm font-semibold text-slate-600">Currently unavailable</p>
      )}
      {(selectableOptions.length > 0 || fixedOptions.length > 0) && (
        <section className="grid gap-3.5" aria-label="Product options">
          {selectableOptions.map((option) => (
            <fieldset
              className="grid min-w-0 grid-cols-[3rem_minmax(0,1fr)] items-start gap-2"
              key={option.name}
            >
              <legend className="sr-only">{option.name}</legend>
              <span
                className="flex min-h-10 items-center text-sm font-semibold text-slate-700"
                aria-hidden="true"
              >
                {option.name}:
              </span>
              <div className="flex min-w-0 flex-wrap gap-1.5">
                {option.values.map((value) => (
                  <OptionButton
                    key={value}
                    value={value}
                    selected={selectedOptions[option.name] === value}
                    unavailable={!isOptionValueAvailable(product, option.name, value)}
                    onSelect={() => {
                      setSelectedOptions((current) => ({ ...current, [option.name]: value }));
                      setQuantity(1);
                      setNotice(null);
                    }}
                  />
                ))}
              </div>
            </fieldset>
          ))}
          {fixedOptions.length > 0 && (
            <div className="flex flex-wrap gap-2" aria-label="Product attributes">
              {fixedOptions.map((option) => (
                <span
                  className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3.5 text-sm"
                  key={option.name}
                >
                  <strong className="font-medium text-slate-500">{option.name}</strong>
                  <span className="font-semibold text-slate-800">{option.values[0]}</span>
                </span>
              ))}
            </div>
          )}
        </section>
      )}
      <div className="grid grid-cols-[minmax(7.5rem,9rem)_minmax(0,1fr)] items-center gap-3 pt-1 sm:grid-cols-[minmax(8.5rem,10rem)_minmax(0,1fr)] sm:gap-3.5">
        <div className="flex h-12 min-w-0 w-full overflow-hidden rounded-xl border border-slate-300 bg-white [&_button]:w-8 [&_button]:shrink-0 [&_button]:text-base [&_button:hover]:bg-slate-50 [&_input]:min-w-0 [&_input]:flex-1 [&_input]:border-x [&_input]:border-slate-200 [&_input]:text-center [&_input]:text-sm [&_input]:font-semibold [&_input]:outline-none sm:[&_button]:w-11 sm:[&_button]:text-lg">
          <button
            type="button"
            onClick={() => setSafeQuantity(quantity - 1)}
            aria-label="Decrease quantity"
          >
            −
          </button>
          <input
            className="quantity-input"
            type="number"
            inputMode="numeric"
            min="1"
            max={maximumQuantity}
            value={quantity}
            onChange={(event) => setSafeQuantity(Number(event.target.value))}
            aria-label="Quantity"
          />
          <button
            type="button"
            onClick={() => setSafeQuantity(quantity + 1)}
            aria-label="Increase quantity"
          >
            +
          </button>
        </div>
        <button
          className="min-h-12 min-w-0 whitespace-nowrap rounded-xl bg-[#08788c] px-4 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#066475] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#08788c] disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-600"
          type="button"
          onClick={addToCart}
          disabled={!product.stock || !selectionAvailable}
        >
          {product.stock && selectionAvailable ? "Add to cart" : "Unavailable"}
        </button>
      </div>
      {selectionAvailable && (nextAvailableTier || pricing.tier) && (
        <p className="-mt-3 text-sm leading-6 text-[#08788c] max-sm:-mt-2" aria-live="polite">
          {pricing.tier ? (
            <span className="font-medium">
              You save {pricing.tier.discountPercent}% with volume pricing
            </span>
          ) : nextAvailableTier ? (
            <span className="font-medium">
              Buy {nextAvailableTier.minQuantity}+ boxes, save {nextAvailableTier.discountPercent}%
            </span>
          ) : null}
        </p>
      )}
      {notice && (
        <div
          className={`relative overflow-hidden rounded-xl border bg-white shadow-[0_8px_24px_rgba(15,55,65,.08)] ${notice.tone === "success" ? "border-[#b8e3e5]" : "border-amber-200"}`}
          role={notice.tone === "success" ? "status" : "alert"}
        >
          <div className="flex items-center gap-3 px-4 py-3 pr-12">
            <span
              className={`grid size-8 shrink-0 place-items-center rounded-full text-sm font-bold ${notice.tone === "success" ? "bg-[#e8f6f6] text-[#08788c]" : "bg-amber-50 text-amber-700"}`}
              aria-hidden="true"
            >
              {notice.tone === "success" ? "✓" : "!"}
            </span>
            <p className="min-w-0 text-sm font-medium leading-5 text-[#172d36]">{notice.message}</p>
          </div>
          <button
            className="absolute right-1 top-1 grid size-10 place-items-center rounded-lg text-lg text-slate-500 hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#08788c]"
            type="button"
            onClick={() => setNotice(null)}
            aria-label="Dismiss cart message"
          >
            ×
          </button>
          <div className="h-0.5 bg-slate-100" aria-hidden="true">
            <div
              className={`action-result-countdown h-full w-full ${notice.tone === "success" ? "bg-[#08788c]" : "bg-amber-600"}`}
              style={{ animationDuration: notice.tone === "success" ? "4500ms" : "7000ms" }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

function formatPrice(value: number) {
  return currencyFormatter.format(value);
}

function OptionButton({
  value,
  selected,
  unavailable,
  onSelect,
}: {
  value: string;
  selected: boolean;
  unavailable: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      className={`min-h-10 rounded-lg border px-3 py-1.5 text-[13px] font-medium transition-colors duration-200 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400 ${selected ? "border-[#0a8d99] bg-[#0a8d99] text-white shadow-sm shadow-[#0a8d99]/15" : "border-slate-300 bg-white text-slate-700 hover:border-[#0a8d99]"}`}
      type="button"
      onClick={onSelect}
      disabled={unavailable}
      aria-label={unavailable ? `${value}, unavailable` : value}
      aria-pressed={selected}
    >
      {value}
    </button>
  );
}
