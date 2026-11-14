import type { ReactNode } from "react";

export function AccountAccessShell({ children }: { children: ReactNode }) {
  return (
    <main className="min-h-[70vh] min-w-0 overflow-x-clip bg-gradient-to-br from-[#edf7f8] via-white to-[#eef5f6] px-6 py-16 max-sm:px-4 max-sm:py-8">
      <section className="mx-auto w-full max-w-[560px] overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-[0_25px_70px_rgba(20,55,65,.14)]">
        {children}
      </section>
    </main>
  );
}
