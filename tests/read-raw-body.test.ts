import { expect, it } from "vitest";
import { readRawBody } from "../lib/network/read-raw-body";

it("preserves the exact bytes needed for webhook signature verification", async () => {
  const bytes = new Uint8Array([123, 34, 97, 34, 58, 49, 125]);
  const request = new Request("https://example.com/api/stripe/webhook", {
    method: "POST",
    body: bytes,
    duplex: "half",
  } as RequestInit);
  expect(await readRawBody(request, 100)).toEqual(bytes);
});

it("rejects an oversized streamed payload even without Content-Length", async () => {
  const request = new Request("https://example.com/api/stripe/webhook", {
    method: "POST",
    body: new ReadableStream({
      start(controller) {
        controller.enqueue(new Uint8Array(9));
        controller.close();
      },
    }),
    duplex: "half",
  } as RequestInit);
  await expect(readRawBody(request, 8)).rejects.toMatchObject({
    status: 413,
  });
});

it("rejects an announced oversized payload before reading", async () => {
  const request = new Request("https://example.com/api/stripe/webhook", {
    method: "POST",
    headers: { "content-length": "999" },
    body: "x",
  });
  await expect(readRawBody(request, 8)).rejects.toMatchObject({
    status: 413,
  });
});
