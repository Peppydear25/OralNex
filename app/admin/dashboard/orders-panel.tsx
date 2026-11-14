"use client";

import { useCallback, useEffect, useState } from "react";
import {
  ADMIN_ORDERS_PAGE_SIZE,
  loadAdminOrders,
  type StoreOrder,
} from "../../data/supabase-orders";
import { orderDateWindow, type OrderDateFilter } from "./order-date-filter";
import { Pagination } from "./pagination";
import { OrderDetailsDialog, OrderPaymentStatus } from "./order-details-dialog";

export function OrdersPanel({ checkoutReady }: { checkoutReady: boolean }) {
  const [orders, setOrders] = useState<StoreOrder[]>([]);
  const [total, setTotal] = useState(0);
  const [oldestYear, setOldestYear] = useState(new Date().getFullYear());
  const [page, setPage] = useState(1);
  const [refreshKey, setRefreshKey] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [failed, setFailed] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [selectedOrder, setSelectedOrder] = useState<StoreOrder | null>(null);
  const [query, setQuery] = useState("");
  const [dateRange, setDateRange] = useState<OrderDateFilter>("all");
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const availableYears = Array.from(
    { length: Math.max(1, new Date().getFullYear() - oldestYear + 1) },
    (_, index) => new Date().getFullYear() - index,
  );

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedQuery(query), 300);
    return () => window.clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    queueMicrotask(() => setPage(1));
  }, [debouncedQuery, dateRange, selectedMonth, selectedYear]);

  const clearFilters = () => {
    setQuery("");
    setDateRange("all");
  };

  const refreshOrders = () => setRefreshKey((current) => current + 1);
  const closeDetails = useCallback(() => {
    setSelectedOrder(null);
  }, []);

  useEffect(() => {
    let active = true;
    const timer = window.setTimeout(async () => {
      setLoading(true);
      setRefreshing(true);
      try {
        const result = await loadAdminOrders({
          page,
          status: "all",
          dateWindow: orderDateWindow(dateRange, new Date(), selectedYear, selectedMonth),
          sort: "newest",
          query: debouncedQuery,
        });
        if (!active) return;
        setOrders(result.orders);
        setTotal(result.total);
        setOldestYear(result.oldestYear);
        setFailed(Boolean(result.error));
        setLoadError(
          result.error?.message === "Search is too broad. Enter a more specific term."
            ? "Search is too broad. Enter a more specific term."
            : "Confirm the administrator session and network connection, then refresh.",
        );
      } catch {
        if (active) {
          setFailed(true);
          setLoadError("Confirm the administrator session and network connection, then refresh.");
        }
      } finally {
        if (active) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    }, 0);
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [page, dateRange, selectedMonth, selectedYear, debouncedQuery, refreshKey]);

  const filtersActive = Boolean(query || dateRange !== "all");
  return (
    <div className="mx-auto grid w-full max-w-[1440px] gap-5 px-8 py-6 max-sm:px-4 max-sm:py-5">
      {!checkoutReady && (
        <aside className="rounded-xl border border-amber-200 bg-amber-50 px-5 py-4">
          <p className="text-sm leading-6 text-amber-900">
            <strong className="block">Checkout configuration is incomplete</strong>
            Review the secure server environment before accepting new paid orders.
          </p>
        </aside>
      )}

      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <div className="flex flex-wrap items-center gap-3 border-b border-slate-200 p-4 max-sm:grid max-sm:grid-cols-[minmax(0,1fr)_auto] max-sm:items-stretch">
          <label className="min-w-[230px] flex-1 max-sm:col-span-2 max-sm:min-w-0">
            <span className="sr-only">Search orders</span>
            <input
              className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-[#0e96aa] focus:ring-2 focus:ring-cyan-100"
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search orders"
            />
          </label>
          <FilterSelect
            label="Date range"
            value={dateRange}
            onChange={(value) => setDateRange(value as OrderDateFilter)}
            options={[
              ["all", "Any date"],
              ["today", "Today"],
              ["this-week", "This week"],
              ["this-month", "This month"],
              ["month", "Choose month"],
              ["year", "Choose year"],
            ]}
          />
          {(dateRange === "month" || dateRange === "year") && (
            <FilterSelect
              label="Year"
              value={String(selectedYear)}
              onChange={(value) => setSelectedYear(Number(value))}
              options={availableYears.map((year) => [String(year), String(year)])}
            />
          )}
          {dateRange === "month" && (
            <FilterSelect
              label="Month"
              value={String(selectedMonth)}
              onChange={(value) => setSelectedMonth(Number(value))}
              options={Array.from({ length: 12 }, (_, month) => [
                String(month),
                new Intl.DateTimeFormat("en-US", { month: "long" }).format(
                  new Date(2020, month, 1),
                ),
              ])}
            />
          )}
          {filtersActive && (
            <button
              className="h-10 px-2 text-sm font-medium text-[#08788c] hover:underline max-sm:order-4 max-sm:col-span-2"
              type="button"
              onClick={clearFilters}
            >
              Clear filters
            </button>
          )}
          <button
            className="ml-auto grid size-10 shrink-0 place-items-center rounded-lg border border-slate-300 bg-white text-slate-700 hover:border-[#08788c] hover:text-[#08788c] disabled:opacity-60 max-sm:ml-0"
            type="button"
            onClick={refreshOrders}
            disabled={refreshing}
            aria-label={refreshing ? "Refreshing orders" : "Refresh orders"}
            title="Refresh orders"
          >
            <svg
              aria-hidden="true"
              className={`size-5 ${refreshing ? "animate-spin" : ""}`}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M20 11a8 8 0 1 0-2.3 6.3M20 4v7h-7" />
            </svg>
          </button>
        </div>
        {!loading && !failed && (
          <div className="border-b border-slate-100 px-5 py-3 text-xs font-semibold text-slate-500">
            {total
              ? `${(page - 1) * ADMIN_ORDERS_PAGE_SIZE + 1}–${Math.min(page * ADMIN_ORDERS_PAGE_SIZE, total)} of `
              : ""}
            {total} order{total === 1 ? "" : "s"}
          </div>
        )}
        {loading ? (
          <OrderState title="Loading orders…" />
        ) : failed ? (
          <OrderState title="Orders could not be loaded" message={loadError} />
        ) : orders.length ? (
          <div>
            <table className="w-full border-collapse text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500 max-sm:hidden">
                <tr>
                  <th className="px-5 py-3">Order</th>
                  <th className="px-5 py-3">Customer</th>
                  <th className="px-5 py-3">Total</th>
                  <th className="px-5 py-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => (
                  <tr
                    key={order.id}
                    className="border-t border-slate-100 max-sm:grid max-sm:grid-cols-[minmax(0,1fr)_auto] max-sm:items-start max-sm:gap-2 max-sm:p-4"
                  >
                    <td className="px-5 py-3 font-semibold max-sm:min-w-0 max-sm:p-0">
                      <span className="block break-all">{order.orderNumber}</span>
                      <span className="mt-1 block text-xs font-normal text-slate-500">
                        {new Intl.DateTimeFormat("en-US", { dateStyle: "medium" }).format(
                          new Date(order.createdAt),
                        )}
                        <span className="sm:hidden"> · ${order.total.toFixed(2)}</span>
                      </span>
                      <button
                        className="mt-1 text-xs font-bold text-[#08788c] underline underline-offset-2"
                        type="button"
                        aria-haspopup="dialog"
                        onClick={() => {
                          setSelectedOrder(order);
                        }}
                      >
                        View details
                      </button>
                    </td>
                    <td className="px-5 py-3 max-sm:hidden">
                      <span className="block font-medium">{order.recipientName}</span>
                    </td>
                    <td className="px-5 py-3 font-semibold max-sm:hidden">
                      ${order.total.toFixed(2)}
                    </td>
                    <td className="px-5 py-3 max-sm:p-0">
                      <OrderPaymentStatus status={order.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <OrderState
            title={
              total || query || dateRange !== "all"
                ? "No orders match these filters"
                : "No verified orders yet"
            }
            message={
              total || query || dateRange !== "all"
                ? "Change or clear the filters to see more order records."
                : checkoutReady
                  ? "Payment-confirmed orders will appear here automatically."
                  : "The order database is ready. Complete checkout configuration to begin accepting orders."
            }
          />
        )}
        {!loading && !failed && total > ADMIN_ORDERS_PAGE_SIZE && (
          <Pagination
            page={page}
            total={total}
            pageSize={ADMIN_ORDERS_PAGE_SIZE}
            onPageChange={setPage}
          />
        )}
      </section>
      {selectedOrder && <OrderDetailsDialog order={selectedOrder} onClose={closeDetails} />}
    </div>
  );
}

function FilterSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: [string, string][];
  onChange: (value: string) => void;
}) {
  return (
    <label>
      <span className="sr-only">{label}</span>
      <select
        className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm font-medium text-slate-700 outline-none focus:border-[#0e96aa] focus:ring-2 focus:ring-cyan-100"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      >
        {options.map(([optionValue, optionLabel]) => (
          <option value={optionValue} key={optionValue}>
            {optionLabel}
          </option>
        ))}
      </select>
    </label>
  );
}

function OrderState({ title, message }: { title: string; message?: string }) {
  return (
    <div className="grid min-h-48 place-items-center p-8 text-center">
      <div className="max-w-lg">
        <h2 className="text-base font-semibold">{title}</h2>
        {message && <p className="mt-2 text-sm text-slate-500">{message}</p>}
      </div>
    </div>
  );
}
