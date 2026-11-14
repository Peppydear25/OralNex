"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect, useState } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
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
    <html lang="en">
      <body className="grid min-h-screen place-items-center bg-slate-50 px-5 text-slate-900">
        <main className="w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-xl shadow-slate-200/50">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#087f8c]">
            {offline ? "Connection unavailable" : "Something went wrong"}
          </p>
          <h1 className="mt-3 text-3xl font-bold">
            {offline ? "Check your internet connection" : "This page could not be displayed"}
          </h1>
          <p className="mx-auto mt-3 max-w-md leading-7 text-slate-600">
            {offline
              ? "Live store information is unavailable. Reconnect and try again; sample content will not be shown in its place."
              : "Please try loading the page again."}
          </p>
          <button
            className="mt-7 min-h-12 rounded-full bg-[#087f8c] px-7 font-bold text-white transition hover:bg-[#066c76] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#087f8c]"
            type="button"
            onClick={reset}
            disabled={offline}
          >
            {offline ? "Waiting for connection" : "Try again"}
          </button>
        </main>
      </body>
    </html>
  );
}
