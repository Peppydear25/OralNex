import { getPublicCatalog } from "../../data/server-catalog";

export async function GET() {
  const catalog = await getPublicCatalog();
  return Response.json(catalog ?? { error: "Catalog unavailable" }, {
    status: catalog ? 200 : 503,
    headers: {
      "Cache-Control": catalog
        ? "public, max-age=15, s-maxage=15, stale-while-revalidate=60"
        : "no-store",
    },
  });
}
