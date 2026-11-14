"use client";

import { CategoryImage } from "../../components/category-image";
import type { Collection, Product } from "../../data/catalog";
import { collectionDestination } from "../../data/collection-destination";

type Props = {
  collections: Collection[];
  products: Product[];
  onAdd: () => void;
  onEdit: (collection: Collection) => void;
  onDelete: (collection: Collection) => void;
};

export function CategoriesPanel({ collections, products, onAdd, onEdit, onDelete }: Props) {
  return (
    <div className="mx-auto grid w-full max-w-[1440px] gap-5 px-8 py-6 max-sm:px-4 max-sm:py-5">
      <div className="flex justify-end">
        <button
          className="min-h-11 rounded-lg bg-[#08788c] px-4 text-sm font-semibold text-white transition hover:bg-[#07697a]"
          type="button"
          onClick={onAdd}
        >
          ＋ Add category
        </button>
      </div>
      <section className="grid grid-cols-3 gap-5 max-xl:grid-cols-2 max-sm:grid-cols-1">
        {collections.map((collection) => (
          <article
            key={collection.slug}
            className="overflow-hidden rounded-xl border border-slate-200 bg-white"
          >
            <div className="relative h-40 overflow-hidden bg-slate-50">
              <CategoryImage key={collection.image} src={collection.image} sizes="320px" />
            </div>
            <div className="p-4 [&>span]:text-xs [&>span]:font-semibold [&>span]:text-slate-500 [&_h3]:mt-1 [&_h3]:text-lg [&_h3]:font-semibold [&>div]:mt-4 [&>div]:flex [&>div]:items-center [&>div]:gap-1 [&>div]:border-t [&>div]:pt-3 [&_a]:mr-auto [&_a]:text-xs [&_a]:font-bold [&_button]:rounded [&_button]:px-2 [&_button]:py-1 [&_button]:text-xs">
              <span>
                {products.filter((product) => product.category === collection.name).length}{" "}
                {products.filter((product) => product.category === collection.name).length === 1
                  ? "product"
                  : "products"}
              </span>
              <h3>{collection.name}</h3>
              <div>
                {collectionDestination(collection, products) && (
                  <a
                    href={collectionDestination(collection, products)!}
                    target="_blank"
                    rel="noreferrer"
                  >
                    View product ↗
                  </a>
                )}
                <button type="button" onClick={() => onEdit(collection)}>
                  Edit
                </button>
                <button
                  type="button"
                  className="text-red-600!"
                  onClick={() => onDelete(collection)}
                >
                  Delete
                </button>
              </div>
            </div>
          </article>
        ))}
      </section>
    </div>
  );
}
