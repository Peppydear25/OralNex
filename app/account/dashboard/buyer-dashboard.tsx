"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { ActionResultModal, type ActionResult } from "../../components/action-result-modal";
import { useBuyerAccount } from "../../data/buyer-account-store";
import { AccountSidebar, type BuyerTab } from "./account-sidebar";
import { AddressesTab } from "./addresses-tab";
import type { BuyerOrder } from "./buyer-data";
import { BUYER_ORDERS_PAGE_SIZE, loadOrders } from "../../data/supabase-orders";
import { OrderHistoryTable } from "./order-history-table";
import { OverviewTab } from "./overview-tab";
import { ProfileTab } from "./profile-tab";

const tabTitles: Record<BuyerTab, string> = {
  overview: "My account",
  orders: "Order history",
  addresses: "Addresses",
  profile: "Account details",
};

export function BuyerDashboard() {
  const account = useBuyerAccount();
  const router = useRouter();
  const [tab, setTab] = useState<BuyerTab>("overview");
  const [notice, setNotice] = useState("");
  const [authResult, setAuthResult] = useState<ActionResult | null>(null);
  const [orders, setOrders] = useState<BuyerOrder[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(true);
  const [ordersRefreshing, setOrdersRefreshing] = useState(false);
  const [ordersError, setOrdersError] = useState(false);
  const [ordersPage, setOrdersPage] = useState(1);
  const [ordersTotal, setOrdersTotal] = useState(0);
  const [orderSearchInput, setOrderSearchInput] = useState("");
  const [orderQuery, setOrderQuery] = useState("");
  const [orderPeriod, setOrderPeriod] = useState<7 | 30 | 90 | null>(null);
  const ordersRequestId = useRef(0);
  const buyerEmail = account.buyer?.email;

  const refreshOrders = useCallback(async () => {
    const requestId = ++ordersRequestId.current;
    let movedToLastPage = false;
    setOrdersRefreshing(true);
    try {
      const {
        orders: records,
        total,
        error,
      } = await loadOrders(ordersPage, {
        recentDays: orderPeriod,
        orderNumber: orderQuery,
      });
      if (requestId !== ordersRequestId.current) return;
      const lastPage = Math.max(1, Math.ceil(total / BUYER_ORDERS_PAGE_SIZE));
      if (!error && total > 0 && ordersPage > lastPage) {
        movedToLastPage = true;
        setOrdersPage(lastPage);
        return;
      }
      setOrders(records);
      setOrdersTotal(total);
      setOrdersError(Boolean(error));
    } catch {
      if (requestId !== ordersRequestId.current) return;
      setOrdersError(true);
    } finally {
      if (requestId === ordersRequestId.current) {
        setOrdersLoading(movedToLastPage);
        setOrdersRefreshing(false);
      }
    }
  }, [ordersPage, orderQuery, orderPeriod]);

  useEffect(() => {
    if (!buyerEmail) {
      queueMicrotask(() => setOrdersLoading(false));
      return;
    }
    queueMicrotask(() => void refreshOrders());
  }, [buyerEmail, refreshOrders]);

  const totalOrdersPages = Math.max(1, Math.ceil(ordersTotal / BUYER_ORDERS_PAGE_SIZE));
  const changeOrdersPage = (nextPage: number) => {
    if (nextPage < 1 || nextPage > totalOrdersPages || nextPage === ordersPage) return;
    setOrdersLoading(true);
    setOrdersPage(nextPage);
  };

  const notify = (message: string) => {
    setNotice(message);
    window.setTimeout(() => setNotice(""), 2600);
  };

  if (!account.buyer) {
    return (
      <>
        <div className="mx-auto grid min-h-[55vh] max-w-xl place-content-center px-6 text-center">
          <h1 className="text-3xl font-semibold">Sign in to view your account</h1>
          <p className="my-4 text-slate-500">
            Sign in to access your account details and order history.
          </p>
          <Link
            className="mx-auto rounded-xl bg-[#08788c] px-5 py-3 font-bold text-white"
            href="/account"
          >
            Sign in or create an account
          </Link>
        </div>
        <ActionResultModal
          result={authResult}
          onClose={() => {
            setAuthResult(null);
            router.push("/account");
          }}
        />
      </>
    );
  }

  const buyer = account.buyer;
  const signOut = () => {
    account.signOut();
    setAuthResult({
      tone: "success",
      title: "You are signed out",
      message: "Your OralNex account session has ended successfully on this device.",
      actionLabel: "Return to sign in",
    });
  };

  return (
    <div className="mx-auto min-w-0 w-[calc(100%-3rem)] max-w-[1180px] py-12 max-sm:w-[calc(100%-2rem)] max-sm:py-8">
      <header className="mb-7 flex items-center justify-between gap-3 border-b border-slate-200 pb-5 max-sm:mb-6">
        <h1 className="text-[clamp(28px,4vw,38px)] font-medium leading-tight tracking-tight">
          {tabTitles[tab]}
        </h1>
        <button
          className="hidden min-h-11 shrink-0 items-center rounded-lg border border-slate-300 bg-white px-3 text-sm font-semibold text-[#172d36] hover:border-[#08788c] hover:text-[#08788c] max-lg:inline-flex"
          type="button"
          onClick={signOut}
        >
          Sign out
        </button>
      </header>
      <div className="grid grid-cols-[230px_minmax(0,1fr)] items-start gap-10 max-lg:grid-cols-1 max-lg:gap-6">
        <AccountSidebar tab={tab} onChange={setTab} onSignOut={signOut} />
        <main className="min-w-0">
          {tab === "overview" && <OverviewTab orders={orders} onTabChange={setTab} />}
          {tab === "orders" && (
            <section className="min-w-0">
              <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto_auto] gap-3 max-sm:grid-cols-2">
                <form
                  className="flex min-w-0 gap-2 max-sm:col-span-2"
                  onSubmit={(event) => {
                    event.preventDefault();
                    setOrdersPage(1);
                    setOrderQuery(orderSearchInput.trim());
                  }}
                >
                  <input
                    aria-label="Search by order number"
                    className="min-h-11 min-w-0 flex-1 rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none focus:border-[#08788c]"
                    type="search"
                    placeholder="Search order number"
                    value={orderSearchInput}
                    onChange={(event) => setOrderSearchInput(event.target.value)}
                  />
                  <button
                    className="shrink-0 rounded-lg border border-slate-300 bg-white px-4 text-sm font-semibold text-[#08788c]"
                    type="submit"
                  >
                    Search
                  </button>
                </form>
                <select
                  aria-label="Filter orders by date"
                  className="min-h-11 min-w-0 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-700"
                  value={orderPeriod ?? "all"}
                  onChange={(event) => {
                    setOrdersPage(1);
                    setOrderPeriod(
                      event.target.value === "all"
                        ? null
                        : (Number(event.target.value) as 7 | 30 | 90),
                    );
                  }}
                >
                  <option value="all">Any date</option>
                  <option value="7">Last 7 days</option>
                  <option value="30">Last 30 days</option>
                  <option value="90">Last 90 days</option>
                </select>
                <button
                  className="grid size-11 place-items-center rounded-lg border border-slate-300 bg-white text-[#08788c] hover:border-[#08788c] disabled:opacity-60"
                  type="button"
                  onClick={() => void refreshOrders()}
                  disabled={ordersRefreshing}
                  aria-label={ordersRefreshing ? "Refreshing orders" : "Refresh orders"}
                  title="Refresh orders"
                >
                  <svg
                    className={`size-5 ${ordersRefreshing ? "motion-safe:animate-spin" : ""}`}
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="M20 11a8 8 0 0 0-14-5L4 8" />
                    <path d="M4 4v4h4" />
                    <path d="M4 13a8 8 0 0 0 14 5l2-2" />
                    <path d="M20 20v-4h-4" />
                  </svg>
                </button>
              </div>
              <div className="mt-4 space-y-3" aria-label="Order history list">
                {ordersLoading ? (
                  <OrderState
                    title="Loading orders…"
                    message="Retrieving your secure order history."
                  />
                ) : ordersError ? (
                  <OrderState
                    title="Orders could not be loaded"
                    message="Check your connection and refresh the page."
                  />
                ) : orders.length ? (
                  <>
                    <OrderHistoryTable orders={orders} />
                    {totalOrdersPages > 1 && (
                      <nav
                        className="flex flex-wrap items-center justify-between gap-3 pt-2"
                        aria-label="Order pages"
                      >
                        <p className="text-sm text-slate-500">
                          Page {ordersPage} of {totalOrdersPages} · {ordersTotal} orders
                        </p>
                        <div className="flex gap-2">
                          <button
                            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-[#08788c] disabled:cursor-not-allowed disabled:opacity-50"
                            type="button"
                            disabled={ordersPage === 1 || ordersRefreshing}
                            onClick={() => changeOrdersPage(ordersPage - 1)}
                          >
                            Previous
                          </button>
                          <button
                            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-[#08788c] disabled:cursor-not-allowed disabled:opacity-50"
                            type="button"
                            disabled={ordersPage >= totalOrdersPages || ordersRefreshing}
                            onClick={() => changeOrdersPage(ordersPage + 1)}
                          >
                            Next
                          </button>
                        </div>
                      </nav>
                    )}
                  </>
                ) : (
                  <OrderState
                    title={
                      orderQuery || orderPeriod !== null ? "No matching orders" : "No order history"
                    }
                    message={
                      orderQuery || orderPeriod !== null
                        ? "Try another order number or date range."
                        : "Your completed purchases will appear here."
                    }
                  />
                )}
              </div>
            </section>
          )}
          {tab === "addresses" && (
            <AddressesTab
              addresses={buyer.addresses ?? []}
              notify={notify}
              onChange={(addresses) => account.signIn({ ...buyer, addresses })}
            />
          )}
          {tab === "profile" && (
            <ProfileTab buyer={buyer} notify={notify} onUpdate={account.signIn} />
          )}
        </main>
      </div>

      {notice && (
        <div
          className="fixed bottom-6 right-6 z-50 max-w-sm rounded-xl bg-slate-900 px-5 py-4 text-sm text-white shadow-2xl"
          role="status"
        >
          {notice}
        </div>
      )}
    </div>
  );
}

function OrderState({ title, message }: { title: string; message: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center">
      <h2 className="text-xl font-semibold">{title}</h2>
      <p className="mt-2 text-sm text-slate-500">{message}</p>
    </div>
  );
}
