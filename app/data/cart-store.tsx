"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { readStoredJson, writeStoredJson } from "../lib/browser-storage";
import { useCatalog } from "./catalog-store";

export type CartSelection = { size?: string; color?: string; options?: Record<string, string> };
export type CartItem = CartSelection & { productId: number; quantity: number };
type CartContextValue = {
  items: CartItem[];
  itemCount: number;
  hydrated: boolean;
  open: boolean;
  add: (
    productId: number,
    quantity?: number,
    showCart?: boolean,
    selection?: CartSelection,
  ) => void;
  remove: (productId: number, selection?: CartSelection) => void;
  setQuantity: (productId: number, quantity: number, selection?: CartSelection) => void;
  clear: () => void;
  removePurchased: (items: CartItem[]) => void;
  openCart: () => void;
  closeCart: () => void;
};

const CartContext = createContext<CartContextValue | null>(null);
const STORAGE_KEY = "otm-cart-v2";
const MAX_ITEM_QUANTITY = 999;

function validateItems(value: unknown): CartItem[] | null {
  if (!Array.isArray(value)) return null;

  return value
    .filter(
      (item): item is CartItem =>
        Boolean(item) &&
        typeof item === "object" &&
        Number.isInteger((item as CartItem).productId) &&
        Number.isInteger((item as CartItem).quantity) &&
        (item as CartItem).productId > 0 &&
        (item as CartItem).quantity > 0,
    )
    .map((item) => ({
      productId: item.productId,
      quantity: Math.min(item.quantity, MAX_ITEM_QUANTITY),
      size: typeof item.size === "string" ? item.size.slice(0, 40) : undefined,
      color: typeof item.color === "string" ? item.color.slice(0, 40) : undefined,
      options:
        item.options && typeof item.options === "object" && !Array.isArray(item.options)
          ? Object.fromEntries(
              Object.entries(item.options).filter(
                ([key, value]) =>
                  key.length <= 40 && typeof value === "string" && value.length <= 40,
              ),
            )
          : undefined,
    }));
}

function matchesSelection(item: CartItem, productId: number, selection?: CartSelection) {
  return (
    item.productId === productId &&
    (item.size ?? "") === (selection?.size ?? "") &&
    (item.color ?? "") === (selection?.color ?? "") &&
    JSON.stringify(item.options ?? {}) === JSON.stringify(selection?.options ?? {})
  );
}

export function subtractPurchasedItems(current: CartItem[], purchased: CartItem[]): CartItem[] {
  return current.flatMap((item) => {
    const bought = purchased
      .filter((entry) => matchesSelection(item, entry.productId, entry))
      .reduce((total, entry) => total + entry.quantity, 0);
    const remaining = item.quantity - bought;
    return remaining > 0 ? [{ ...item, quantity: remaining }] : [];
  });
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const { products } = useCatalog();
  const [items, setItems] = useState<CartItem[]>([]);
  const [open, setOpen] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    const saved = readStoredJson(STORAGE_KEY, validateItems, []);
    queueMicrotask(() => {
      setItems(saved);
      setHydrated(true);
    });
  }, []);
  useEffect(() => {
    if (hydrated) writeStoredJson(STORAGE_KEY, items);
  }, [hydrated, items]);
  useEffect(() => {
    if (!hydrated) return;
    const availableIds = new Set(
      products.filter((product) => product.status !== "draft").map((product) => product.id),
    );
    queueMicrotask(() =>
      setItems((current) => {
        const valid = current.filter((item) => availableIds.has(item.productId));
        return valid.length === current.length ? current : valid;
      }),
    );
  }, [hydrated, products]);
  const clear = useCallback(() => setItems((current) => (current.length ? [] : current)), []);
  const removePurchased = useCallback(
    (purchased: CartItem[]) => setItems((current) => subtractPurchasedItems(current, purchased)),
    [],
  );
  const openCart = useCallback(() => setOpen(true), []);
  const closeCart = useCallback(() => setOpen(false), []);
  const value = useMemo<CartContextValue>(
    () => ({
      items,
      itemCount: items.reduce((total, item) => total + item.quantity, 0),
      hydrated,
      open,
      add: (productId, quantity = 1, showCart = true, selection) => {
        setItems((current) =>
          current.some((item) => matchesSelection(item, productId, selection))
            ? current.map((item) =>
                matchesSelection(item, productId, selection)
                  ? {
                      ...item,
                      quantity: Math.min(MAX_ITEM_QUANTITY, item.quantity + quantity),
                    }
                  : item,
              )
            : [
                ...current,
                {
                  productId,
                  quantity: Math.min(MAX_ITEM_QUANTITY, Math.max(1, quantity)),
                  ...selection,
                },
              ],
        );
        if (showCart) setOpen(true);
      },
      remove: (productId, selection) =>
        setItems((current) =>
          current.filter((item) => !matchesSelection(item, productId, selection)),
        ),
      setQuantity: (productId, quantity, selection) =>
        setItems((current) =>
          quantity < 1
            ? current.filter((item) => !matchesSelection(item, productId, selection))
            : current.map((item) =>
                matchesSelection(item, productId, selection)
                  ? { ...item, quantity: Math.min(MAX_ITEM_QUANTITY, quantity) }
                  : item,
              ),
        ),
      clear,
      removePurchased,
      openCart,
      closeCart,
    }),
    [clear, closeCart, hydrated, items, open, openCart, removePurchased],
  );
  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const value = useContext(CartContext);
  if (!value) {
    throw new Error("useCart must be used within CartProvider");
  }
  return value;
}
