import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";

export function CheckoutFrame({
  children,
  backHref,
  backLabel,
}: {
  children: ReactNode;
  backHref: string;
  backLabel: string;
}) {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex h-20 max-w-[1180px] items-center justify-between gap-4 px-6 max-sm:h-16 max-sm:px-4">
          <Link className="flex items-center gap-3 no-underline" href="/" aria-label="OralNex home">
            <Image
              src="/logo.jpg"
              alt=""
              width={64}
              height={64}
              loading="eager"
              fetchPriority="high"
              className="size-16 object-contain max-sm:size-14"
            />
          </Link>
          <div className="flex items-center gap-5 text-sm">
            <Link
              className="font-medium text-slate-600 no-underline hover:text-[#08788c]"
              href={backHref}
            >
              {backLabel}
            </Link>
            <span className="hidden items-center gap-2 text-slate-500 sm:flex">
              <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                className="size-4"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
              >
                <rect x="5" y="10" width="14" height="11" rx="2" />
                <path d="M8 10V7a4 4 0 0 1 8 0v3" />
              </svg>
              Secure checkout
            </span>
          </div>
        </div>
      </header>
      <div className="flex-1">{children}</div>
    </div>
  );
}
