export function safeLocalPath(value: string | null | undefined, fallback: string) {
  if (!value?.startsWith("/") || value.startsWith("//") || /[\\\x00-\x1f\x7f]/.test(value))
    return fallback;
  return value;
}

export function safeBuyerPath(value: string | null | undefined, fallback = "/account/dashboard") {
  const path = safeLocalPath(value, fallback);
  const pathname = new URL(path, "https://local.invalid").pathname;
  return /^\/admin(?:\/|$)/i.test(pathname) ? fallback : path;
}

/** Recovery must reach the reset page for buyers and administrators alike. */
export function authenticationDestination(nextPath: string, role: unknown) {
  if (nextPath === "/account/reset-password") return nextPath;
  return role === "admin" ? "/admin/sign-in" : nextPath;
}
