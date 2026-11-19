import Image from "next/image";
import Link from "next/link";

export function StaticHero() {
  return (
    <div className="grid w-full overflow-hidden bg-white lg:grid-cols-2">
      <div className="flex min-w-0 flex-col justify-center px-[clamp(1rem,4vw,5rem)] py-10 sm:py-14 lg:py-20">
        <p className="flex items-center gap-3 text-xs font-semibold uppercase leading-5 text-[#08788c]">
          <span className="h-0.5 w-8 shrink-0 bg-[#0e96aa]" aria-hidden="true" />
          Everyday care, made simple
        </p>
        <h1 className="mt-5 max-w-[17ch] text-4xl font-semibold leading-[1.08] text-[#172d36] sm:mt-6 sm:text-5xl lg:text-6xl">
          Essential Medical Equipment
        </h1>
        <Link
          href="/shop"
          className="mt-8 inline-flex min-h-13 w-fit items-center gap-6 rounded-lg bg-[#08788c] px-7 text-sm font-semibold text-white no-underline transition-colors hover:bg-[#066678] focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-[#08788c] sm:mt-9"
        >
          Shop by category <span aria-hidden="true">&rarr;</span>
        </Link>
      </div>
      <div className="relative aspect-[4/3] min-w-0 lg:aspect-auto lg:min-h-[560px]">
        <Image
          src="/hero.jpeg"
          alt="OralNex examination gloves and surgical face masks in a clinical workspace"
          fill
          preload
          sizes="(min-width: 1024px) 50vw, 100vw"
          className="object-cover object-center"
        />
      </div>
    </div>
  );
}
