import { expect, it } from "vitest";
import { readJsonBody, RequestBodyError } from "../lib/network/read-json-body";

it("parses a bounded JSON request", async () => {
  const request = new Request("https://example.com/api/test", {
    method: "POST",
    headers: { "content-type": "application/json; charset=utf-8" },
    body: JSON.stringify({ quantity: 1 }),
  });
  await expect(readJsonBody(request, 100)).resolves.toEqual({ quantity: 1 });
});

it("rejects oversized and non-JSON bodies", async () => {
  const oversized = new Request("https://example.com/api/test", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ message: "x".repeat(100) }),
  });
  await expect(readJsonBody(oversized, 30)).rejects.toMatchObject({ status: 413 });
  const wrongType = new Request("https://example.com/api/test", {
    method: "POST",
    headers: { "content-type": "text/plain" },
    body: "{}",
  });
  await expect(readJsonBody(wrongType, 100)).rejects.toBeInstanceOf(RequestBodyError);
});
