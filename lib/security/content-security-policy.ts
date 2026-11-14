/** A fresh nonce is required for each HTML response; never cache this header. */
export function contentSecurityPolicy(nonce: string) {
  let sentryOrigin = "";
  try {
    const dsn = new URL(process.env.NEXT_PUBLIC_SENTRY_DSN ?? "");
    if (
      dsn.protocol === "https:" &&
      (dsn.hostname === "sentry.io" || dsn.hostname.endsWith(".sentry.io"))
    ) {
      sentryOrigin = dsn.origin;
    }
  } catch {
    // Monitoring is optional until a Sentry DSN is configured.
  }
  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' https://js.stripe.com https://checkout.stripe.com${process.env.NODE_ENV === "production" ? "" : " 'unsafe-eval'"}`,
    // React and Stripe still render some inline style attributes; tighten after browser validation.
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' blob: data: https://*.supabase.co https://*.stripe.com",
    "font-src 'self' data:",
    `connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.stripe.com https://checkout.stripe.com${sentryOrigin ? ` ${sentryOrigin}` : ""}`,
    "frame-src https://js.stripe.com https://hooks.stripe.com https://checkout.stripe.com",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    ...(process.env.NODE_ENV === "production" ? ["upgrade-insecure-requests"] : []),
  ].join("; ");
}
