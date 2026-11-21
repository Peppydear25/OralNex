"use client";

import Image from "next/image";
import { useState } from "react";

/** Match the public storage allowlist used by Next's image optimizer. */
export function canOptimizeCategoryImage(src: string) {
  if (src.startsWith("/") && !src.startsWith("//")) return true;
  try {
    const image = new URL(src);
    const project = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "");
    return (
      image.origin === project.origin &&
      image.pathname.startsWith("/storage/v1/object/public/product-media/") &&
      !image.search
    );
  } catch {
    return false;
  }
}

export function CategoryImage({
  src,
  alt = "",
  sizes = "(min-width: 1740px) 788px, (min-width: 640px) 48vw, 94vw",
  animate = false,
  loading,
}: {
  src: string;
  alt?: string;
  sizes?: string;
  animate?: boolean;
  loading?: "eager" | "lazy";
}) {
  const [failed, setFailed] = useState(false);
  const imageSrc = failed ? "/logo.jpg" : src;

  return (
    <Image
      className={
        failed
          ? "object-contain p-8"
          : animate
            ? "object-cover motion-safe:transition-transform motion-safe:duration-300 motion-safe:group-hover:scale-[1.025] motion-safe:group-focus-visible:scale-[1.025]"
            : "object-cover"
      }
      src={imageSrc}
      alt={alt}
      fill
      sizes={sizes}
      loading={loading}
      unoptimized={!canOptimizeCategoryImage(imageSrc)}
      onError={() => setFailed(true)}
    />
  );
}
