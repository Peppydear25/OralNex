import "server-only";

import { request } from "node:https";

/** EasyPost's endpoint has IPv4 connectivity on hosts where Node fetch's IPv6 path can time out. */
export function postEasyPostShipment(key: string, shipment: object) {
  return postEasyPost(key, "/v2/shipments", { shipment });
}

export function postEasyPost(key: string, path: string, payload: object) {
  const body = JSON.stringify(payload);
  return new Promise<{ status: number; data: unknown }>((resolve, reject) => {
    const req = request(
      `https://api.easypost.com${path}`,
      {
        method: "POST",
        family: 4,
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
    }, 20_000);
    req.on("close", () => clearTimeout(timer));
    req.on("error", reject);
    req.end(body);
  });
}
