export const SESSION_ONLY_COOKIE = "oralnex_session_only";
export const SESSION_ACTIVE_COOKIE = "oralnex_session_active";

/** No authentication data is stored in these markers. */
export function setBuyerSessionPreference(remember: boolean) {
  const attributes = `Path=/; SameSite=Lax${location.protocol === "https:" ? "; Secure" : ""}`;
  if (remember) {
    clearBuyerSessionPreference();
    return;
  }
  document.cookie = `${SESSION_ONLY_COOKIE}=1; Max-Age=${400 * 24 * 60 * 60}; ${attributes}`;
  document.cookie = `${SESSION_ACTIVE_COOKIE}=1; ${attributes}`;
}

export function clearBuyerSessionPreference() {
  const attributes = `Path=/; SameSite=Lax${location.protocol === "https:" ? "; Secure" : ""}`;
  document.cookie = `${SESSION_ONLY_COOKIE}=; Max-Age=0; ${attributes}`;
  document.cookie = `${SESSION_ACTIVE_COOKIE}=; Max-Age=0; ${attributes}`;
}

export function isExpiredBrowserSession(cookies: {
  get: (name: string) => { value: string } | undefined;
}) {
  return (
    cookies.get(SESSION_ONLY_COOKIE)?.value === "1" &&
    cookies.get(SESSION_ACTIVE_COOKIE)?.value !== "1"
  );
}
