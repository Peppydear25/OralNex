export const MAX_SAVED_ADDRESSES = 2;
export const ADDRESS_LIMIT_MESSAGE =
  "You can save up to two shipping addresses. Edit or remove one before adding another.";

export function isAddressLimitError(error: { code?: string } | Error | null | undefined) {
  return Boolean(error && "code" in error && error.code === "23514");
}
