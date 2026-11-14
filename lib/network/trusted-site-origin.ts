/** Use a configured origin for payment redirects, never a request-controlled Host header. */
export function trustedSiteOrigin(request: Request): string | null {
  const configured = process.env.SITE_URL?.trim();
  if (!configured)
    return process.env.NODE_ENV === "production" ? null : new URL(request.url).origin;

  try {
    const url = new URL(configured);
    if (url.username || url.password || url.search || url.hash) return null;
    if (process.env.NODE_ENV === "production" && url.protocol !== "https:") return null;
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;
    return url.origin;
  } catch {
    return null;
  }
}

export function invalidRequestOrigin(request: Request, siteOrigin: string): boolean {
  const origin = request.headers.get("origin");
  return origin !== null && origin !== siteOrigin;
}
