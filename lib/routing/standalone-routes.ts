/** Routes that do not render the catalog, buyer, or cart providers. */
export function isStandaloneRoute(pathname: string) {
  return pathname === "/admin/sign-in" || pathname === "/auth/complete";
}
