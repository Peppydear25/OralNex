import Link from "next/link";
import type { BuyerTab } from "./account-sidebar";
import type { BuyerOrder } from "./buyer-data";
import { OrderCard } from "./order-card";

export function OverviewTab({
  orders,
  onTabChange,
}: {
  orders: BuyerOrder[];
  onTabChange: (tab: BuyerTab) => void;
}) {
  return (
    <div className="grid gap-9">
      <section className="min-w-0">
        <div className="mb-4 flex items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-medium tracking-tight">Recent order</h2>
          </div>
          <button
            className="text-sm font-bold text-[#08788c]"
            type="button"
            onClick={() => onTabChange("orders")}
          >
            View all orders →
          </button>
        </div>
        {orders[0] ? (
          <OrderCard order={orders[0]} />
        ) : (
          <div className="rounded-xl border border-slate-200 bg-[#fafbfb] px-6 py-10 text-center">
            <h3 className="font-semibold">No orders yet</h3>
            <p className="mt-2 text-sm text-slate-500">
              Your completed purchases will appear here. Ready to get started?
            </p>
            <Link
              href="/shop"
              className="mt-4 inline-block text-sm font-semibold text-[#08788c] underline underline-offset-4"
            >
              Continue shopping
            </Link>
          </div>
        )}
      </section>

      <section className="border-t border-slate-200 pt-7">
        <div className="mb-5">
          <h2 className="text-lg font-medium tracking-tight">Manage your account</h2>
        </div>
        <div className="grid grid-cols-2 gap-3 max-md:grid-cols-1">
          <Shortcut
            title="Manage addresses"
            text="Update delivery details"
            onClick={() => onTabChange("addresses")}
          />
          <Shortcut
            title="Account settings"
            text="Manage profile and security"
            onClick={() => onTabChange("profile")}
          />
        </div>
      </section>
    </div>
  );
}

function Shortcut({ title, text, onClick }: { title: string; text: string; onClick: () => void }) {
  return (
    <button
      className="group rounded-xl border border-slate-200 p-5 text-left transition hover:border-[#0a8d99] hover:bg-[#f4fbfb]"
      type="button"
      onClick={onClick}
    >
      <strong className="block text-sm">{title}</strong>
      <span className="mt-1 block text-xs leading-5 text-slate-500">{text}</span>
      <span className="mt-3 block text-sm font-bold text-[#08788c] transition group-hover:translate-x-1">
        Open →
      </span>
    </button>
  );
}
