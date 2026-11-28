"use client";

import { useEffect, useState } from "react";
import type { CSSProperties } from "react";

const benefits = [
  {
    title: "Focused essentials",
    description: "Shop nitrile exam gloves and surgical face masks in one place.",
    icon: (
      <svg
        viewBox="0 0 32 32"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        aria-hidden="true"
      >
        <path d="M16 3 29 10v12L16 29 3 22V10L16 3Z" />
        <path d="m3 10 13 7 13-7M16 17v12M10 7l13 7" />
      </svg>
    ),
  },
  {
    title: "Clear ordering",
    description: "Review product details, box quantities, and prices before checkout.",
    icon: (
      <svg
        viewBox="0 0 32 32"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        aria-hidden="true"
      >
        <rect x="7" y="4" width="18" height="25" rx="2" />
        <path d="M12 4.5h8M11 12h10M11 17h10M11 22h6" />
      </svg>
    ),
  },
  {
    title: "A team you can reach",
    description: "Call us with questions about products, orders, or delivery.",
    icon: (
      <svg
        viewBox="0 0 32 32"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        aria-hidden="true"
      >
        <path d="M26 22.5v3a2 2 0 0 1-2.2 2A23 23 0 0 1 4.5 8.2 2 2 0 0 1 6.5 6h3a2 2 0 0 1 2 1.7l.5 3a2 2 0 0 1-.6 1.8l-1.7 1.7a18 18 0 0 0 8.1 8.1l1.7-1.7a2 2 0 0 1 1.8-.6l3 .5a2 2 0 0 1 1.7 2.1Z" />
      </svg>
    ),
  },
];

export function HomeBenefits() {
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    const interval = window.setInterval(() => {
      if (
        document.hidden ||
        !window.matchMedia("(max-width: 767px)").matches ||
        window.matchMedia("(prefers-reduced-motion: reduce)").matches
      ) {
        return;
      }
      setActiveIndex((index) => (index + 1) % benefits.length);
    }, 4500);

    return () => window.clearInterval(interval);
  }, []);

  return (
    <section className="bg-[#075c6b] py-9 text-white sm:py-11" aria-label="Why shop with OralNex">
      <div className="home-container">
        <div className="overflow-hidden md:overflow-visible">
          <div
            className="home-benefits-track flex motion-safe:transition-transform motion-safe:duration-700 motion-safe:ease-in-out md:grid md:grid-cols-3 md:gap-8"
            style={{ "--benefit-index": activeIndex } as CSSProperties}
          >
            {benefits.map((benefit) => (
              <article
                className="flex w-full shrink-0 items-start gap-4 px-1 md:w-auto md:shrink"
                key={benefit.title}
              >
                <span className="grid size-12 shrink-0 place-items-center rounded-full bg-white text-[#075c6b] [&_svg]:size-6">
                  {benefit.icon}
                </span>
                <div>
                  <h2 className="text-base font-semibold leading-6">{benefit.title}</h2>
                  <p className="mt-1 max-w-[32ch] text-sm leading-6 text-white/85">
                    {benefit.description}
                  </p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
