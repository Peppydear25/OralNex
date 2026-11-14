import { expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { POST } from "../app/api/stripe/checkout/route";

it("does not create a payment without a configured shipping carrier", async () => {
  const response = await POST(
    new Request("http://localhost:3000/api/stripe/checkout", {
      method: "POST",
      headers: { origin: "http://localhost:3000" },
    }),
  );
  expect(response.status).toBe(503);
  expect(response.headers.get("cache-control")).toBe("no-store");
  expect(await response.json()).toEqual({
    error: "Online checkout is temporarily unavailable.",
  });
});
