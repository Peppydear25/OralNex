import Image from "next/image";
import Link from "next/link";

export function SiteFooter() {
  return (
    <footer
      className="border-t border-slate-200 bg-[#f6f9fa] font-sans text-[#172d36] antialiased"
      id="about"
    >
      <div className="mx-auto w-[calc(100%-3rem)] max-w-[1280px] pt-14 pb-6 max-sm:w-[calc(100%-1.75rem)] max-sm:pt-9">
        <div className="grid min-w-0 grid-cols-2 items-start gap-x-6 gap-y-8 pb-10 sm:grid-cols-3 lg:grid-cols-[1.6fr_1fr_1fr_1fr] lg:gap-12">
          <div className="col-span-2 min-w-0 sm:col-span-3 lg:col-span-1 lg:border-r lg:border-slate-200 lg:pr-10">
            <div className="flex min-w-0 items-center gap-4">
              <Link className="shrink-0 no-underline" href="/" aria-label="OralNex home">
                <Image
                  className="size-24 object-contain"
                  src="/logo.jpg"
                  alt=""
                  width={96}
                  height={96}
                  loading="lazy"
                />
              </Link>
              <p className="min-w-0 text-[13px] font-medium leading-6 text-slate-700">
                Dental and medical essentials with clear product details and straightforward
                ordering.
              </p>
            </div>
          </div>
          <nav
            className="flex min-w-0 flex-col items-start text-left [&_h2]:mb-2 [&_h2]:text-sm [&_h2]:font-semibold [&_h2]:tracking-normal [&_h2]:text-[#172d36] [&_a]:inline-flex [&_a]:min-h-11 [&_a]:max-w-full [&_a]:items-center [&_a]:text-[13px] [&_a]:leading-5 [&_a]:text-slate-600 [&_a]:no-underline [&_a]:transition-colors [&_a:hover]:text-[#08788c] [&_a:hover]:underline [&_a:hover]:underline-offset-4"
            aria-labelledby="shop-footer"
          >
            <h2 id="shop-footer">Shop</h2>
            <Link href="/shop">Shop supplies</Link>
            <Link href="/about">About OralNex</Link>
          </nav>
          <nav
            className="flex min-w-0 flex-col items-start text-left [&_h2]:mb-2 [&_h2]:text-sm [&_h2]:font-semibold [&_h2]:tracking-normal [&_h2]:text-[#172d36] [&_a]:inline-flex [&_a]:min-h-11 [&_a]:max-w-full [&_a]:items-center [&_a]:text-[13px] [&_a]:leading-5 [&_a]:text-slate-600 [&_a]:no-underline [&_a]:transition-colors [&_a:hover]:text-[#08788c] [&_a:hover]:underline [&_a:hover]:underline-offset-4"
            aria-labelledby="care-footer"
          >
            <h2 id="care-footer">Customer Care</h2>
            <Link href="/contact">Contact Us</Link>
            <Link href="/shipping-policy">Shipping &amp; Returns</Link>
          </nav>
          <nav
            className="flex min-w-0 flex-col items-start text-left [&_h2]:mb-2 [&_h2]:text-sm [&_h2]:font-semibold [&_h2]:tracking-normal [&_h2]:text-[#172d36] [&_a]:inline-flex [&_a]:min-h-11 [&_a]:max-w-full [&_a]:items-center [&_a]:text-[13px] [&_a]:leading-5 [&_a]:text-slate-600 [&_a]:no-underline [&_a]:transition-colors [&_a:hover]:text-[#08788c] [&_a:hover]:underline [&_a:hover]:underline-offset-4"
            aria-labelledby="legal-footer"
          >
            <h2 id="legal-footer">Legal</h2>
            <Link href="/privacy-policy">Privacy Policy</Link>
            <Link href="/terms-of-service">Terms of Service</Link>
          </nav>
        </div>
        <div className="flex flex-col gap-4 border-t border-slate-200 pt-5 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs leading-5 text-slate-500">
            © {new Date().getFullYear()} OralNex. All rights reserved.
          </p>
          <section aria-labelledby="payment-footer">
            <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
              <h2 className="text-xs font-medium text-slate-500" id="payment-footer">
                Secure payments
              </h2>
              <div className="flex flex-wrap items-center gap-2" aria-label="Card payment brands">
                <span className="grid h-9 w-[56px] place-items-center overflow-hidden rounded-md border border-slate-200 bg-white">
                  <Image src="/payment-visa.svg" alt="Visa" width={56} height={36} loading="lazy" />
                </span>
                <span className="grid h-9 w-[56px] place-items-center overflow-hidden rounded-md border border-slate-200 bg-white">
                  <Image
                    src="/payment-mastercard.svg"
                    alt="Mastercard"
                    width={56}
                    height={36}
                    loading="lazy"
                  />
                </span>
                <span className="grid h-9 w-[56px] place-items-center overflow-hidden rounded-md border border-slate-200 bg-white">
                  <Image
                    src="/payment-amex.svg"
                    alt="American Express"
                    width={56}
                    height={36}
                    loading="lazy"
                  />
                </span>
              </div>
            </div>
          </section>
        </div>
      </div>
    </footer>
  );
}
