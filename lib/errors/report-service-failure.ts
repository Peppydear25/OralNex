import "server-only";
import * as Sentry from "@sentry/nextjs";

const lastReported = new Map<string, number>();
/** Concise, rate-limited operational logs; never print credentials or customer payloads. */
export function reportServiceFailure(operation: string, error: unknown) {
  const name = error instanceof Error ? error.name : "ServiceError";
  const category =
    name === "NetworkTimeoutError" || name === "TimeoutError"
      ? "timeout"
      : name === "TypeError"
        ? "connection failure"
        : "service failure";
  const key = `${operation}:${category}`;
  if (process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN) {
    // Third-party errors can contain customer or payment details in their messages.
    // Keep the stack location and error type, but send a safe message.
    const safeError = new Error(`[${operation}] ${category}`);
    safeError.name = name;
    if (error instanceof Error && error.stack) {
      const frames = error.stack.split("\n").slice(1).join("\n");
      safeError.stack = `${name}: ${safeError.message}\n${frames}`;
    }
    Sentry.captureException(safeError, {
      tags: { operation, failure_category: category },
    });
  }
  const now = Date.now();
  if (now - (lastReported.get(key) ?? -Infinity) < 60_000) return;
  lastReported.set(key, now);
  console.warn(
    `[${operation}] ${category}; the operation did not complete. Check service connectivity/configuration.`,
  );
}
