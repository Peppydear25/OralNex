"use client";

import Image from "next/image";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useRef } from "react";
import { usePathname } from "next/navigation";
import { useBuyerAccount } from "../data/buyer-account-store";
import { useCart } from "../data/cart-store";

const CartDrawer = dynamic(() => import("./cart-drawer").then((module) => module.CartDrawer));

const navItems = [
  { label: "Shop supplies", href: "/shop" },
  { label: "Our story", href: "/about" },
  { label: "Contact us", href: "/contact" },
];

export function SiteHeader() {
  const cart = useCart();
  const mobileMenuRef = useRef<HTMLDetailsElement>(null);
  const pathname = usePathname();
  const { buyer } = useBuyerAccount();
  const initials = buyer
    ? `${buyer.firstName[0] ?? ""}${buyer.lastName[0] ?? ""}`.toUpperCase()
    : "";
  return (
    <>
      {pathname === "/" && (
        <p className="m-0 flex min-h-8 items-center justify-center bg-brand-dark px-4 py-1 text-center text-xs font-semibold text-white sm:text-sm">
          Call 6462562551 to place your order
        </p>
      )}
      <header className="sticky top-0 z-30 shadow-[0_2px_12px_rgba(15,45,55,.04)] border-b border-b-slate-200 bg-white">
        <div className="relative mx-auto grid h-28 min-w-0 w-[calc(100%-3rem)] max-w-[1600px] grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-4 max-lg:h-24 max-sm:w-[calc(100%-2rem)]">
          <Link
            className="col-start-2 row-start-1 justify-self-center rounded-sm no-underline"
            href="/"
            prefetch={true}
            onNavigate={() => {
              if (mobileMenuRef.current) mobileMenuRef.current.open = false;
              if (cart.open) cart.closeCart();
            }}
            aria-label="OralNex home"
          >
            <Image
              src="/logo.jpg"
              alt="OralNex"
              width={100}
              height={100}
              className="size-[100px] object-contain max-lg:size-20"
              loading="eager"
              fetchPriority="high"
            />
          </Link>
          <nav
            className="col-start-1 row-start-1 justify-self-start max-lg:hidden"
            aria-label="Main navigation"
          >
            <ul className="m-0 flex list-none items-center gap-2 p-0 [&_a]:flex [&_a]:min-h-11 [&_a]:items-center [&_a]:no-underline [&_a]:text-sm [&_a]:hover:bg-[#edf6f7] [&_a]:rounded-lg [&_a]:px-4 [&_a]:whitespace-nowrap [&_a]:text-sm [&_a]:font-extrabold [&_a]:no-underline [&_a]:transition-colors [&_a:hover]:bg-[#edf6f7] [&_a:hover]:text-[#08788c]">
              {navItems.map((item) => (
                <li key={item.label}>
                  <Link
                    href={item.href}
                    aria-current={pathname === item.href ? "page" : undefined}
                    className={
                      pathname === item.href
                        ? "bg-[#edf6f7] text-[#08788c]"
                        : "font-extrabold text-[#172d36] hover:text-[#08788c]"
                    }
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
          <div className="col-start-3 row-start-1 flex min-w-0 items-center justify-self-end gap-4 max-sm:gap-1">
            <div className="flex items-center gap-2 [&_button]:relative [&_button]:grid [&_button]:size-11 [&_button]:place-items-center [&_button]:border-0 [&_button]:bg-transparent [&_button]:p-0 [&_button]:hover:text-[#08788c] [&_svg]:size-7">
              <Link
                className={`relative grid size-11 place-items-center rounded-full text-xs font-bold no-underline transition-colors ${buyer ? "bg-[#08788c] text-white" : "hover:bg-[#edf6f7] hover:text-[#08788c]"}`}
                href={buyer ? "/account/dashboard" : "/account"}
                aria-label={
                  buyer ? `Open ${buyer.firstName}'s account` : "Sign in or create an account"
                }
              >
                {buyer ? (
                  <>
                    {initials}
                    <span className="absolute -bottom-0.5 -right-0.5 size-2.5 rounded-full border-2 border-white bg-emerald-500" />
                  </>
                ) : (
                  <svg aria-hidden="true" viewBox="0 0 24 24">
                    <circle
                      cx="12"
                      cy="8"
                      r="4"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.7"
                    />
                    <path
                      d="M4.5 21c.7-4.5 3.2-7 7.5-7s6.8 2.5 7.5 7"
                      fill="none"
                      stroke="currentColor"
                      strokeLinecap="round"
                      strokeWidth="1.7"
                    />
                  </svg>
                )}
              </Link>
              <button
                type="button"
                onClick={cart.open ? cart.closeCart : cart.openCart}
                aria-label={`View cart with ${cart.itemCount} items`}
                aria-expanded={cart.open}
                data-cart-trigger
                className="[&_span]:absolute [&_span]:right-0 [&_span]:top-0 [&_span]:grid [&_span]:size-5 [&_span]:place-items-center [&_span]:rounded-full [&_span]:bg-[#0e96aa] [&_span]:text-[10px] [&_span]:text-white"
              >
                <svg aria-hidden="true" viewBox="0 0 24 24">
                  <path
                    d="M4 8.5h16l-1 13H5l-1-13Z"
                    fill="none"
                    stroke="currentColor"
                    strokeLinejoin="round"
                    strokeWidth="1.7"
                  />
                  <path
                    d="M8.5 10V6a3.5 3.5 0 0 1 7 0v4"
                    fill="none"
                    stroke="currentColor"
                    strokeLinecap="round"
                    strokeWidth="1.7"
                  />
                </svg>
                {cart.itemCount > 0 && <span>{cart.itemCount}</span>}
              </button>
            </div>
          </div>
          <details
            ref={mobileMenuRef}
            onKeyDown={(event) => {
              if (event.key === "Escape" && mobileMenuRef.current?.open) {
                mobileMenuRef.current.open = false;
                mobileMenuRef.current.querySelector("summary")?.focus();
              }
            }}
            className="relative col-start-1 row-start-1 hidden justify-self-start max-lg:block [&_summary]:grid [&_summary]:size-11 [&_summary]:content-center [&_summary]:justify-center [&_summary]:list-none [&_summary::-webkit-details-marker]:hidden [&_summary]:cursor-pointer [&_summary]:gap-1.5 [&_summary]:rounded-lg [&_summary]:p-2 [&_summary]:hover:bg-slate-100 [&_summary_span]:block [&_summary_span]:h-0.5 [&_summary_span]:w-6 [&_summary_span]:bg-[#172d36] [&_nav]:absolute [&_nav]:left-0 [&_nav]:top-12 [&_nav]:z-50 [&_nav]:grid [&_nav]:w-[min(14rem,calc(100vw-2rem))] [&_nav]:gap-1 [&_nav]:rounded-xl [&_nav]:border [&_nav]:border-slate-200 [&_nav]:bg-white [&_nav]:p-3 [&_nav]:shadow-xl [&_a]:rounded-lg [&_a]:px-3 [&_a]:py-2.5"
          >
            <summary aria-label="Open navigation">
              <span />
              <span />
              <span />
            </summary>
            <nav
              aria-label="Mobile navigation"
              className="[&_a]:text-[15px] [&_a]:font-medium [&_a]:leading-6 [&_a]:text-[#172d36] [&_a]:transition-colors [&_a:hover]:text-[#08788c]"
            >
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={pathname === item.href ? "page" : undefined}
                  onNavigate={() => {
                    if (mobileMenuRef.current) mobileMenuRef.current.open = false;
                  }}
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </details>
        </div>
      </header>
      {cart.open && <CartDrawer />}
    </>
  );
}
