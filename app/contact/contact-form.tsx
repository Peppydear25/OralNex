"use client";

import { FormEvent, useState } from "react";
import { ActionResultModal, type ActionResult } from "../components/action-result-modal";
import { LoadingIndicator } from "../components/loading-indicator";
import { fetchWithTimeout } from "../../lib/network/fetch-with-timeout";

const fieldClass =
  "min-h-11 w-full min-w-0 rounded-lg border border-slate-300 bg-white px-3 text-sm font-normal text-slate-800 outline-none transition-colors placeholder:text-slate-400 focus:border-[#0a8d99] focus:ring-2 focus:ring-[#0a8d99]/10";

export function ContactForm() {
  const [result, setResult] = useState<ActionResult | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    if (data.get("company-website")) return;

    const name = String(data.get("name") ?? "").trim();
    const email = String(data.get("email") ?? "").trim();
    const topic = String(data.get("topic") ?? "General question").trim();
    const orderNumber = String(data.get("orderNumber") ?? "").trim();
    const message = String(data.get("message") ?? "").trim();

    if (
      name.length < 2 ||
      name.length > 80 ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
      message.length < 10 ||
      message.length > 2000
    ) {
      setResult({
        tone: "error",
        title: "Check the form",
        message:
          "Enter your name, a valid email address, and a message between 10 and 2,000 characters.",
      });
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetchWithTimeout("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email,
          topic,
          orderNumber: orderNumber || null,
          message,
          companyWebsite: String(data.get("company-website") ?? ""),
        }),
      });
      if (response.status === 429) throw new Error("rate_limited");
      if (!response.ok) throw new Error("Request could not be submitted");

      setResult({
        tone: "success",
        title: "Message sent",
        message: "Our team will review your message.",
      });
      form.reset();
    } catch (error) {
      const rateLimited = error instanceof Error && error.message === "rate_limited";
      setResult({
        tone: "error",
        title: rateLimited ? "Too many requests" : "We could not submit your request",
        message: rateLimited
          ? "Please wait a while before sending another message."
          : "Please check your connection and try the contact form again.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <form className="grid gap-5" onSubmit={submit} noValidate>
        <div className="grid grid-cols-2 gap-4 max-sm:grid-cols-1">
          <label className="grid gap-1.5 text-sm font-semibold">
            Full name *
            <input className={fieldClass} name="name" autoComplete="name" maxLength={80} required />
          </label>
          <label className="grid gap-1.5 text-sm font-semibold">
            Email address *
            <input
              className={fieldClass}
              name="email"
              type="email"
              inputMode="email"
              autoComplete="email"
              maxLength={254}
              required
            />
          </label>
        </div>
        <div className="grid grid-cols-2 gap-4 max-sm:grid-cols-1">
          <label className="grid gap-1.5 text-sm font-semibold">
            How can we help?
            <select className={fieldClass} name="topic" defaultValue="Product question">
              <option>Product question</option>
              <option>Order support</option>
              <option>Delivery issue</option>
              <option>Return or refund</option>
              <option>Bulk purchase</option>
              <option>Privacy request</option>
              <option>General question</option>
            </select>
          </label>
          <label className="grid gap-1.5 text-sm font-semibold">
            <span>
              Order number <span className="text-xs font-normal text-slate-500">(optional)</span>
            </span>
            <input className={fieldClass} name="orderNumber" maxLength={50} />
          </label>
        </div>
        <label className="grid gap-1.5 text-sm font-semibold">
          Message *
          <textarea
            className={`${fieldClass} min-h-28 resize-y py-3`}
            name="message"
            minLength={10}
            maxLength={2000}
            required
          />
        </label>
        <label className="absolute -left-[9999px]" aria-hidden="true">
          Company website
          <input name="company-website" tabIndex={-1} autoComplete="off" />
        </label>
        <p className="text-xs leading-5 text-slate-500">
          Do not include passwords, card details, or medical information.
        </p>
        <button
          className="min-h-11 w-full rounded-lg bg-[#08788c] px-7 text-sm font-semibold text-white transition-colors hover:bg-[#066475] disabled:cursor-wait disabled:opacity-60 sm:w-auto sm:justify-self-start"
          type="submit"
          disabled={submitting}
        >
          {submitting ? <LoadingIndicator label="Sending request…" /> : "Send request"}
        </button>
      </form>
      <ActionResultModal result={result} onClose={() => setResult(null)} />
    </>
  );
}
