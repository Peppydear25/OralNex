import { afterEach, expect, it, vi } from "vitest";
const { save, send, after, report } = vi.hoisted(() => ({
  save: vi.fn(),
  send: vi.fn(),
  after: vi.fn(),
  report: vi.fn(),
}));
vi.mock("../lib/supabase/server-requests", () => ({ createContactRequest: save }));
vi.mock("../lib/email/request-notifications", () => ({ sendContactRequestEmails: send }));
vi.mock("next/server", () => ({ after }));
vi.mock("../lib/errors/report-service-failure", () => ({ reportServiceFailure: report }));
vi.mock("../lib/network/api-rate-limit", () => ({
  allowApiRequest: vi.fn(async () => true),
  rateLimitResponse: vi.fn(),
}));
import { POST } from "../app/api/contact/route";
afterEach(() => vi.clearAllMocks());
it("responds after saving, then safely handles a notification failure", async () => {
  save.mockResolvedValue("request-1");
  send.mockRejectedValue(new Error("offline"));
  const response = await POST(
    new Request("https://example.com/api/contact", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        name: "Test Buyer",
        email: "buyer@example.com",
        topic: "Products",
        message: "Please send more details.",
      }),
    }),
  );
  expect(response.status).toBe(201);
  expect(send).not.toHaveBeenCalled();
  await expect(after.mock.calls[0][0]()).resolves.toBeUndefined();
  expect(report).toHaveBeenCalledWith("contact.notification", expect.any(Error));
  expect(save).toHaveBeenCalledTimes(1);
});
