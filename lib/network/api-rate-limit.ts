import "server-only";

import { createHmac } from "node:crypto";
import { consumeRateLimit } from "./supabase-rate-limit-http";

type Scope = "checkout";

const policy: Record<Scope, { globalLimit: number; identityLimit: number; windowSeconds: number }> =
  {
    checkout: { globalLimit: 300, identityLimit: 8, windowSeconds: 600 },
  };

/** Atomic database buckets work across server instances. Never store customer emails in the table. */
export async function allowApiRequest(scope: Scope, email: string): Promise<boolean> {
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!key) throw new Error("API rate limiting is not configured.");
  const { globalLimit, identityLimit, windowSeconds } = policy[scope];
  const identityHash = createHmac("sha256", key)
    .update(`${scope}\0${email.trim().toLowerCase()}`)
    .digest("hex");

  for (const [bucket, limit] of [
    ["global", globalLimit],
    [identityHash, identityLimit],
  ] as const) {
    const allowed = await consumeRateLimit(key, {
      p_scope: scope,
      p_identity_hash: bucket,
      p_limit: limit,
      p_window_seconds: windowSeconds,
    });
    if (!allowed) return false;
  }
  return true;
}

export function rateLimitResponse(scope: Scope) {
  return Response.json(
    { error: "Too many requests. Please wait and try again." },
    {
      status: 429,
      headers: {
        "Retry-After": String(policy[scope].windowSeconds),
        "Cache-Control": "no-store",
      },
    },
  );
}
