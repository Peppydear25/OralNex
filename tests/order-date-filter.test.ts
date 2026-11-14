import { describe, expect, it } from "vitest";
import { orderDateWindow } from "../app/admin/dashboard/order-date-filter";

describe("order calendar filters", () => {
  const now = new Date(2026, 9, 23, 15, 30); // Friday, October 23

  it("uses local midnight-to-midnight for Today", () => {
    const window = orderDateWindow("today", now);
    expect(window).toEqual([new Date(2026, 9, 23).getTime(), new Date(2026, 9, 24).getTime()]);
  });

  it("uses Monday through Sunday for This week", () => {
    const window = orderDateWindow("this-week", now);
    expect(window).toEqual([new Date(2026, 9, 19).getTime(), new Date(2026, 9, 26).getTime()]);
  });

  it("uses the calendar month, including a leap-year boundary", () => {
    expect(orderDateWindow("this-month", new Date(2028, 1, 29))).toEqual([
      new Date(2028, 1, 1).getTime(),
      new Date(2028, 2, 1).getTime(),
    ]);
  });

  it("filters a selected month and a selected year", () => {
    expect(orderDateWindow("month", now, 2025, 1)).toEqual([
      new Date(2025, 1, 1).getTime(),
      new Date(2025, 2, 1).getTime(),
    ]);
    expect(orderDateWindow("year", now, 2024)).toEqual([
      new Date(2024, 0, 1).getTime(),
      new Date(2025, 0, 1).getTime(),
    ]);
  });

  it("leaves Any date unfiltered", () => {
    expect(orderDateWindow("all", now)).toBeNull();
  });
});
