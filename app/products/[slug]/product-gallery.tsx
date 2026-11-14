"use client";

import Image from "next/image";
import { useState } from "react";

type Props = {
  name: string;
  images: string[];
  onSale: boolean;
};

export function ProductGallery({ name, images, onSale }: Props) {
  const [selected, setSelected] = useState(0);
  const activeImage = images[selected] ?? images[0] ?? "/logo.jpg";

  return (
    <div>
      <div className="group relative h-[400px] w-full max-w-[620px] overflow-hidden max-sm:h-[280px] [&>span]:absolute [&>span]:left-5 [&>span]:top-5 [&>span]:z-20 [&>span]:rounded-full [&>span]:bg-[#e65345] [&>span]:px-3 [&>span]:py-2 [&>span]:text-xs [&>span]:font-bold [&>span]:text-white">
        <Image
          className="z-10 object-cover object-center transition-transform duration-500 motion-safe:group-hover:scale-[1.015]"
          src={activeImage}
          alt={`${name} – image ${selected + 1}`}
          fill
          preload={selected === 0}
          quality={75}
          sizes="(max-width: 1023px) calc(100vw - 28px), (max-width: 1328px) 50vw, 620px"
        />
        {onSale && <span>Sale</span>}
      </div>
      {images.length > 1 && (
        <div
          className="mt-3 flex gap-2.5 overflow-x-auto pb-1 [&_button]:flex [&_button]:size-[72px] [&_button]:shrink-0 [&_button]:items-center [&_button]:justify-center [&_button]:rounded-lg [&_button]:border [&_button]:border-slate-200 [&_button]:bg-white [&_button]:overflow-hidden [&_img]:h-full [&_img]:w-full [&_img]:object-cover"
          aria-label={`${name} images`}
        >
          {images.map((image, index) => (
            <button
              className={
                selected === index
                  ? "border-[#0e96aa]! ring-2 ring-cyan-100"
                  : "hover:border-slate-400"
              }
              type="button"
              key={`${image}-${index}`}
              onClick={() => setSelected(index)}
              aria-label={`View image ${index + 1}`}
              aria-pressed={selected === index}
            >
              <Image src={image} alt="" width={72} height={72} />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
