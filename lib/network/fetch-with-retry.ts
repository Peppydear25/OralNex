import { fetchWithTimeout, NetworkTimeoutError } from "./fetch-with-timeout";

/** Only for read-only requests or writes protected by an idempotency key. */
export async function fetchWithRetry(input: RequestInfo | URL, init: RequestInit = {}) {
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const response = await fetchWithTimeout(input, init, 5_000);
      if (attempt === 1 || ![500, 502, 503, 504].includes(response.status)) return response;
      await response.body?.cancel();
    } catch (error) {
      if (
        attempt === 1 ||
        init.signal?.aborted ||
        !(error instanceof TypeError || error instanceof NetworkTimeoutError)
      )
        throw error;
    }
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  throw new Error("The service could not be reached.");
}
