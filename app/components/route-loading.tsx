"use client";

import { usePathname } from "next/navigation";
import { StorefrontLoading, StorefrontLoadingHeader } from "./storefront-loading";

type LoadingKind =
  | "home"
  | "admin-sign-in"
  | "admin-dashboard"
  | "account-access"
  | "account-dashboard"
  | "catalog"
  | "product"
  | "cart"
  | "checkout"
  | "confirmation"
  | "contact"
  | "about"
  | "document"
  | "generic";

export function loadingKindForPath(pathname: string): LoadingKind {
  if (pathname === "/") return "home";
  if (pathname === "/admin/sign-in") return "admin-sign-in";
  if (pathname.startsWith("/admin")) return "admin-dashboard";
  if (pathname === "/account/dashboard") return "account-dashboard";
  if (pathname.startsWith("/account") || pathname.startsWith("/auth")) return "account-access";
  if (pathname === "/checkout/success") return "confirmation";
  if (pathname === "/checkout") return "checkout";
  if (pathname === "/cart") return "cart";
  if (pathname.startsWith("/products/")) return "product";
  if (pathname === "/shop") return "catalog";
  if (pathname === "/contact") return "contact";
  if (pathname === "/about") return "about";
  if (["/shipping-policy", "/privacy-policy", "/terms-of-service"].includes(pathname))
    return "document";
  return "generic";
}

const shimmer = "animate-pulse rounded-xl bg-[#e5edef] motion-reduce:animate-none";

function Block({ className = "" }: { className?: string }) {
  return <div className={`${shimmer} ${className}`} aria-hidden="true" />;
}

function StorefrontFrame({ children, label }: { children: React.ReactNode; label: string }) {
  return (
    <div className="min-h-screen bg-white text-[#253138]">
      <StorefrontLoadingHeader />
      <main
        className="mx-auto min-w-0 w-[calc(100%-3rem)] max-w-[1280px] py-12 max-sm:w-[calc(100%-1.75rem)] max-sm:py-7"
        role="status"
        aria-busy="true"
        aria-label={`Loading ${label}`}
      >
        <span className="sr-only">Loading {label}</span>
        {children}
      </main>
    </div>
  );
}

function PageHeading({ title }: { title: string }) {
  return (
    <div className="mb-9" aria-label={`Loading ${title}`}>
      <Block className="h-9 w-3/4 max-w-md" />
      <Block className="mt-4 h-4 w-full max-w-sm" />
    </div>
  );
}

function AdminSignInLoading() {
  return (
    <main
      className="grid min-h-screen place-items-center bg-gradient-to-br from-cyan-50 to-white p-5"
      role="status"
      aria-label="Loading admin sign-in"
      aria-busy="true"
    >
      <section className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-10 shadow-xl max-sm:p-6">
        <div className="flex items-center gap-3 border-b border-slate-200 pb-6">
          <Block className="size-14 shrink-0" />
          <div>
            <Block className="h-6 w-20" />
            <Block className="mt-2 h-3 w-40" />
          </div>
        </div>
        <Block className="h-9 w-3/4 max-w-md" />
        <div className="mt-7 grid gap-5">
          <Block className="h-12 w-full" />
          <Block className="h-12 w-full" />
          <Block className="mt-2 h-12 w-full rounded-full" />
        </div>
      </section>
    </main>
  );
}

function AdminDashboardLoading() {
  return (
    <main
      className="flex min-h-screen bg-slate-50 text-[#253138]"
      role="status"
      aria-label="Loading admin dashboard"
      aria-busy="true"
    >
      <aside className="w-64 shrink-0 bg-[#0e2130] p-6 max-md:w-16 max-md:p-3" aria-hidden="true">
        <Block className="h-12 w-full bg-white/15" />
        <div className="mt-12 grid gap-5">
          {Array.from({ length: 6 }, (_, index) => (
            <Block className="h-10 w-full bg-white/10" key={index} />
          ))}
        </div>
      </aside>
      <section className="min-w-0 flex-1 p-8 max-sm:p-4">
        <Block className="h-9 w-3/4 max-w-md" />
        <div className="mt-8 grid grid-cols-3 gap-4 max-lg:grid-cols-1">
          {Array.from({ length: 3 }, (_, index) => (
            <Block className="h-28 w-full bg-white" key={index} />
          ))}
        </div>
        <Block className="mt-8 h-72 w-full bg-white" />
      </section>
    </main>
  );
}

function AccountAccessLoading({ pathname }: { pathname: string }) {
  const title = pathname.includes("forgot-password")
    ? "Forgot your password?"
    : pathname.includes("reset-password")
      ? "Choose a new password"
      : pathname.startsWith("/auth")
        ? "Completing sign-in"
        : "Your account";
  return (
    <StorefrontFrame label={title}>
      <section className="mx-auto max-w-[560px] rounded-3xl border border-slate-200 bg-white p-8 shadow-sm max-sm:p-6">
        <Block className="h-9 w-3/4 max-w-md" />
        <Block className="mt-4 h-4 w-4/5" />
        <div className="mt-9 grid gap-5">
          <Block className="h-12 w-full" />
          {!pathname.includes("forgot-password") && <Block className="h-12 w-full" />}
          <Block className="h-12 w-full rounded-full" />
        </div>
      </section>
    </StorefrontFrame>
  );
}

function AccountDashboardLoading() {
  return (
    <StorefrontFrame label="your account">
      <PageHeading title="Your account" />
      <div className="grid grid-cols-[240px_minmax(0,1fr)] gap-7 max-md:grid-cols-1">
        <div className="grid h-fit gap-4 rounded-2xl border border-slate-200 p-5 max-md:grid-cols-3 max-sm:grid-cols-2">
          {Array.from({ length: 4 }, (_, index) => (
            <Block className="h-10 w-full" key={index} />
          ))}
        </div>
        <div className="grid gap-5">
          <Block className="h-32 w-full" />
          <Block className="h-52 w-full" />
        </div>
      </div>
    </StorefrontFrame>
  );
}

function CatalogLoading() {
  const title = "Shop Equipment";
  return (
    <StorefrontFrame label={title}>
      <PageHeading title={title} />
      <div className="grid grid-cols-2 gap-6 max-sm:gap-3">
        {Array.from({ length: 2 }, (_, index) => (
          <Block className="h-72 w-full max-sm:h-48" key={index} />
        ))}
      </div>
    </StorefrontFrame>
  );
}

function ProductLoading() {
  return (
    <StorefrontFrame label="product details">
      <div className="grid grid-cols-2 gap-10 max-md:grid-cols-1">
        <Block className="aspect-square w-full" />
        <div className="grid content-start gap-5">
          <Block className="h-4 w-24" />
          <Block className="h-12 w-4/5" />
          <Block className="h-6 w-1/2" />
          <Block className="mt-4 h-16 w-full" />
          <Block className="h-20 w-full" />
          <Block className="h-12 w-full rounded-full" />
        </div>
      </div>
    </StorefrontFrame>
  );
}

function CartOrCheckoutLoading({ checkout }: { checkout: boolean }) {
  const title = checkout ? "Checkout" : "Your cart";
  return (
    <StorefrontFrame label={title}>
      <PageHeading title={title} />
      <div className="grid grid-cols-[minmax(0,1.4fr)_minmax(260px,.6fr)] gap-7 max-lg:grid-cols-1">
        <div className="grid gap-5">
          {checkout ? (
            <>
              <Block className="h-44 w-full" />
              <Block className="h-72 w-full" />
            </>
          ) : (
            Array.from({ length: 2 }, (_, index) => <Block className="h-36 w-full" key={index} />)
          )}
        </div>
        <Block className="h-72 w-full" />
      </div>
    </StorefrontFrame>
  );
}

function DocumentLoading({ pathname }: { pathname: string }) {
  const title =
    pathname === "/privacy-policy"
      ? "Privacy Policy"
      : pathname === "/terms-of-service"
        ? "Terms of Service"
        : "Shipping & Returns";
  return (
    <StorefrontFrame label={title}>
      <Block className="h-9 w-3/4 max-w-md" />
      <div className="mx-auto max-w-[1050px] space-y-8">
        {Array.from({ length: 3 }, (_, index) => (
          <div className="space-y-3" key={index}>
            <Block className="h-6 w-44" />
            <Block className="h-4 w-full" />
            <Block className="h-4 w-11/12" />
            <Block className="h-4 w-4/5" />
          </div>
        ))}
      </div>
    </StorefrontFrame>
  );
}

function SimplePageLoading({ pathname }: { pathname: string }) {
  const title =
    pathname === "/contact"
      ? "Contact Us"
      : pathname === "/about"
        ? "About OralNex"
        : pathname === "/checkout/success"
          ? "Order confirmation"
          : "Loading page";
  if (pathname === "/checkout/success") {
    return (
      <StorefrontFrame label={title}>
        <section className="mx-auto max-w-xl rounded-3xl border border-slate-200 p-8 text-center">
          <Block className="h-9 w-3/4 max-w-md" />
          <Block className="mx-auto mt-8 size-16 rounded-full" />
          <Block className="mx-auto mt-6 h-4 w-4/5" />
          <Block className="mx-auto mt-4 h-4 w-3/5" />
        </section>
      </StorefrontFrame>
    );
  }
  return (
    <StorefrontFrame label={title}>
      <PageHeading title={title} />
      {pathname === "/contact" ? (
        <div className="grid gap-6 lg:grid-cols-[.75fr_1.25fr]">
          <Block className="h-96 w-full" />
          <div className="grid gap-5 rounded-2xl border border-slate-200 p-6">
            <Block className="h-7 w-2/3" />
            <Block className="h-12 w-full" />
            <Block className="h-12 w-full" />
            <Block className="h-36 w-full" />
            <Block className="h-12 w-40" />
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-7 max-md:grid-cols-1">
          <Block className="h-80 w-full" />
          <Block className="h-80 w-full" />
        </div>
      )}
    </StorefrontFrame>
  );
}

export function RouteLoading() {
  const pathname = usePathname();
  const kind = loadingKindForPath(pathname);
  switch (kind) {
    case "home":
      return <StorefrontLoading />;
    case "admin-sign-in":
      return <AdminSignInLoading />;
    case "admin-dashboard":
      return <AdminDashboardLoading />;
    case "account-access":
      return <AccountAccessLoading pathname={pathname} />;
    case "account-dashboard":
      return <AccountDashboardLoading />;
    case "catalog":
      return <CatalogLoading />;
    case "product":
      return <ProductLoading />;
    case "cart":
      return <CartOrCheckoutLoading checkout={false} />;
    case "checkout":
      return <CartOrCheckoutLoading checkout />;
    case "document":
      return <DocumentLoading pathname={pathname} />;
    case "confirmation":
    case "contact":
    case "about":
    case "generic":
    default:
      return <SimplePageLoading pathname={pathname} />;
  }
}
