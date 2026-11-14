import { afterEach, expect, it, vi } from "vitest";
import { fetchWithRetry } from "../lib/network/fetch-with-retry";
afterEach(() => vi.unstubAllGlobals());

it("retries a dropped connection with the same idempotency key", async () => {
  const fetchMock = vi
    .fn()
    .mockRejectedValueOnce(new TypeError("fetch failed"))
    .mockResolvedValue(new Response("{}"));
  vi.stubGlobal("fetch", fetchMock);
  await fetchWithRetry("https://example.com", { headers: { "Idempotency-Key": "fixed-key" } });
  expect(fetchMock).toHaveBeenCalledTimes(2);
  expect(fetchMock.mock.calls.map((call) => call[1].headers["Idempotency-Key"])).toEqual([
    "fixed-key",
    "fixed-key",
  ]);
});
it("does not retry invalid credentials", async () => {
  const fetchMock = vi.fn().mockResolvedValue(new Response("{}", { status: 401 }));
  vi.stubGlobal("fetch", fetchMock);
  expect((await fetchWithRetry("https://example.com")).status).toBe(401);
  expect(fetchMock).toHaveBeenCalledTimes(1);
});
it("stops after two failed attempts", async () => {
  const fetchMock = vi.fn().mockRejectedValue(new TypeError("fetch failed"));
  vi.stubGlobal("fetch", fetchMock);
  await expect(fetchWithRetry("https://example.com")).rejects.toThrow("fetch failed");
  expect(fetchMock).toHaveBeenCalledTimes(2);
});
