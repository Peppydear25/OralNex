export type OrderDateFilter = "all" | "today" | "this-week" | "this-month" | "month" | "year";

/** Calendar boundaries in the administrator's local time zone. Weeks start on Monday. */
export function orderDateWindow(
  filter: OrderDateFilter,
  now: Date,
  selectedYear = now.getFullYear(),
  selectedMonth = now.getMonth(),
): [number, number] | null {
  if (filter === "all") return null;

  const year = now.getFullYear();
  const month = now.getMonth();
  const day = now.getDate();
  if (filter === "today") {
    return [new Date(year, month, day).getTime(), new Date(year, month, day + 1).getTime()];
  }
  if (filter === "this-week") {
    const daysSinceMonday = (now.getDay() + 6) % 7;
    return [
      new Date(year, month, day - daysSinceMonday).getTime(),
      new Date(year, month, day - daysSinceMonday + 7).getTime(),
    ];
  }
  if (filter === "month")
    return [
      new Date(selectedYear, selectedMonth, 1).getTime(),
      new Date(selectedYear, selectedMonth + 1, 1).getTime(),
    ];
  if (filter === "year")
    return [new Date(selectedYear, 0, 1).getTime(), new Date(selectedYear + 1, 0, 1).getTime()];
  return [new Date(year, month, 1).getTime(), new Date(year, month + 1, 1).getTime()];
}
