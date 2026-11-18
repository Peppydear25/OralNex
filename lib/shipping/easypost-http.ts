import "server-only";

import { Agent, request } from "node:https";

// EasyPost's IPv6 route is not reachable from some hosts; use its IPv4 endpoint.
const agent = new Agent({ keepAlive: true, maxSockets: 16, family: 4 });

export function postEasyPostShipment(key: string, shipment: object) {
  return postEasyPost(key, "/v2/shipments", { shipment });
}

export async function postEasyPost(key: string, path: string, payload: object) {
  for (let attempt = 0; ; attempt++) {
    try {
      return await sendEasyPost(key, path, payload);
    } catch (error) {
      const code = error && typeof error === "object" && "code" in error ? error.code : undefined;
      if (
        attempt >= 2 ||
        (!(error instanceof Error && error.name === "TimeoutError") &&
          !["ECONNRESET", "ETIMEDOUT", "EAI_AGAIN", "ECONNREFUSED"].includes(String(code)))
      )
        throw error;
    }
  }
}

function sendEasyPost(key: string, path: string, payload: object) {
  const body = JSON.stringify(payload);
  return new Promise<{ status: number; data: unknown }>((resolve, reject) => {
    const req = request(
      `https://api.easypost.com${path}`,
      {
        method: "POST",
        agent,
        headers: {
          Authorization: `Basic ${Buffer.from(`${key}:`).toString("base64")}`,
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(body),
        },
      },
      (res) => {
        const chunks: Buffer[] = [];
        let size = 0;
        res.on("data", (chunk: Buffer) => {
          size += chunk.length;
          if (size > 1_000_000) {
            res.destroy(new Error("EasyPost response was too large."));
            return;
          }
          chunks.push(chunk);
        });
        res.on("error", reject);
        res.on("end", () => {
          try {
            resolve({
              status: res.statusCode ?? 502,
              data: JSON.parse(Buffer.concat(chunks).toString()),
            });
          } catch (error) {
            reject(error);
          }
        });
      },
    );
    const timer = setTimeout(() => {
      const error = new Error("EasyPost rating request timed out.");
      error.name = "TimeoutError";
      req.destroy(error);
    }, 15_000);
    req.on("close", () => clearTimeout(timer));
    req.on("error", reject);
    req.end(body);
  });
}
