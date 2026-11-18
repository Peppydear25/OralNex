import type { ReactNode } from "react";

export function AccountAccessShell({ children }: { children: ReactNode }) {
  return (
    <main className="min-w-0 overflow-x-clip bg-white px-6 py-10 max-sm:px-4 max-sm:py-8">
      <section className="mx-auto w-full max-w-[560px] bg-white">{children}</section>
    </main>
  );
}
