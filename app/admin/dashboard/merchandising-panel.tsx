"use client";

import Image from "next/image";
import { useState } from "react";
import type { Merchandising } from "../../data/catalog-store";
import { imagePreparationMessage, prepareHeroImage } from "./utils";

type Props = {
  merchandising: Merchandising;
  onSave: (value: Merchandising) => Promise<void>;
  saved: boolean;
  saving: boolean;
};

export function MerchandisingPanel({ merchandising, onSave, saved, saving }: Props) {
  const maxSlides = 3;
  const [draft, setDraft] = useState({ ...merchandising, dealProductIds: [] });
  const [imageError, setImageError] = useState("");
  const [preparingImage, setPreparingImage] = useState(false);
  const uploadHeroImage = async (file: File | undefined, index?: number) => {
    if (!file || preparingImage) return;
    if (index === undefined && draft.heroSlides.length >= maxSlides) {
      setImageError(`You can add up to ${maxSlides} homepage slides.`);
      return;
    }
    setImageError("");
    setPreparingImage(true);
    try {
      const image = await prepareHeroImage(file);
      setDraft((current) => ({
        ...current,
        heroSlides:
          index === undefined
            ? [
                ...current.heroSlides,
                {
                  desktopImage: image,
                  mobileImage: image,
                  alt: "",
                  published: false,
                },
              ].slice(0, maxSlides)
            : current.heroSlides.map((slide, itemIndex) =>
                itemIndex === index ? { ...slide, desktopImage: image, mobileImage: image } : slide,
              ),
      }));
    } catch (error) {
      setImageError(
        imagePreparationMessage(
          error,
          "The slideshow image could not be prepared. Try another file.",
        ),
      );
    } finally {
      setPreparingImage(false);
    }
  };
  const removeHeroImage = (index: number) =>
    setDraft((current) => ({
      ...current,
      heroSlides: current.heroSlides.filter((_, itemIndex) => itemIndex !== index),
    }));
  const moveHeroImage = (index: number, direction: -1 | 1) =>
    setDraft((current) => {
      const target = index + direction;
      if (target < 0 || target >= current.heroSlides.length) return current;
      const heroSlides = [...current.heroSlides];
      [heroSlides[index], heroSlides[target]] = [heroSlides[target], heroSlides[index]];
      return { ...current, heroSlides };
    });

  const publish = () => {
    if (saving || preparingImage) return;
    if (draft.heroSlides.length > maxSlides) {
      setImageError(`Keep no more than ${maxSlides} homepage slides before publishing.`);
      return;
    }
    if (!draft.heroSlides.some((slide) => slide.published)) {
      setImageError("Publish at least one hero slide before saving.");
      return;
    }
    if (draft.heroSlides.some((slide) => slide.alt.trim().length < 5)) {
      setImageError("Add descriptive alt text of at least 5 characters to every slide.");
      return;
    }
    setImageError("");
    onSave(draft);
  };

  return (
    <div className="mx-auto grid w-full max-w-[1440px] gap-5 px-8 py-6 max-sm:px-4 max-sm:py-5">
      <div>
        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <div className="grid gap-5 p-5 max-sm:p-4 [&_input[type=text]]:h-11 [&_input[type=text]]:rounded-lg [&_input[type=text]]:border [&_input[type=text]]:border-slate-300 [&_input[type=text]]:px-3 [&_textarea]:rounded-lg [&_textarea]:border [&_textarea]:border-slate-300 [&_textarea]:p-3">
            <fieldset>
              <legend className="sr-only">Homepage slide images</legend>
              {preparingImage && <p className="mb-3 text-xs text-slate-600">Preparing image…</p>}
              {imageError && (
                <p className="mb-3 rounded-lg bg-red-50 p-3 text-xs text-red-700">{imageError}</p>
              )}
              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {draft.heroSlides.map((slide, index) => (
                  <div
                    className="flex min-w-0 flex-col overflow-hidden rounded-xl border border-slate-200"
                    key={`${slide.desktopImage.slice(0, 80)}-${index}`}
                  >
                    <HeroImageControl
                      image={slide.desktopImage}
                      disabled={preparingImage}
                      onChange={(file) => uploadHeroImage(file, index)}
                    />
                    <div className="flex flex-1 flex-col gap-2.5 p-3">
                      <strong className="text-sm">Slide {index + 1}</strong>
                      <label className="grid min-w-0 gap-1 text-xs font-semibold text-slate-700">
                        Alt text
                        <input
                          className="h-10 min-w-0 w-full rounded-lg border border-slate-300 px-3 text-sm font-normal"
                          type="text"
                          value={slide.alt ?? ""}
                          maxLength={160}
                          placeholder="Describe this image"
                          onChange={(event) =>
                            setDraft((current) => ({
                              ...current,
                              heroSlides: current.heroSlides.map((item, itemIndex) =>
                                itemIndex === index ? { ...item, alt: event.target.value } : item,
                              ),
                            }))
                          }
                        />
                      </label>
                      <div className="mt-auto flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-2.5">
                        <label className="flex items-center gap-2 text-xs font-semibold">
                          <input
                            className="size-4 accent-[#08788c]"
                            type="checkbox"
                            checked={slide.published}
                            onChange={(event) =>
                              setDraft((current) => ({
                                ...current,
                                heroSlides: current.heroSlides.map((item, itemIndex) =>
                                  itemIndex === index
                                    ? { ...item, published: event.target.checked }
                                    : item,
                                ),
                              }))
                            }
                          />
                          Show on homepage
                        </label>
                        <div className="flex gap-1">
                          <button
                            className="rounded-md border border-slate-300 px-2 py-1 text-xs disabled:cursor-not-allowed disabled:opacity-35"
                            type="button"
                            disabled={preparingImage || index === 0}
                            onClick={() => moveHeroImage(index, -1)}
                            aria-label={`Move hero image ${index + 1} earlier`}
                          >
                            ↑
                          </button>
                          <button
                            className="rounded-md border border-slate-300 px-2 py-1 text-xs disabled:cursor-not-allowed disabled:opacity-35"
                            type="button"
                            disabled={preparingImage || index === draft.heroSlides.length - 1}
                            onClick={() => moveHeroImage(index, 1)}
                            aria-label={`Move hero image ${index + 1} later`}
                          >
                            ↓
                          </button>
                          <button
                            className="rounded-md border border-red-200 px-2 py-1 text-xs text-red-600 disabled:cursor-not-allowed disabled:opacity-35"
                            type="button"
                            disabled={preparingImage || draft.heroSlides.length === 1}
                            onClick={() => removeHeroImage(index)}
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
                {draft.heroSlides.length < maxSlides && (
                  <label className="flex min-h-32 cursor-pointer items-center justify-center rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 p-4 text-center text-sm font-semibold text-[#08788c] transition hover:border-[#0a8d99] hover:bg-[#eefafa]">
                    + Add slide image
                    <input
                      className="sr-only"
                      type="file"
                      accept="image/png,image/jpeg,image/webp,image/avif"
                      disabled={preparingImage}
                      onChange={(event) => {
                        void uploadHeroImage(event.target.files?.[0]);
                        event.target.value = "";
                      }}
                    />
                  </label>
                )}
              </div>
            </fieldset>
            <div className="grid gap-4 border-t border-slate-200 pt-5 md:grid-cols-2">
              <label className="grid min-w-0 gap-2 text-sm font-semibold">
                Eyebrow
                <input
                  className="min-w-0 w-full"
                  type="text"
                  value={draft.heroEyebrow ?? ""}
                  onChange={(event) => setDraft({ ...draft, heroEyebrow: event.target.value })}
                  maxLength={60}
                />
              </label>
              <label className="grid min-w-0 gap-2 text-sm font-semibold">
                Headline
                <textarea
                  className="min-w-0 w-full"
                  rows={1}
                  value={draft.heroTitle ?? ""}
                  onChange={(event) => setDraft({ ...draft, heroTitle: event.target.value })}
                  maxLength={90}
                />
              </label>
            </div>
          </div>
        </section>
      </div>
      <div className="flex items-center justify-end gap-4 max-sm:flex-col max-sm:items-stretch [&_p]:text-sm [&_button]:rounded-lg [&_button]:bg-[#08788c] [&_button]:px-4 [&_button]:py-2.5 [&_button]:font-semibold [&_button]:text-white">
        {saved && <p className="mr-auto text-emerald-700">Changes published.</p>}
        <button
          type="button"
          onClick={publish}
          disabled={saving || preparingImage}
          aria-busy={saving || preparingImage}
          className="inline-flex items-center justify-center gap-2 disabled:cursor-wait disabled:opacity-70"
        >
          {saving && (
            <span
              aria-hidden="true"
              className="size-4 animate-spin rounded-full border-2 border-white/40 border-t-white"
            />
          )}
          {saving ? "Publishing…" : "Publish changes"}
        </button>
      </div>
    </div>
  );
}

function HeroImageControl({
  image,
  disabled,
  onChange,
}: {
  image: string;
  disabled: boolean;
  onChange: (file?: File) => void;
}) {
  return (
    <div className="relative bg-slate-50">
      <span className="relative block h-32 overflow-hidden bg-slate-100">
        <Image
          className="object-contain"
          src={image || "/logo.jpg"}
          alt=""
          fill
          unoptimized={image.startsWith("data:")}
          sizes="(max-width: 768px) 90vw, (max-width: 1024px) 45vw, (max-width: 1280px) 30vw, 23vw"
        />
      </span>
      <span className="absolute bottom-2 right-2">
        <label className="inline-block cursor-pointer rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-bold text-[#08788c] shadow-sm">
          Replace
          <input
            className="sr-only"
            type="file"
            accept="image/png,image/jpeg,image/webp,image/avif"
            disabled={disabled}
            onChange={(event) => {
              onChange(event.target.files?.[0]);
              event.target.value = "";
            }}
          />
        </label>
      </span>
    </div>
  );
}
