import type { BuyerOrder } from "./buyer-data";
import { buyerPaymentLabel, buyerPaymentStatus } from "./payment-status";

export const statusStyle: Record<BuyerOrder["status"], string> = {
  pending: "bg-slate-100 text-slate-700",
  paid: "bg-cyan-50 text-cyan-800",
  processing: "bg-amber-50 text-amber-700",
  packed: "bg-violet-50 text-violet-700",
  shipped: "bg-blue-50 text-blue-700",
  delivered: "bg-emerald-50 text-emerald-700",
  cancelled: "bg-red-50 text-red-700",
  refunded: "bg-slate-100 text-slate-700",
};

export function OrderCard({ order }: { order: BuyerOrder }) {
  const placed = new Intl.DateTimeFormat("en-US", { dateStyle: "medium" }).format(
    new Date(order.createdAt),
  );
  return (
    <article className="min-w-0 rounded-xl border border-slate-200 bg-white p-5 sm:p-6">
      <header className="flex min-w-0 flex-wrap items-start justify-between gap-x-4 gap-y-2">
        <div className="min-w-0">
          <h2 className="break-all text-sm font-semibold text-slate-900">{order.orderNumber}</h2>
          <p className="mt-1 text-xs text-slate-500">{placed}</p>
        </div>
        <span
          className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${statusStyle[buyerPaymentStatus(order.status)]}`}
        >
          {buyerPaymentLabel(order.status)}
        </span>
      </header>
      <div className="mt-4 flex min-w-0 items-end justify-between gap-4 border-t border-slate-100 pt-4 max-sm:items-start">
        <div className="min-w-0 text-sm text-slate-700">
          {order.items.map((item, index) => (
            <p className="break-words" key={`${item.productName}-${index}`}>
              {item.productName} <span className="text-slate-500">× {item.quantity}</span>
            </p>
          ))}
        </div>
        <p className="shrink-0 text-sm font-semibold text-slate-900">
          <span className="sr-only">Total: </span>${order.total.toFixed(2)}
        </p>
      </div>
    </article>
  );
}
