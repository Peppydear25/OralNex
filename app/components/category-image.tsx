"use client";

import Image from "next/image";
import { useState } from "react";

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
      unoptimized={!failed && src.startsWith("https://")}
      onError={() => setFailed(true)}
    />
  );
}
