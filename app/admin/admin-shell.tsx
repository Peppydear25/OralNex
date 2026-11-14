import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { adminSignOut } from "./actions";
import { adminNavigation } from "./admin-navigation";
import type { AdminTab } from "./dashboard/types";

type Props = {
  activeTab: AdminTab;
  children: ReactNode;
};

export function AdminShell({ activeTab, children }: Props) {
  return (
    <div className="admin-dashboard grid min-h-screen min-w-0 grid-cols-[248px_minmax(0,1fr)] bg-[#f5f8f9] text-sm text-slate-800 max-lg:grid-cols-1 max-lg:grid-rows-[auto_1fr]">
      <aside className="sticky top-0 flex h-screen w-[248px] flex-col border-r border-white/10 bg-[#103740] p-4 text-white max-lg:static max-lg:h-auto max-lg:w-full max-lg:flex-row max-lg:items-center max-sm:p-3">
        <div className="flex items-center gap-3 border-b border-white/10 px-2 pb-5 pt-1 max-lg:border-0 max-lg:pb-0 max-lg:pt-0 [&_img]:size-12 [&_img]:rounded-lg [&_span]:flex [&_span]:flex-col [&_strong]:text-lg [&_small]:text-xs [&_small]:text-white/55">
          <Image src="/logo.jpg" alt="" width={48} height={48} loading="eager" />
          <span>
            <strong>OralNex</strong>
            <small>Admin workspace</small>
          </span>
        </div>

        <p className="mx-3 mb-2 mt-7 text-xs font-semibold uppercase tracking-widest text-white/50 max-lg:hidden">
          Workspace
        </p>
        <nav className="mt-2 grid gap-1 max-lg:hidden" aria-label="Admin navigation">
          {adminNavigation.map((item) => (
            <Link
              className={`group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold transition ${activeTab === item.id ? "bg-white text-[#0b5666] shadow-sm" : "text-white/70 hover:bg-white/10 hover:text-white"}`}
              href={item.id === "overview" ? "/admin" : `/admin?tab=${item.id}`}
              aria-current={activeTab === item.id ? "page" : undefined}
              key={item.id}
            >
              <span
                className={`grid size-8 place-items-center rounded-md ${activeTab === item.id ? "bg-cyan-50" : "bg-white/10 group-hover:bg-white/15"}`}
              >
                <AdminNavIcon name={item.icon} />
              </span>
              {item.label}
            </Link>
          ))}
        </nav>

        <form className="mt-auto max-lg:ml-auto max-lg:mt-0" action={adminSignOut}>
          <button
            className="w-full rounded-lg border border-white/20 px-4 py-2.5 text-sm font-semibold text-white/80 transition hover:bg-white/10 hover:text-white"
            type="submit"
          >
            Sign out
          </button>
        </form>
      </aside>

      <main className="min-w-0 bg-[#f5f8f9]">{children}</main>
    </div>
  );
}

function AdminNavIcon({ name }: { name: string }) {
  const paths: Record<string, ReactNode> = {
    overview: <path d="M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z" />,
    inventory: <path d="m4 7 8-4 8 4-8 4-8-4Zm0 0v10l8 4 8-4V7M12 11v10" />,
    orders: <path d="M6 3h12v18l-3-2-3 2-3-2-3 2V3Zm3 5h6M9 12h6" />,
    categories: <path d="M4 5h7v6H4zM13 5h7v6h-7zM4 13h7v6H4zM13 13h7v6h-7z" />,
    storefront: <path d="M4 10h16M5 10v10h14V10M3 10l2-6h14l2 6M9 20v-6h6v6" />,
  };
  return (
    <svg
      aria-hidden="true"
      className="size-4"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {paths[name]}
    </svg>
  );
}
