import "server-only";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fetchWithRetry } from "../network/fetch-with-retry";

type Message = {
  from: string;
  to: string[];
  subject: string;
  html: string;
  reply_to?: string;
  tags?: { name: string; value: string }[];
};

export class EmailDeliveryError extends Error {
  constructor(readonly status: number) {
    super(`Email delivery failed (${status}).`);
    this.name = "EmailDeliveryError";
  }
}

/** Each recipient has a stable key so retrying a partially sent pair is safe. */
export async function sendWithLogo(apiKey: string, eventKey: string, messages: Message[]) {
  const needsLogo = messages.some((message) => message.html.includes("cid:oralnex-logo"));
  const content = needsLogo
    ? (await readFile(path.join(process.cwd(), "public", "logo.jpg"))).toString("base64")
    : undefined;
  const results = await Promise.allSettled(
    messages.map(async (message, index) => {
      const response = await fetchWithRetry("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          "Idempotency-Key": `${eventKey}/${index}`,
        },
        body: JSON.stringify({
          ...message,
          ...(message.html.includes("cid:oralnex-logo")
            ? {
                attachments: [
                  {
                    filename: "oralnex-logo.jpg",
                    content,
                    content_id: "oralnex-logo",
                    content_type: "image/jpeg",
                  },
                ],
              }
            : {}),
        }),
        cache: "no-store",
      });
      if (!response.ok) throw new EmailDeliveryError(response.status);
    }),
  );
  const failure = results.find((result) => result.status === "rejected");
  if (failure?.status === "rejected") throw failure.reason;
}
