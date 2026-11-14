"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect, useState } from "react";

export default function ErrorPage({
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
    <main className="grid min-h-[70vh] place-items-center bg-slate-50 px-5 text-center text-slate-900">
      <section className="w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-8 shadow-xl shadow-slate-200/50">
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#087f8c]">
          {offline ? "Connection unavailable" : "Unable to load this page"}
        </p>
        <h1 className="mt-3 text-3xl font-bold">
          {offline ? "Check your internet connection" : "Something interrupted the request"}
        </h1>
        <p className="mx-auto mt-3 max-w-md leading-7 text-slate-600">
          {offline
            ? "We didn’t replace live store information with sample content. Reconnect, then try again."
            : "Your information is safe. This can be temporary, so please try loading the page again."}
        </p>
        <button
          className="mt-7 min-h-12 rounded-full bg-[#087f8c] px-7 font-bold text-white transition hover:bg-[#066c76]"
          type="button"
          onClick={reset}
          disabled={offline}
        >
          {offline ? "Waiting for connection" : "Try again"}
        </button>
      </section>
    </main>
  );
}
