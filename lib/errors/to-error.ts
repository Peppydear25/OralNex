export function toError(value: unknown, fallbackMessage: string) {
  if (value instanceof Error) return value;

  const error = new Error(fallbackMessage, { cause: value });
  error.name = "ExternalServiceError";
  return error;
}
