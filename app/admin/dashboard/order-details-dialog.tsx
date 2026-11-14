"use client";

import { createPortal } from "react-dom";
import { formatAddressText } from "../../checkout/format-address-text";
import type { StoreOrder } from "../../data/supabase-orders";
import { useOverlayBehavior } from "../../hooks/use-overlay-behavior";

export const orderStatusStyle: Record<StoreOrder["status"], string> = {
  pending: "bg-slate-100 text-slate-700",
  paid: "bg-cyan-50 text-cyan-800",
  processing: "bg-cyan-50 text-cyan-800",
  packed: "bg-cyan-50 text-cyan-800",
  shipped: "bg-cyan-50 text-cyan-800",
  delivered: "bg-cyan-50 text-cyan-800",
  cancelled: "bg-red-50 text-red-700",
  refunded: "bg-slate-100 text-slate-700",
};

export function paymentStatusLabel(status: StoreOrder["status"]) {
  if (["paid", "processing", "packed", "shipped", "delivered"].includes(status)) return "Paid";
  if (status === "pending") return "Pending";
  if (status === "refunded") return "Refunded";
  return "Cancelled";
}

export function OrderPaymentStatus({ status }: { status: StoreOrder["status"] }) {
  const label = paymentStatusLabel(status);
  if (label === "Paid")
    return (
      <span
        className="grid size-8 place-items-center rounded-full bg-[#e9f7f8] text-[#08788c]"
        role="status"
        title="Paid"
      >
        <svg
          aria-hidden="true"
          className="size-4"
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2.5"
          viewBox="0 0 24 24"
        >
          <path d="m5 12 4 4L19 6" />
        </svg>
        <span className="sr-only">Paid</span>
      </span>
    );
  return (
    <span className={`rounded-full px-3 py-1 text-xs font-bold ${orderStatusStyle[status]}`}>
      {label}
    </span>
  );
}

export function OrderDetailsDialog({ order, onClose }: { order: StoreOrder; onClose: () => void }) {
  useOverlayBehavior(true, onClose);
  const address = order.shippingAddress;
  const locality = [
    formatAddressText(address.city),
    [address.state, address.postalCode].filter(Boolean).join(" "),
  ]
    .filter(Boolean)
    .join(", ");
  const displayAddress = [
    address.name || order.recipientName,
    address.company,
    formatAddressText(address.line1),
    formatAddressText(address.line2),
    locality,
    address.country !== "US" ? address.country : null,
  ]
    .filter(Boolean)
    .join(" · ");
  return createPortal(
    <div
      className="fixed inset-0 z-[120] grid place-items-center overflow-y-auto bg-slate-950/60 p-3 backdrop-blur-[2px] sm:p-6"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        className="m-auto flex w-full max-w-[640px] flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="order-dialog-title"
      >
        <header className="flex items-start justify-between gap-3 border-b border-slate-200 px-5 py-4 sm:px-6">
          <div className="min-w-0">
            <h2
              id="order-dialog-title"
              className="break-all text-lg font-semibold leading-tight text-[#19313b]"
            >
              {order.orderNumber}
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              Placed{" "}
              {new Intl.DateTimeFormat("en-US", { dateStyle: "medium" }).format(
                new Date(order.createdAt),
              )}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <OrderPaymentStatus status={order.status} />
            <button
              type="button"
              onClick={onClose}
              aria-label="Close order details"
              className="grid size-8 place-items-center rounded-full border border-slate-200 text-lg leading-none text-slate-600 hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#08788c] disabled:opacity-50"
            >
              ×
            </button>
          </div>
        </header>
        <div className="grid max-h-[calc(100dvh-8rem)] gap-5 overflow-y-auto px-5 py-4 text-sm sm:px-6 sm:py-5">
          <section className="min-w-0">
            <h3 className="mb-2 font-semibold text-[#19313b]">Items</h3>
            <div className="grid">
              {order.items.map((item) => (
                <div
                  className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] gap-3 border-b border-slate-100 py-2 first:pt-0 last:border-0 last:pb-0"
                  key={item.id}
                >
                  <div className="min-w-0">
                    <p className="font-semibold [overflow-wrap:anywhere]">{item.productName}</p>
                    <p className="mt-0.5 text-xs text-slate-500">
                      SKU {item.sku}
                      {Object.keys(item.selectedOptions).length > 0 && (
                        <>
                          {" · "}
                          {Object.entries(item.selectedOptions)
                            .map(([name, value]) => `${name}: ${value}`)
                            .join(" · ")}
                        </>
                      )}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">${(item.quantity * item.unitPrice).toFixed(2)}</p>
                    <p className="mt-0.5 text-xs text-slate-500">
                      {item.quantity} × ${item.unitPrice.toFixed(2)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-3 grid gap-1.5 border-t border-slate-200 pt-3 text-slate-600">
              <p className="flex justify-between gap-3">
                <span>Subtotal</span>
                <span>${order.subtotal.toFixed(2)}</span>
              </p>
              <p className="flex justify-between gap-3">
                <span>Shipping</span>
                <span>${order.shipping.toFixed(2)}</span>
              </p>
              <p className="flex justify-between gap-3">
                <span>Tax</span>
                <span>${order.tax.toFixed(2)}</span>
              </p>
              <p className="mt-1 flex justify-between gap-3 border-t border-slate-200 pt-2.5 text-base font-bold text-[#19313b]">
                <span>Order total</span>
                <span>${order.total.toFixed(2)}</span>
              </p>
            </div>
          </section>
          <section className="min-w-0 border-t border-slate-200 pt-3">
            <h3 className="mb-1 font-semibold text-[#19313b]">Delivery address</h3>
            <address
              className="overflow-x-auto whitespace-nowrap text-slate-600"
              title={displayAddress}
            >
              {displayAddress || "Address unavailable"}
            </address>
            {address.shippingMethod && (
              <p className="mt-2 text-xs text-slate-600">
                <span className="font-semibold text-[#19313b]">Shipping method:</span>{" "}
                {address.shippingMethod}
              </p>
            )}
            {(address.phone || order.customerEmail) && (
              <p className="mt-2 break-all text-xs leading-5 text-slate-500">
                {address.phone && `Phone: ${address.phone}`}
                {address.phone && order.customerEmail && " · "}
                {order.customerEmail && `Email: ${order.customerEmail}`}
              </p>
            )}
          </section>
        </div>
      </section>
    </div>,
    document.body,
  );
}
