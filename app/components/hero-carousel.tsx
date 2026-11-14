"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import type { HeroSlide } from "../data/catalog-state";

type Props = {
  slides: HeroSlide[];
  eyebrow: string;
  title: string;
};

export function HeroCarousel({ slides, eyebrow, title }: Props) {
  const [position, setPosition] = useState(0);
  const [paused, setPaused] = useState(false);
  const publishedSlides = slides.filter((slide) => slide.published).slice(0, 3);
  const count = publishedSlides.length;
  const activeIndex = count ? position % count : 0;
  const activeSlide = publishedSlides[activeIndex];
  const previous = () => setPosition((current) => (current - 1 + count) % count);
  const next = () => setPosition((current) => (current + 1) % count);

  useEffect(() => {
    if (count < 2 || paused) return;
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let timer: ReturnType<typeof setInterval> | undefined;
    const restart = () => {
      clearInterval(timer);
      if (!document.hidden && !motion.matches) {
        timer = setInterval(() => setPosition((current) => (current + 1) % count), 5000);
      }
    };
    restart();
    document.addEventListener("visibilitychange", restart);
    motion.addEventListener("change", restart);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", restart);
      motion.removeEventListener("change", restart);
    };
  }, [count, paused, position]);

  if (!activeSlide) return null;
  return (
    <article
      className="relative grid w-full overflow-hidden bg-white lg:grid-cols-2"
      role="region"
      aria-roledescription="carousel"
      aria-label="Featured medical equipment"
      data-slideshow-paused={paused}
      tabIndex={0}
      onFocusCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setPaused(true);
      }}
      onKeyDown={(event) => {
        if (event.key === "ArrowLeft") previous();
        if (event.key === "ArrowRight") next();
      }}
    >
      <div className="relative order-2 aspect-[4/3] overflow-hidden bg-white sm:aspect-[16/9] lg:aspect-auto lg:min-h-[clamp(460px,36vw,660px)]">
        {publishedSlides.map((slide, index) => (
          <div
            className={`absolute inset-0 overflow-hidden bg-white transition-opacity duration-[900ms] ease-in-out motion-reduce:transition-none ${index === activeIndex ? "hero-slide-active z-10 opacity-100" : "pointer-events-none z-0 opacity-0"}`}
            aria-hidden={index !== activeIndex}
            key={`${slide.desktopImage.slice(0, 80)}-${index}`}
          >
            <HeroSlideImage slide={slide} active={index === activeIndex} priority={index === 0} />
          </div>
        ))}
      </div>
      <div className="order-1 flex min-w-0 flex-col justify-center px-[clamp(1rem,4vw,5rem)] py-10 text-left sm:py-14 lg:py-20">
        <p className="flex items-center gap-3 text-[11px] font-semibold uppercase leading-5 tracking-[.16em] text-[#08788c] sm:text-xs">
          <span className="h-0.5 w-8 shrink-0 rounded-full bg-[#0e96aa]" aria-hidden="true" />
          {eyebrow}
        </p>
        <h1 className="mt-5 max-w-[17ch] text-[clamp(2.125rem,4.1vw,4.25rem)] font-semibold leading-[1.08] tracking-[-.04em] text-[#172d36] sm:mt-6">
          {title}
        </h1>
        <Link
          href="/shop"
          className="group mt-8 inline-flex min-h-13 w-fit items-center gap-4 rounded-lg bg-[#08788c] px-7 text-sm font-semibold text-white no-underline transition-colors hover:bg-[#066678] focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-[#08788c] sm:mt-9"
        >
          Shop by category
          <svg
            className="size-5 motion-safe:transition-transform motion-safe:group-hover:translate-x-1"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M5 12h14m-6-6 6 6-6 6" />
          </svg>
        </Link>
      </div>
      {count > 1 && (
        <button
          className="sr-only focus:not-sr-only focus:absolute focus:bottom-4 focus:right-4 focus:z-20 focus:rounded-lg focus:bg-white focus:px-4 focus:py-3 focus:text-sm focus:text-[#08788c]"
          type="button"
          onClick={() => setPaused((current) => !current)}
        >
          {paused ? "Play slideshow" : "Pause slideshow"}
        </button>
      )}
      <p className="sr-only" aria-live={paused ? "polite" : "off"}>
        Hero image {activeIndex + 1} of {count}
      </p>
    </article>
  );
}

function HeroSlideImage({
  slide,
  active,
  priority,
}: {
  slide: HeroSlide;
  active: boolean;
  priority: boolean;
}) {
  const [imageFailed, setImageFailed] = useState(false);
  const image = imageFailed ? "/logo.jpg" : slide.desktopImage;
  const isLogo = image === "/logo.jpg";

  return (
    <Image
      className={isLogo ? "object-contain object-center" : "object-cover object-center"}
      src={image || "/logo.jpg"}
      alt={active ? slide.alt : ""}
      fill
      loading={priority ? "eager" : "lazy"}
      fetchPriority={priority ? "high" : undefined}
      unoptimized={image.startsWith("data:")}
      sizes="(min-width: 1024px) 50vw, 100vw"
      onError={() => setImageFailed(true)}
    />
  );
}
