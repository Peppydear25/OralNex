export function safeLocalPath(value: string | null | undefined, fallback: string) {
  return value?.startsWith("/") && !value.startsWith("//") ? value : fallback;
}

export function safeBuyerPath(value: string | null | undefined, fallback = "/account/dashboard") {
  const path = safeLocalPath(value, fallback);
  return /^\/admin(?:[/?#]|$)/.test(path) ? fallback : path;
}
