export type BuyerTab = "overview" | "orders" | "addresses" | "profile";

const links: { id: BuyerTab; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "orders", label: "Order history" },
  { id: "addresses", label: "Addresses" },
  { id: "profile", label: "Account details" },
];

export function AccountSidebar({
  tab,
  onChange,
  onSignOut,
}: {
  tab: BuyerTab;
  onChange: (tab: BuyerTab) => void;
  onSignOut: () => void;
}) {
  return (
    <aside className="sticky top-32 self-start overflow-hidden border-t border-slate-200 bg-white max-lg:static max-lg:border-t-0">
      <nav
        className="grid gap-1 py-4 max-lg:grid-cols-4 max-lg:gap-2 max-lg:py-0 max-sm:grid-cols-2"
        aria-label="Customer account"
      >
        {links.map((link) => (
          <button
            className={`flex items-center gap-3 rounded-lg px-3 py-3 text-left text-sm font-semibold transition max-lg:justify-center max-lg:border max-lg:border-slate-200 max-lg:px-3 max-sm:justify-start ${tab === link.id ? "bg-[#e8f5f6] text-[#086b79] max-lg:border-[#9dcfd3]" : "text-slate-700 hover:bg-slate-50 hover:text-[#08788c]"}`}
            type="button"
            onClick={() => onChange(link.id)}
            key={link.id}
            aria-current={tab === link.id ? "page" : undefined}
          >
            <span
              className={`grid size-8 shrink-0 place-items-center rounded-lg ${tab === link.id ? "bg-white text-[#08788c]" : "bg-slate-50 text-slate-600"}`}
              aria-hidden="true"
            >
              <AccountNavIcon tab={link.id} />
            </span>
            {link.label}
          </button>
        ))}
      </nav>
      <div className="border-t border-slate-200 py-4 max-lg:hidden">
        <button
          className="inline-flex min-h-11 w-full items-center justify-center rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-[#172d36] transition hover:border-[#08788c] hover:bg-[#f1f8f9] hover:text-[#08788c] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#08788c] max-lg:w-auto"
          type="button"
          onClick={onSignOut}
        >
          Sign out
        </button>
      </div>
    </aside>
  );
}

function AccountNavIcon({ tab }: { tab: BuyerTab }) {
  return (
    <svg
      className="size-4"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {tab === "overview" && (
        <>
          <rect x="3" y="3" width="7" height="7" rx="1" />
          <rect x="14" y="3" width="7" height="7" rx="1" />
          <rect x="3" y="14" width="7" height="7" rx="1" />
          <rect x="14" y="14" width="7" height="7" rx="1" />
        </>
      )}
      {tab === "orders" && (
        <>
          <path d="M4 3h16v18l-4-2-4 2-4-2-4 2V3Z" />
          <path d="M8 8h8M8 12h8" />
        </>
      )}
      {tab === "addresses" && (
        <>
          <path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z" />
          <circle cx="12" cy="10" r="2.5" />
        </>
      )}
      {tab === "profile" && (
        <>
          <circle cx="12" cy="8" r="4" />
          <path d="M4 21a8 8 0 0 1 16 0" />
        </>
      )}
    </svg>
  );
}
