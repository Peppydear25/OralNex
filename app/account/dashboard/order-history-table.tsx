import type { BuyerOrder } from "./buyer-data";
import { statusStyle } from "./order-card";
import { buyerPaymentLabel, buyerPaymentStatus } from "./payment-status";

export function OrderHistoryTable({ orders }: { orders: BuyerOrder[] }) {
  return (
    <div className="overflow-x-auto bg-white max-sm:overflow-visible">
      <table className="w-full min-w-[620px] border-collapse text-left text-sm max-sm:block max-sm:min-w-0">
        <thead className="bg-slate-200 text-xs font-semibold uppercase tracking-wide text-slate-700 max-sm:sr-only">
          <tr>
            <th className="px-4 py-3" scope="col">
              Order
            </th>
            <th className="px-4 py-3" scope="col">
              Date
            </th>
            <th className="px-4 py-3" scope="col">
              Items
            </th>
            <th className="px-4 py-3 text-right" scope="col">
              Total
            </th>
            <th className="px-4 py-3" scope="col">
              Status
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200 max-sm:block">
          {orders.map((order) => (
            <tr
              className="align-top max-sm:grid max-sm:grid-cols-[minmax(0,1fr)_auto] max-sm:gap-x-3 max-sm:gap-y-2 max-sm:p-4"
              key={order.id}
            >
              <th
                className="px-4 py-4 font-semibold text-slate-900 max-sm:order-1 max-sm:min-w-0 max-sm:break-all max-sm:p-0"
                scope="row"
              >
                {order.orderNumber}
              </th>
              <td className="whitespace-nowrap px-4 py-4 text-slate-600 max-sm:order-3 max-sm:p-0 max-sm:text-xs">
                {new Intl.DateTimeFormat("en-US", { dateStyle: "medium" }).format(
                  new Date(order.createdAt),
                )}
              </td>
              <td className="max-w-[260px] px-4 py-4 text-slate-700 max-sm:order-5 max-sm:col-span-2 max-sm:max-w-none max-sm:border-t max-sm:border-slate-100 max-sm:p-0 max-sm:pt-2">
                {order.items.map((item) => `${item.productName} × ${item.quantity}`).join(", ") ||
                  "—"}
              </td>
              <td className="whitespace-nowrap px-4 py-4 text-right font-semibold text-slate-900 max-sm:order-4 max-sm:p-0">
                ${order.total.toFixed(2)}
              </td>
              <td className="px-4 py-4 max-sm:order-2 max-sm:p-0">
                <span
                  className={`inline-block rounded-full px-2.5 py-1 text-xs font-semibold ${statusStyle[buyerPaymentStatus(order.status)]}`}
                >
                  {buyerPaymentLabel(order.status)}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
