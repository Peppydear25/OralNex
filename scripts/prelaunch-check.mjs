import { pathToFileURL } from "node:url";

function isHttpsOrigin(value) {
  try {
    const url = new URL(value);
    return (
      url.protocol === "https:" &&
      !url.username &&
      !url.password &&
      !url.search &&
      !url.hash &&
      (url.pathname === "/" || url.pathname === "")
    );
  } catch {
    return false;
  }
}

/** Checks configuration only; external services, policies, and live flows need staging tests. */
export function validatePrelaunchConfiguration(env, mode = "staging") {
  const issues = [];
  if (!isHttpsOrigin(env.SITE_URL))
    issues.push("SITE_URL must be the exact HTTPS storefront origin.");
  if (!isHttpsOrigin(env.NEXT_PUBLIC_SUPABASE_URL))
    issues.push("NEXT_PUBLIC_SUPABASE_URL must be an HTTPS project origin.");
  for (const name of ["NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "SUPABASE_SECRET_KEY"]) {
    if (!env[name]?.trim()) issues.push(`${name} is missing.`);
  }
  for (const name of [
    "EASYPOST_API_KEY",
    "EASYPOST_ORIGIN_NAME",
    "EASYPOST_ORIGIN_STREET",
    "EASYPOST_ORIGIN_CITY",
  ]) {
    if (!env[name]?.trim()) issues.push(`${name} is missing.`);
  }
  if (!/^[A-Z]{2}$/.test(env.EASYPOST_ORIGIN_STATE ?? ""))
    issues.push("EASYPOST_ORIGIN_STATE must be a two-letter US state code.");
  if (!/^\d{5}(?:-\d{4})?$/.test(env.EASYPOST_ORIGIN_ZIP ?? ""))
    issues.push("EASYPOST_ORIGIN_ZIP must be a US ZIP code.");
  if (env.CHECKOUT_ENABLED !== "true") issues.push("CHECKOUT_ENABLED must be true for launch.");
  if (env.STRIPE_AUTOMATIC_TAX_ENABLED !== "true")
    issues.push("STRIPE_AUTOMATIC_TAX_ENABLED must be true after Stripe Tax setup.");

  const stripePrefix = mode === "production" ? "live" : "test";
  if (!env.STRIPE_SECRET_KEY?.startsWith(`sk_${stripePrefix}_`))
    issues.push(`STRIPE_SECRET_KEY must be a ${stripePrefix}-mode secret key.`);
  if (!env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY?.startsWith(`pk_${stripePrefix}_`))
    issues.push(
      `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY must be a ${stripePrefix}-mode publishable key.`,
    );
  if (!env.STRIPE_WEBHOOK_SECRET?.startsWith("whsec_"))
    issues.push("STRIPE_WEBHOOK_SECRET is missing or invalid.");

  if (mode === "production") {
    if (env.ORDER_EMAIL_NOTIFICATIONS_ENABLED !== "true")
      issues.push("ORDER_EMAIL_NOTIFICATIONS_ENABLED must be true for launch.");
    if (!env.RESEND_API_KEY?.trim()) issues.push("RESEND_API_KEY is missing.");
    const from = env.ORDER_EMAIL_FROM?.trim() || "";
    const senderAddress = /<([^<>]+)>$/.exec(from)?.[1] ?? from;
    const emailAddress = /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/;
    const domain = senderAddress.split("@")[1]?.toLowerCase() ?? "";
    const testDomain = ["resend.dev", "example.com", "example.net", "example.org"].some(
      (value) => domain === value || domain.endsWith(`.${value}`),
    );
    if (!emailAddress.test(senderAddress) || testDomain)
      issues.push("Order email sender must use a verified production domain.");
    if (!emailAddress.test(env.ADMIN_NOTIFICATION_EMAIL?.trim() ?? ""))
      issues.push("ADMIN_NOTIFICATION_EMAIL is missing or invalid.");
  }

  return issues;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const mode = process.argv[2] === "--production" ? "production" : "staging";
  const issues = validatePrelaunchConfiguration(process.env, mode);
  if (issues.length) {
    console.error(`Pre-launch ${mode} configuration is not ready:`);
    for (const issue of issues) console.error(`- ${issue}`);
    process.exitCode = 1;
  } else {
    console.log(`Pre-launch ${mode} configuration names and modes look ready.`);
    console.log("Still verify migrations, RLS, payment, tax, shipping, and email in staging.");
  }
}
