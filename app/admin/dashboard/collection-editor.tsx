"use client";

import Image from "next/image";
import { FormEvent, useState } from "react";
import type { Collection, Product } from "../../data/catalog";
import { useOverlayBehavior } from "../../hooks/use-overlay-behavior";
import { imagePreparationMessage, prepareImage, slugify } from "./utils";
import { LoadingIndicator } from "../../components/loading-indicator";

type Props = {
  collection?: Collection;
  products: Product[];
  onClose: () => void;
  onSave: (
    value: Collection,
    previous: string | undefined,
    productIds: number[],
  ) => void | Promise<void>;
};

export function CollectionEditor({ collection, products, onClose, onSave }: Props) {
  useOverlayBehavior(true, onClose);
  const [image, setImage] = useState(collection?.image ?? "");
  const [imageError, setImageError] = useState("");
  const [saving, setSaving] = useState(false);
  const [selectedProducts, setSelectedProducts] = useState<number[]>(() =>
    products
      .filter((product) => product.category === collection?.name)
      .map((product) => product.id),
  );
  const uploadImage = async (file: File | undefined) => {
    if (!file) return;
    setImageError("");
    try {
      setImage(await prepareImage(file));
    } catch (error) {
      setImageError(
        imagePreparationMessage(error, "The image could not be prepared. Try another file."),
      );
    }
  };
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const name = String(data.get("name") ?? "").trim();
    if (!image) {
      setImageError("Upload a category image before saving.");
      return;
    }
    setSaving(true);
    try {
      await onSave(
        {
          databaseId: collection?.databaseId,
          imagePath: image === collection?.image ? collection.imagePath : image,
          name,
          slug: slugify(name),
          image,
        },
        collection?.slug,
        selectedProducts,
      );
    } finally {
      setSaving(false);
    }
  };
  const toggleProduct = (id: number) =>
    setSelectedProducts(
      selectedProducts.includes(id)
        ? selectedProducts.filter((item) => item !== id)
        : [...selectedProducts, id],
    );

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center overflow-auto bg-slate-950/60 p-6 backdrop-blur-sm">
      <section
        className="m-auto w-full max-w-[560px] overflow-hidden rounded-lg bg-white shadow-2xl [&>header]:flex [&>header]:items-center [&>header]:justify-between [&>header]:border-b [&>header]:border-slate-200 [&>header]:px-5 [&>header]:py-4 [&>header_h2]:text-xl [&>header_h2]:font-semibold [&>header_h2]:leading-tight [&>header>button]:grid [&>header>button]:size-9 [&>header>button]:place-items-center [&>header>button]:rounded-full [&>header>button]:border [&>header>button]:border-slate-300 [&_footer]:flex [&_footer]:justify-end [&_footer]:gap-2 [&_footer]:border-t [&_footer]:border-slate-200 [&_footer]:px-5 [&_footer]:py-3 [&_footer_button]:rounded-lg [&_footer_button]:border [&_footer_button]:border-slate-300 [&_footer_button]:px-4 [&_footer_button]:py-2"
        role="dialog"
        aria-modal="true"
        aria-labelledby="category-editor-title"
      >
        <header>
          <h2 id="category-editor-title">{collection ? "Edit category" : "Add category"}</h2>
          <button type="button" onClick={onClose} aria-label="Close editor">
            ×
          </button>
        </header>
        <form onSubmit={submit}>
          <div className="grid max-h-[70vh] min-w-0 grid-cols-2 gap-4 overflow-auto p-5 max-sm:grid-cols-1 max-sm:p-4 [&>label]:grid [&>label]:min-w-0 [&>label]:gap-2 [&>label]:text-sm [&>label]:font-semibold [&_input]:h-11 [&_input]:min-w-0 [&_input]:rounded-lg [&_input]:border [&_input]:border-slate-300 [&_input]:px-3 ">
            <label className="col-span-2 max-sm:col-span-1">
              Category name
              <input name="name" defaultValue={collection?.name} required maxLength={70} />
            </label>
            <div className="col-span-2 max-sm:col-span-1 grid gap-2 text-sm font-semibold">
              <span>Category image</span>
              {!image && (
                <label className="flex min-h-20 cursor-pointer items-center justify-center rounded-lg border-2 border-dashed border-cyan-200 bg-cyan-50/50 p-4 text-[#08788c]">
                  <input
                    className="sr-only"
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    onChange={(event) => uploadImage(event.target.files?.[0])}
                  />
                  Upload image
                </label>
              )}
              {imageError && (
                <p className="rounded-md bg-red-50 p-3 text-xs text-red-700">{imageError}</p>
              )}
              {image && (
                <div className="flex items-center gap-3 rounded-lg border border-slate-200 p-2 [&_img]:h-16 [&_img]:w-24 [&_img]:rounded-md [&_img]:object-cover [&_button]:text-sm [&_button]:text-red-600">
                  <Image
                    src={image}
                    alt="Category preview"
                    width={180}
                    height={120}
                    unoptimized={image.startsWith("data:")}
                  />
                  <label className="ml-auto cursor-pointer rounded-md border border-slate-300 px-3 py-2 text-xs font-semibold text-[#08788c]">
                    <input
                      className="sr-only"
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      onChange={(event) => uploadImage(event.target.files?.[0])}
                    />
                    Replace
                  </label>
                  <button type="button" onClick={() => setImage("")}>
                    Remove
                  </button>
                </div>
              )}
            </div>
            <fieldset className="col-span-2 min-w-0 border-0 max-sm:col-span-1 [&_legend]:w-full [&_legend]:font-semibold [&_legend_span]:float-right [&>p]:my-2 [&>p]:text-xs [&>p]:text-slate-500 [&>div]:mt-3 [&>div]:max-h-72 [&>div]:overflow-auto [&>div]:rounded-lg [&>div]:border [&>div]:border-slate-200 [&>div>label]:flex [&>div>label]:items-center [&>div>label]:gap-3 [&>div>label]:border-t [&>div>label]:border-slate-100 [&>div>label]:p-2 [&_input]:size-4 [&_input]:shrink-0 [&_input]:accent-[#08788c] [&_img]:shrink-0 [&_img]:size-11 [&_img]:object-cover">
              <legend>
                Products in this category{" "}
                <span className="text-xs font-normal text-slate-500">
                  {selectedProducts.length} selected
                </span>
              </legend>
              <div>
                {products.map((product) => (
                  <label key={product.id}>
                    <input
                      type="checkbox"
                      checked={selectedProducts.includes(product.id)}
                      onChange={() => toggleProduct(product.id)}
                    />
                    <Image
                      src={product.image}
                      alt=""
                      width={42}
                      height={42}
                      unoptimized={product.image.startsWith("data:")}
                    />
                    <span className="grid min-w-0 gap-1 py-1">
                      <strong className="break-words text-sm font-medium leading-5">
                        {product.name}
                      </strong>
                      <small className="text-xs font-normal text-slate-500">
                        {product.category}
                      </small>
                    </span>
                  </label>
                ))}
              </div>
            </fieldset>
          </div>
          <footer>
            <button type="button" onClick={onClose}>
              Cancel
            </button>
            <button
              className="bg-[#08788c]! text-white! disabled:cursor-wait disabled:opacity-65"
              type="submit"
              disabled={saving}
            >
              {saving ? <LoadingIndicator label="Saving category…" /> : "Save category"}
            </button>
          </footer>
        </form>
      </section>
    </div>
  );
}
