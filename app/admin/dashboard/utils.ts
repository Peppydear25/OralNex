export const money = (value: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(value);

export const slugify = (value: string) =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

const imageValidationMessages = new Set([
  "Choose a JPG, PNG, or WebP image.",
  "Image must be smaller than 8 MB.",
  "Choose a JPG, PNG, WebP, or AVIF image.",
  "Hero images must be 3 MB or smaller.",
  "The image could not be read.",
  "Hero images must be at least 600 × 500 pixels.",
]);

export function imagePreparationMessage(error: unknown, fallback: string) {
  return error instanceof Error && imageValidationMessages.has(error.message)
    ? error.message
    : fallback;
}

export async function prepareImage(file: File) {
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
    throw new Error("Choose a JPG, PNG, or WebP image.");
  }
  if (file.size > 8 * 1024 * 1024) {
    throw new Error("Image must be smaller than 8 MB.");
  }

  const source = URL.createObjectURL(file);
  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const element = new window.Image();
      element.onload = () => resolve(element);
      element.onerror = () => reject(new Error("The image could not be read."));
      element.src = source;
    });
    const scale = Math.min(1, 1400 / Math.max(image.naturalWidth, image.naturalHeight));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
    canvas.getContext("2d")?.drawImage(image, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/webp", 0.82);
  } finally {
    URL.revokeObjectURL(source);
  }
}
