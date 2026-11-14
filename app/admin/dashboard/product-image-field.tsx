import Image from "next/image";

type Props = {
  images: string[];
  error: string;
  onUpload: (files: FileList | null) => void;
  onRemove: (index: number) => void;
};

export function ProductImageField({ images, error, onUpload, onRemove }: Props) {
  return (
    <div className="col-span-2 grid gap-2 text-sm font-semibold max-sm:col-span-1">
      <span>Product images</span>
      <label className="flex min-h-28 cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-cyan-200 bg-cyan-50/40 p-5 text-[#08788c] transition hover:border-[#0e96aa] hover:bg-cyan-50 [&_small]:text-xs [&_small]:font-normal [&_small]:text-slate-500">
        <input
          className="sr-only"
          type="file"
          accept="image/png,image/jpeg,image/webp"
          multiple
          onChange={(event) => onUpload(event.target.files)}
        />
        <b>＋ Upload product images</b>
        <small>JPG, PNG or WebP. Up to 6 images, 8 MB each.</small>
      </label>

      {error && <p className="rounded-md bg-red-50 p-3 text-xs text-red-700">{error}</p>}

      <div className="grid grid-cols-6 gap-2 max-lg:grid-cols-4 max-sm:grid-cols-3 [&>div]:relative [&>div]:aspect-square [&>div]:overflow-hidden [&>div]:rounded-xl [&>div]:border [&>div]:border-slate-200 [&>div]:bg-slate-50 [&_button]:absolute [&_button]:right-1 [&_button]:top-1 [&_button]:grid [&_button]:size-7 [&_button]:place-items-center [&_button]:rounded-full [&_button]:bg-slate-900/85 [&_button]:text-white [&_img]:h-full [&_img]:w-full [&_img]:object-cover ">
        {images.map((image, index) => (
          <div key={`${image.slice(-30)}-${index}`}>
            <Image
              src={image}
              alt={`Product preview ${index + 1}`}
              width={100}
              height={100}
              unoptimized={image.startsWith("data:")}
            />
            {index === 0 && (
              <span className="absolute bottom-1 left-1 rounded-md bg-[#08788c] px-2 py-1 text-[10px] font-bold text-white">
                Primary
              </span>
            )}
            <button
              type="button"
              onClick={() => onRemove(index)}
              aria-label={`Remove image ${index + 1}`}
            >
              ×
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
