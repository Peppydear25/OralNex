import { EventEmitter } from "node:events";
import { afterEach, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ request: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("node:https", () => ({ Agent: class {}, request: mocks.request }));
import { postEasyPost } from "../lib/shipping/easypost-http";

function requestWith(outcome: "reset" | "success" | "invalid") {
  mocks.request.mockImplementationOnce((_url, _options, callback) => {
    const req = new EventEmitter() as EventEmitter & { end: () => void };
    req.end = () => {
      queueMicrotask(() => {
        if (outcome === "reset") {
          req.emit("error", Object.assign(new Error("connection reset"), { code: "ECONNRESET" }));
        } else {
          const res = new EventEmitter() as EventEmitter & { statusCode: number };
          res.statusCode = outcome === "success" ? 201 : 401;
          callback(res);
          res.emit("data", Buffer.from("{}"));
          res.emit("end");
        }
        req.emit("close");
      });
    };
    return req;
  });
}

afterEach(() => mocks.request.mockReset());

it("retries one transient connection failure", async () => {
  requestWith("reset");
  requestWith("success");
  await expect(postEasyPost("key", "/v2/addresses", {})).resolves.toMatchObject({ status: 201 });
  expect(mocks.request).toHaveBeenCalledTimes(2);
});

it("recovers after two transient failures and bounds retries", async () => {
  requestWith("reset");
  requestWith("reset");
  requestWith("success");
  await expect(postEasyPost("key", "/v2/addresses", {})).resolves.toMatchObject({ status: 201 });
  expect(mocks.request).toHaveBeenCalledTimes(3);
});

it("does not retry a provider rejection", async () => {
  requestWith("invalid");
  await expect(postEasyPost("key", "/v2/addresses", {})).resolves.toMatchObject({ status: 401 });
  expect(mocks.request).toHaveBeenCalledOnce();
});
