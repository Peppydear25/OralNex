import "server-only";

import { request as httpsRequest, Agent } from "node:https";
import { request as httpRequest } from "node:http";
import { getSupabaseConfig } from "../supabase/config";

const agent = new Agent({ keepAlive: true, family: 4, maxSockets: 16 });

/** The rate-limit RPC returns only a boolean; keep credentials and provider errors out of logs. */
export function consumeRateLimit(key: string, parameters: object): Promise<boolean> {
  const url = new URL("/rest/v1/rpc/consume_api_rate_limit", getSupabaseConfig().url);
  if (
    url.protocol !== "https:" &&
    !(url.protocol === "http:" && ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname))
  )
    throw new Error("Invalid Supabase URL protocol.");
  const body = JSON.stringify(parameters);
  return new Promise((resolve, reject) => {
    const req = (url.protocol === "https:" ? httpsRequest : httpRequest)(
      url,
      {
        method: "POST",
        ...(url.protocol === "https:" ? { agent } : {}),
        headers: {
          apikey: key,
          Authorization: `Bearer ${key}`,
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(body),
        },
      },
      (res) => {
        let body = "";
        res.setEncoding("utf8");
        res.on("data", (chunk: string) => {
          body += chunk;
          if (body.length > 4096) res.destroy(new Error("Rate limit response was too large."));
        });
        res.on("error", reject);
        res.on("end", () => {
          if (res.statusCode !== 200 || !["true", "false"].includes(body.trim())) {
            reject(new Error(`Rate limit service returned HTTP ${res.statusCode ?? 0}.`));
            return;
          }
          resolve(body.trim() === "true");
        });
      },
    );
    const timer = setTimeout(() => {
      const error = new Error("Rate limit service timed out.");
      error.name = "TimeoutError";
      req.destroy(error);
    }, 8_000);
    req.on("close", () => clearTimeout(timer));
    req.on("error", reject);
    req.end(body);
  });
}
