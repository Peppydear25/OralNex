export type BulkPricingTier = { minQuantity: number; discountPercent: number };
export type ProductOption = { name: string; values: string[] };
export type ProductVariant = {
  id: string;
  options: Record<string, string>;
  sku?: string;
  inventory: number;
};

export type ProductPackaging = {
  piecesPerBox: number;
  boxesPerCarton: number;
};

export type ProductShipping = {
  weightOunces: number;
  lengthInches: number;
  widthInches: number;
  heightInches: number;
  unitsPerPackage: number;
};

export type Product = {
  id: number;
  databaseId?: string;
  imagePaths?: string[];
  slug: string;
  name: string;
  category: string;
  type: string;
  price: number;
  oldPrice: number | null;
  image: string;
  images?: string[];
  stock: boolean;
  inventory?: number;
  status?: "active" | "draft";
  sku?: string;
  summary: string;
  description: string;
  features: string[];
  specifications: { label: string; value: string }[];
  sizes?: string[];
  colors?: string[];
  options?: ProductOption[];
  variants?: ProductVariant[];
  bulkPricing?: BulkPricingTier[];
  packaging?: ProductPackaging;
  shipping?: ProductShipping;
  automaticPacking?: import("../../lib/shipping/automatic-packing").AutomaticPacking;
  shippingProfiles?: import("../../lib/shipping/package-profiles").PackageProfile[];
};

export type Collection = {
  databaseId?: string;
  imagePath?: string;
  slug: string;
  name: string;
  image: string;
};

export const products: Product[] = [
  {
    id: 3,
    slug: "nitrile-exam-gloves",
    name: "Nitrile Exam Gloves",
    category: "Gloves",
    type: "Exam gloves",
    price: 18,
    oldPrice: 24,
    image: "/logo.jpg",
    stock: true,
    sizes: ["Small", "Medium", "Large"],
    colors: ["Blue", "Black"],
    inventory: 500,
    packaging: { piecesPerBox: 200, boxesPerCarton: 10 },
    variants: [
      {
        id: "size-small_color-blue",
        options: { Size: "Small", Color: "Blue" },
        sku: "ON-0003-S-BLU",
        inventory: 90,
      },
      {
        id: "size-small_color-black",
        options: { Size: "Small", Color: "Black" },
        sku: "ON-0003-S-BLK",
        inventory: 60,
      },
      {
        id: "size-medium_color-blue",
        options: { Size: "Medium", Color: "Blue" },
        sku: "ON-0003-M-BLU",
        inventory: 100,
      },
      {
        id: "size-medium_color-black",
        options: { Size: "Medium", Color: "Black" },
        sku: "ON-0003-M-BLK",
        inventory: 70,
      },
      {
        id: "size-large_color-blue",
        options: { Size: "Large", Color: "Blue" },
        sku: "ON-0003-L-BLU",
        inventory: 110,
      },
      {
        id: "size-large_color-black",
        options: { Size: "Large", Color: "Black" },
        sku: "ON-0003-L-BLK",
        inventory: 70,
      },
    ],
    bulkPricing: [
      { minQuantity: 10, discountPercent: 5 },
      { minQuantity: 25, discountPercent: 10 },
      { minQuantity: 50, discountPercent: 15 },
    ],
    summary:
      "Disposable nitrile examination gloves for dental, clinical, workplace, and general single-use protection.",
    description:
      "These disposable nitrile examination gloves provide a practical barrier for dental procedures, routine clinical examinations, cleaning tasks, and general workplace use. Flexible nitrile supports dexterity and tactile handling while providing a latex-free glove option for appropriate users.",
    features: [],
    specifications: [
      { label: "Material", value: "Nitrile" },
      { label: "Fit", value: "Ambidextrous" },
      { label: "Finish", value: "Textured fingertips" },
      { label: "Use", value: "Single use" },
    ],
  },
  {
    id: 9,
    slug: "disposable-face-mask",
    name: "Disposable Face Mask",
    category: "Masks",
    type: "Face masks",
    price: 12,
    oldPrice: 15,
    image: "/logo.jpg",
    stock: true,
    sizes: ["One Size"],
    colors: ["Blue"],
    inventory: 800,
    packaging: { piecesPerBox: 500, boxesPerCarton: 40 },
    variants: [
      {
        id: "size-one-size_color-blue",
        options: { Size: "One Size", Color: "Blue" },
        sku: "ON-0009-OS-BLU",
        inventory: 800,
      },
    ],
    bulkPricing: [
      { minQuantity: 10, discountPercent: 5 },
      { minQuantity: 25, discountPercent: 10 },
      { minQuantity: 50, discountPercent: 15 },
    ],
    summary:
      "Blue disposable surgical face masks for dental, clinical, workplace, and everyday care settings.",
    description:
      "These single-use blue surgical face masks feature a pleated design, flexible nose strip, and soft ear loops for comfortable use in dental practices, clinics, workplaces, and everyday care settings. Dispose of each mask after use and follow applicable workplace or care-setting guidance.",
    features: [],
    specifications: [{ label: "Use", value: "Single use" }],
  },
];

export const collections: Collection[] = [
  {
    slug: "gloves",
    name: "Gloves",
    image: "/logo.jpg",
  },
  {
    slug: "masks",
    name: "Masks",
    image: "/logo.jpg",
  },
];
