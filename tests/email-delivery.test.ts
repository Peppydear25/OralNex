import { afterEach, expect, it, vi } from "vitest";
import { readFile } from "node:fs/promises";
vi.mock("server-only", () => ({}));
import { sendWithLogo } from "../lib/email/send-with-logo";

afterEach(() => vi.unstubAllGlobals());
const messages = ["buyer@example.com", "admin@example.com"].map((to) => ({
  from: "orders@example.com",
  to: [to],
  subject: "Order",
  html: '<img src="cid:oralnex-logo" alt="OralNex">',
}));

it("attaches the actual logo to each separate email with matching CID", async () => {
  const fetchMock = vi.fn().mockResolvedValue(new Response("{}"));
  vi.stubGlobal("fetch", fetchMock);
  await sendWithLogo("test", "event/test", messages);
  const logo = await readFile("public/logo.jpg");
  expect(fetchMock).toHaveBeenCalledTimes(2);
  for (const [index, [url, request]] of fetchMock.mock.calls.entries()) {
    expect(url).toBe("https://api.resend.com/emails");
    expect(request.headers["Idempotency-Key"]).toBe(`event/test/${index}`);
    const body = JSON.parse(request.body);
    expect(body.to).toEqual(messages[index].to);
    expect(body.attachments[0].content_id).toBe("oralnex-logo");
    expect(Buffer.from(body.attachments[0].content, "base64")).toEqual(logo);
  }
});

it("reports partial failure and preserves recipient keys on retry", async () => {
  const fetchMock = vi
    .fn()
    .mockResolvedValueOnce(new Response("{}"))
    .mockResolvedValueOnce(new Response("{}", { status: 400 }))
    .mockResolvedValue(new Response("{}"));
  vi.stubGlobal("fetch", fetchMock);
  await expect(sendWithLogo("test", "event/retry", messages)).rejects.toThrow("400");
  await sendWithLogo("test", "event/retry", messages);
  expect(fetchMock.mock.calls.map((call) => call[1].headers["Idempotency-Key"])).toEqual([
    "event/retry/0",
    "event/retry/1",
    "event/retry/0",
    "event/retry/1",
  ]);
});
