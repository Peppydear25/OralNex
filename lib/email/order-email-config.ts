import "server-only";

const emailAddress = /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/;

export function orderEmailSender(env: NodeJS.ProcessEnv = process.env) {
  return env.ORDER_EMAIL_FROM?.trim() || env.REQUEST_EMAIL_FROM?.trim() || "";
}

export function orderEmailReady(env: NodeJS.ProcessEnv = process.env) {
  const from = orderEmailSender(env);
  const senderAddress = /<([^<>]+)>$/.exec(from)?.[1] ?? from;
  const domain = senderAddress.split("@")[1]?.toLowerCase() ?? "";
  const testDomain = ["resend.dev", "example.com", "example.net", "example.org"].some(
    (value) => domain === value || domain.endsWith(`.${value}`),
  );
  return (
    env.ORDER_EMAIL_NOTIFICATIONS_ENABLED === "true" &&
    Boolean(env.RESEND_API_KEY?.trim()) &&
    emailAddress.test(senderAddress) &&
    !testDomain &&
    emailAddress.test(env.ADMIN_NOTIFICATION_EMAIL?.trim() ?? "")
  );
}

export function checkoutEmailReady(env: NodeJS.ProcessEnv = process.env) {
  return env.STRIPE_SECRET_KEY?.startsWith("sk_test_") || orderEmailReady(env);
}
