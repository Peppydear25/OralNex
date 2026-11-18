import { EventEmitter } from "node:events";
import { afterEach, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ request: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("../lib/supabase/config", () => ({
  getSupabaseConfig: () => ({ url: "http://localhost:54321" }),
}));
vi.mock("node:http", () => ({ request: mocks.request }));
import { consumeRateLimit } from "../lib/network/supabase-rate-limit-http";

function respond(status: number, body: string) {
  let requestBody = "";
  mocks.request.mockImplementation((_url, _options, callback) => {
    const req = new EventEmitter() as EventEmitter & { end: (body: string) => void };
    req.end = (body) => {
      requestBody = body;
      const res = new EventEmitter() as EventEmitter & {
        statusCode: number;
        setEncoding: () => void;
      };
      res.statusCode = status;
      res.setEncoding = () => {};
      callback(res);
      queueMicrotask(() => {
        res.emit("data", bodyResponse);
        res.emit("end");
        req.emit("close");
      });
    };
    const bodyResponse = body;
    return req;
  });
  return () => requestBody;
}

afterEach(() => vi.clearAllMocks());

it("sends authenticated RPC parameters and interprets the database decision", async () => {
  const body = respond(200, "false");
  expect(await consumeRateLimit("secret", { p_scope: "checkout" })).toBe(false);
  expect(JSON.parse(body())).toEqual({ p_scope: "checkout" });
  expect(mocks.request.mock.calls[0][1].headers.Authorization).toBe("Bearer secret");
});

it("fails closed on provider errors without exposing the response", async () => {
  respond(503, '{"message":"sensitive provider detail"}');
  await expect(consumeRateLimit("secret", {})).rejects.toThrow(
    "Rate limit service returned HTTP 503.",
  );
});
