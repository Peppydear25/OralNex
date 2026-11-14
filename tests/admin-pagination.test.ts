import { beforeEach, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ from: vi.fn(), orderRange: vi.fn() }));
vi.mock("../lib/supabase/client", () => ({ createClient: () => ({ from: mocks.from }) }));

import {
  ADMIN_ORDERS_PAGE_SIZE,
  BUYER_ORDERS_PAGE_SIZE,
  loadAdminOrders,
  loadOrders,
} from "../app/data/supabase-orders";

function query(
  range: (start: number, end: number) => unknown,
  onOrder?: (...args: unknown[]) => void,
) {
  const builder = {
    select: () => builder,
    eq: (...args: unknown[]) => {
      void args;
      return builder;
    },
    ilike: (...args: unknown[]) => {
      void args;
      return builder;
    },
    gte: () => builder,
    lt: () => builder,
    or: () => builder,
    order: (...args: unknown[]) => {
      onOrder?.(...args);
      return builder;
    },
    range,
    limit: () => builder,
    maybeSingle: async () => ({ data: { created_at: "2024-01-01T00:00:00Z" }, error: null }),
  };
  return builder;
}

beforeEach(() => vi.resetAllMocks());

it("fetches only the latest ten buyer orders and pages by a stable newest-first order", async () => {
  const orderBy = vi.fn();
  const orders = vi.fn(() => query(mocks.orderRange, orderBy));
  mocks.orderRange.mockResolvedValue({ data: [], count: 27, error: null });
  mocks.from.mockImplementation(orders);
  const result = await loadOrders(2);
  expect(orders).toHaveBeenCalledWith("orders");
  expect(mocks.orderRange).toHaveBeenCalledWith(10, 19);
  expect(orderBy).toHaveBeenNthCalledWith(1, "created_at", { ascending: false });
  expect(orderBy).toHaveBeenNthCalledWith(2, "id", { ascending: false });
  expect(BUYER_ORDERS_PAGE_SIZE).toBe(10);
  expect(result.total).toBe(27);
});

it("filters buyer orders in the database before paginating", async () => {
  const date = vi.fn();
  const orderNumber = vi.fn();
  mocks.orderRange.mockResolvedValue({ data: [], count: 1, error: null });
  mocks.from.mockImplementation(() => {
    const builder = query(mocks.orderRange);
    builder.gte = ((column: string, value: string) => {
      date(column, value);
      return builder;
    }) as typeof builder.gte;
    builder.ilike = ((column: string, value: string) => {
      orderNumber(column, value);
      return builder;
    }) as typeof builder.ilike;
    return builder;
  });
  const before = Date.now();
  await loadOrders(1, { recentDays: 30, orderNumber: "ON-123" });
  const after = Date.now();
  expect(date).toHaveBeenCalledOnce();
  expect(date.mock.calls[0][0]).toBe("created_at");
  expect(Date.parse(date.mock.calls[0][1])).toBeGreaterThanOrEqual(before - 30 * 86400000);
  expect(Date.parse(date.mock.calls[0][1])).toBeLessThanOrEqual(after - 30 * 86400000);
  expect(orderNumber).toHaveBeenCalledWith("order_number", "%ON-123%");
  expect(mocks.orderRange).toHaveBeenCalledWith(0, 9);
});

it("fetches only the requested 10-order admin page, with an exact count", async () => {
  mocks.orderRange.mockResolvedValue({ data: [], count: 83, error: null });
  mocks.from.mockImplementation(() => query(mocks.orderRange));
  const result = await loadAdminOrders({
    page: 2,
    status: "all",
    dateWindow: null,
    sort: "newest",
    query: "",
  });
  expect(mocks.orderRange).toHaveBeenCalledWith(10, 19);
  expect(ADMIN_ORDERS_PAGE_SIZE).toBe(BUYER_ORDERS_PAGE_SIZE);
  expect(result.total).toBe(83);
  expect(result.oldestYear).toBe(2024);
});
