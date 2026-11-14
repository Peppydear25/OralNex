"use client";

import { useEffect, useState } from "react";

export function StorefrontUnavailable() {
  const [offline, setOffline] = useState(false);

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
    <main className="grid min-h-screen place-items-center bg-slate-50 px-5 text-center text-[#253138]">
      <section className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 shadow-xl shadow-slate-200/50">
        <span
          className="mx-auto grid size-12 place-items-center rounded-full bg-amber-50 text-xl font-bold text-amber-700"
          aria-hidden="true"
        >
          !
        </span>
        <p className="mt-5 text-xs font-bold uppercase tracking-[.16em] text-[#08788c]">
          {offline ? "No internet connection" : "Connection problem"}
        </p>
        <h1 className="mt-2 text-2xl font-semibold">
          {offline ? "You’re currently offline" : "We’re having trouble connecting"}
        </h1>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          {offline
            ? "Check your Wi-Fi or mobile data, reconnect to the internet, and then try again."
            : "Your internet connection may be slow or unstable. Check your Wi-Fi or mobile data, then try again."}
        </p>
        <button
          className="mt-6 min-h-11 w-full rounded-lg bg-[#0a8d99] px-5 font-bold text-white transition hover:bg-[#08788c] disabled:cursor-not-allowed disabled:opacity-60"
          type="button"
          onClick={() => window.location.reload()}
        >
          Try again
        </button>
      </section>
    </main>
  );
}
