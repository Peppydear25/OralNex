import Image from "next/image";

export function StaticHero() {
  return (
    <div className="grid w-full overflow-hidden bg-white lg:grid-cols-2">
      <div className="flex min-w-0 flex-col justify-center px-[clamp(1rem,4vw,5rem)] py-10 sm:py-14 lg:py-20">
        <p className="flex items-center gap-3 text-xs font-semibold uppercase leading-5 text-[#08788c]">
          <span className="h-0.5 w-8 shrink-0 bg-[#0e96aa]" aria-hidden="true" />
          Outlasting the middle man
        </p>
        <h1 className="mt-5 max-w-[18ch] text-4xl font-medium leading-[1.08] text-[#172d36] sm:mt-6 sm:text-5xl lg:text-6xl">
          Nitrile Exam Gloves &amp; Surgical Face Masks
        </h1>
        <p className="mt-5 max-w-[48ch] text-sm leading-6 text-slate-600 sm:text-base sm:leading-7">
          Shop disposable gloves and face masks for dental practices, clinics, and everyday care.
        </p>
      </div>
      <div className="relative aspect-[4/3] min-w-0 lg:aspect-auto lg:min-h-[560px]">
        <picture className="absolute inset-0 block">
          <source media="(max-width: 1023px)" srcSet="/hero-mobile.webp" type="image/webp" />
          <Image
            src="/hero.webp"
            alt="OralNex examination gloves and surgical face masks in a clinical workspace"
            fill
            loading="eager"
            fetchPriority="high"
            sizes="(min-width: 1024px) 50vw, 100vw"
            className="object-cover object-center"
          />
        </picture>
      </div>
    </div>
  );
}
