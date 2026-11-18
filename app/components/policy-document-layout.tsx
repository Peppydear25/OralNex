import type { ReactNode } from "react";

type PolicyDocumentLayoutProps = {
  title: string;
  description: string;
  updatedDate?: string;
  children: ReactNode;
};

/** Plain, single-column layout for customer-facing policy documents. */
export function PolicyDocumentLayout({
  title,
  description,
  updatedDate,
  children,
}: PolicyDocumentLayoutProps) {
  return (
    <main className="min-w-0 overflow-x-clip bg-white px-5 pb-20 pt-14 text-[#35434b] max-sm:px-4 max-sm:pb-14 max-sm:pt-10 sm:pt-20">
      <div className="mx-auto min-w-0 max-w-[1050px]">
        <header className="mb-12 text-center max-sm:mb-9">
          <h1 className="text-3xl font-semibold tracking-tight leading-tight text-[#253138] [overflow-wrap:anywhere]">
            {title}
          </h1>
          {updatedDate && <p className="mt-3 text-sm text-slate-500">Last updated {updatedDate}</p>}
        </header>

        <article className="min-w-0 text-[15px] leading-[1.85] text-slate-600 [overflow-wrap:anywhere] [&>section]:mt-10 [&>section]:min-w-0 [&>section:first-of-type]:mt-0 [&_a]:font-medium [&_a]:text-[#08788c] [&_a]:underline [&_a]:underline-offset-2 [&_h2]:mb-3 [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:uppercase [&_h2]:tracking-[.06em] [&_h2]:leading-snug [&_h2]:text-[#253138] max-sm:[&_h2]:text-base">
          <section aria-label="Overview">
            <h2>Overview</h2>
            <p>{description}</p>
          </section>
          {children}
        </article>
      </div>
    </main>
  );
}
