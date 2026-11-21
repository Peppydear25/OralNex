import Link from "next/link";

export function EmptyCart() {
  return (
    <main className="mx-auto grid min-h-[62vh] max-w-xl place-content-center justify-items-center px-4 py-12 text-center">
      <svg
        className="size-12 text-[#08788c]"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M3 3h2l2.4 12h11.2l2-8H6" />
        <circle cx="9" cy="20" r="1" />
        <circle cx="18" cy="20" r="1" />
      </svg>
      <h1 className="mt-5 text-2xl font-semibold text-[#172d36] sm:text-3xl">Your cart is empty</h1>
      <Link
        className="mt-6 inline-flex min-h-12 items-center justify-center rounded-lg bg-[#08788c] px-6 text-sm font-semibold text-white no-underline transition-colors hover:bg-[#066678]"
        href="/shop"
      >
        Continue shopping
      </Link>
    </main>
  );
}
