import { createClient } from "../../lib/supabase/client";

export type OrderStatus =
  "pending" | "paid" | "processing" | "packed" | "shipped" | "delivered" | "cancelled" | "refunded";

export type StoreOrderItem = {
  id: string;
  productId: string | null;
  productName: string;
  sku: string;
  selectedOptions: Record<string, string>;
  unitPrice: number;
  quantity: number;
};

export type StoreOrder = {
  id: string;
  orderNumber: string;
  customerEmail: string | null;
  recipientName: string;
  shippingAddress: Record<string, string>;
  status: OrderStatus;
  subtotal: number;
  shipping: number;
  tax: number;
  total: number;
  createdAt: string;
  items: StoreOrderItem[];
};

type OrderRow = {
  id: string;
  order_number: string;
  guest_email: string | null;
  status: OrderStatus;
  subtotal_cents: number;
  shipping_cents: number;
  tax_cents: number;
  total_cents: number;
  shipping_address: unknown;
  created_at: string;
  order_items: Array<{
    id: string;
    product_id: string | null;
    product_name: string;
    sku: string;
    selected_options: unknown;
    unit_price_cents: number;
    quantity: number;
  }> | null;
};

function selectedOptions(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return Object.fromEntries(
    Object.entries(value)
      .filter((entry): entry is [string, string] => typeof entry[1] === "string")
      .slice(0, 20),
  );
}

function recipientName(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return "Customer";
  const candidate = value as Record<string, unknown>;
  const valueName = candidate.recipient_name ?? candidate.name;
  return typeof valueName === "string" && valueName.trim() ? valueName.trim() : "Customer";
}

function shippingAddress(value: unknown): Record<string, string> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const source = value as Record<string, unknown>;
  return Object.fromEntries(
    [
      "name",
      "company",
      "phone",
      "line1",
      "line2",
      "city",
      "state",
      "postalCode",
      "country",
      "shippingMethod",
    ]
      .filter((key) => typeof source[key] === "string" && Boolean(String(source[key]).trim()))
      .map((key) => [key, String(source[key]).trim()]),
  );
}

function mapOrder(row: OrderRow): StoreOrder {
  return {
    id: row.id,
    orderNumber: row.order_number,
    customerEmail: row.guest_email,
    recipientName: recipientName(row.shipping_address),
    shippingAddress: shippingAddress(row.shipping_address),
    status: row.status,
    subtotal: row.subtotal_cents / 100,
    shipping: row.shipping_cents / 100,
    tax: row.tax_cents / 100,
    total: row.total_cents / 100,
    createdAt: row.created_at,
    items: (row.order_items ?? []).map((item) => ({
      id: item.id,
      productId: item.product_id,
      productName: item.product_name,
      sku: item.sku,
      selectedOptions: selectedOptions(item.selected_options),
      unitPrice: item.unit_price_cents / 100,
      quantity: item.quantity,
    })),
  };
}

const orderSelection =
  "id,order_number,guest_email,status,subtotal_cents,shipping_cents,tax_cents,total_cents,shipping_address,created_at,order_items(id,product_id,product_name,sku,selected_options,unit_price_cents,quantity)";

export const ADMIN_ORDERS_PAGE_SIZE = 10;
export const BUYER_ORDERS_PAGE_SIZE = 10;

export type AdminOrderFilters = {
  page: number;
  status: OrderStatus | "all";
  dateWindow: [number, number] | null;
  sort: "newest" | "oldest" | "total-high" | "total-low";
  query: string;
};

export async function loadOrders(
  page = 1,
  filters: { recentDays?: 7 | 30 | 90 | null; orderNumber?: string } = {},
) {
  const safePage = Number.isSafeInteger(page) && page > 0 ? page : 1;
  const offset = (safePage - 1) * BUYER_ORDERS_PAGE_SIZE;
  let request = createClient().from("orders").select(orderSelection, { count: "exact" });
  if (filters.recentDays) {
    request = request.gte(
      "created_at",
      new Date(Date.now() - filters.recentDays * 24 * 60 * 60 * 1000).toISOString(),
    );
  }
  const orderNumber = filters.orderNumber
    ?.trim()
    .replace(/[^a-zA-Z0-9-]/g, "")
    .slice(0, 40);
  if (orderNumber) request = request.ilike("order_number", `%${orderNumber}%`);
  const { data, count, error } = await request
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .range(offset, offset + BUYER_ORDERS_PAGE_SIZE - 1);

  return {
    orders: error ? [] : ((data ?? []) as unknown as OrderRow[]).map(mapOrder),
    total: count ?? 0,
    error,
  };
}

/** Fetch only the requested, filtered page. Never download the full order history. */
export async function loadAdminOrders(filters: AdminOrderFilters) {
  const client = createClient();
  const search = filters.query
    .trim()
    .replace(/[,%()]/g, "")
    .slice(0, 100);
  const sortColumn = filters.sort.startsWith("total") ? "total_cents" : "created_at";
  const ascending = filters.sort === "oldest" || filters.sort === "total-low";
  const offset = Math.max(0, filters.page - 1) * ADMIN_ORDERS_PAGE_SIZE;
  let matchingItemOrderIds: string[] = [];
  if (search) {
    const itemMatches = await client
      .from("order_items")
      .select("order_id")
      .or(`sku.ilike.%${search}%,product_name.ilike.%${search}%`)
      .limit(501);
    if (itemMatches.error || (itemMatches.data?.length ?? 0) > 500) {
      return {
        orders: [] as StoreOrder[],
        total: 0,
        oldestYear: new Date().getFullYear(),
        error: itemMatches.error ?? new Error("Search is too broad. Enter a more specific term."),
      };
    }
    matchingItemOrderIds = [...new Set((itemMatches.data ?? []).map((row) => row.order_id))];
  }
  let request = client.from("orders").select(orderSelection, { count: "exact" });
  if (filters.status !== "all") request = request.eq("status", filters.status);
  if (filters.dateWindow) {
    request = request
      .gte("created_at", new Date(filters.dateWindow[0]).toISOString())
      .lt("created_at", new Date(filters.dateWindow[1]).toISOString());
  }
  if (search) {
    const itemClause = matchingItemOrderIds.length
      ? `,id.in.(${matchingItemOrderIds.join(",")})`
      : "";
    request = request.or(
      `order_number.ilike.%${search}%,guest_email.ilike.%${search}%,shipping_address->>recipient_name.ilike.%${search}%,shipping_address->>name.ilike.%${search}%${itemClause}`,
    );
  }
  const [{ data, count, error }, oldest] = await Promise.all([
    request
      .order(sortColumn, { ascending })
      .order("id", { ascending })
      .range(offset, offset + ADMIN_ORDERS_PAGE_SIZE - 1),
    client.from("orders").select("created_at").order("created_at").limit(1).maybeSingle(),
  ]);
  return {
    orders: error ? [] : ((data ?? []) as unknown as OrderRow[]).map(mapOrder),
    total: count ?? 0,
    oldestYear: oldest.data?.created_at
      ? new Date(oldest.data.created_at).getFullYear()
      : new Date().getFullYear(),
    error: error ?? oldest.error,
  };
}
