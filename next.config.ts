import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs/config";

const isProduction = process.env.NODE_ENV === "production";
const supabaseMediaPattern = (() => {
  try {
    const projectUrl = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "");
    return [
      new URL(
        `/storage/v1/object/public/product-media/**`,
        `${projectUrl.protocol}//${projectUrl.host}`,
      ),
    ];
  } catch {
    return [];
  }
})();
const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), browsing-topics=()",
  },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  ...(isProduction
    ? [
        {
          key: "Strict-Transport-Security",
          value: "max-age=63072000; includeSubDomains; preload",
        },
      ]
    : []),
];

const nextConfig: NextConfig = {
  outputFileTracingIncludes: {
    "/api/stripe/webhook": ["./public/logo.jpg"],
    "/api/contact": ["./public/logo.jpg"],
  },
  poweredByHeader: false,
  redirects() {
    return [
      { source: "/return-refund-policy", destination: "/shipping-policy#returns", permanent: true },
      { source: "/cookie-policy", destination: "/privacy-policy#choices", permanent: true },
    ];
  },
  experimental: {
    // The compiler API avoids malformed `tsc --showConfig` output in some CI shells.
    useTypeScriptCli: false,
  },
  images: {
    formats: ["image/avif", "image/webp"],
    qualities: [75, 95],
    minimumCacheTTL: 60 * 60 * 24,
    maximumRedirects: 0,
    remotePatterns: supabaseMediaPattern,
  },
  headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
      {
        source: "/checkout/:path*",
        headers: [
          { key: "Cache-Control", value: "private, no-store" },
          { key: "Referrer-Policy", value: "no-referrer" },
        ],
      },
    ];
  },
};

export default withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,
  silent: !process.env.CI,
  useRunAfterProductionCompileHook: true,
  sourcemaps: {
    disable: !(
      process.env.SENTRY_ORG &&
      process.env.SENTRY_PROJECT &&
      process.env.SENTRY_AUTH_TOKEN
    ),
  },
});
