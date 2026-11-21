"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect, useState } from "react";

export default function ErrorPage({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  useEffect(() => {
    const updateConnection = () => setOffline(!navigator.onLine);
    updateConnection();
    window.addEventListener("online", updateConnection);
    window.addEventListener("offline", updateConnection);
    return () => {
      window.removeEventListener("online", updateConnection);
      window.removeEventListener("offline", updateConnection);
    };
  }, []);

  return (
    <main className="grid min-h-[70vh] place-items-center bg-slate-50 px-5 text-center text-slate-900">
      <section className="w-full max-w-md py-12">
        <h1 className="text-2xl font-semibold sm:text-3xl">
          {offline ? "You’re offline" : "Unable to load this page"}
        </h1>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          {offline ? "Check your connection and try again." : "Please try again."}
        </p>
        <button
          className="mt-6 min-h-12 rounded-lg bg-[#08788c] px-6 text-sm font-semibold text-white transition-colors hover:bg-[#066678] disabled:cursor-not-allowed disabled:opacity-60"
          type="button"
          onClick={retry}
          disabled={offline}
        >
          {offline ? "Waiting for connection" : "Try again"}
        </button>
      </section>
    </main>
  );
}
