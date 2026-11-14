const pulse = "animate-pulse rounded-lg bg-[#e5edef] motion-reduce:animate-none";

export function StorefrontLoadingHeader() {
  return (
    <header className="border-b border-slate-100 bg-white" aria-hidden="true">
      <div className="store-container relative flex h-[88px] items-center justify-between gap-6 max-lg:h-20">
        <div className="flex items-center gap-3 max-lg:hidden">
          <div className={`${pulse} size-14`} />
          <div className="space-y-2">
            <div className={`${pulse} h-6 w-12`} />
            <div className={`${pulse} h-2 w-40`} />
          </div>
        </div>
        <div className={`${pulse} size-10 lg:hidden`} />
        <div className="flex gap-8 max-lg:hidden">
          <div className={`${pulse} h-4 w-24`} />
          <div className={`${pulse} h-4 w-14`} />
        </div>
        <div className={`${pulse} absolute left-1/2 size-12 -translate-x-1/2 lg:hidden`} />
        <div className="flex gap-3">
          <div className={`${pulse} h-11 w-40 rounded-full max-lg:hidden`} />
          <div className={`${pulse} size-10 rounded-full`} />
          <div className={`${pulse} size-10 rounded-full`} />
        </div>
      </div>
    </header>
  );
}

export function StorefrontLoading() {
  return (
    <div className="homepage min-h-screen bg-white">
      <StorefrontLoadingHeader />
      <main
        className="home-container py-6"
        role="status"
        aria-label="Loading storefront"
        aria-busy="true"
      >
        <div
          className="grid overflow-hidden rounded-2xl border border-[#dce9eb] bg-[#f3f8f8] lg:grid-cols-[1.1fr_.9fr]"
          aria-hidden="true"
        >
          <div
            className={`${pulse} order-2 aspect-[4/3] rounded-none lg:order-1 lg:aspect-auto lg:min-h-[500px]`}
          />
          <div className="order-1 space-y-5 px-6 py-12 sm:px-10 lg:order-2 lg:self-center lg:py-16">
            <div className={`${pulse} h-3 w-40`} />
            <div className={`${pulse} h-11 w-full max-w-sm`} />
            <div className={`${pulse} h-11 w-3/4`} />
            <div className={`${pulse} h-4 w-full`} />
            <div className={`${pulse} h-4 w-4/5`} />
          </div>
        </div>
        <div className="mt-12" aria-hidden="true">
          <div className={`${pulse} mb-6 h-7 w-56`} />
          <div className="grid grid-cols-2 gap-4 sm:gap-6">
            {[0, 1].map((item) => (
              <div key={item} className="overflow-hidden rounded-2xl border border-slate-200">
                <div className={`${pulse} aspect-[16/9] rounded-none`} />
                <div className="space-y-3 p-5">
                  <div className={`${pulse} h-6 w-2/3`} />
                  <div className={`${pulse} h-3 w-full`} />
                  <div className={`${pulse} h-3 w-1/2`} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
