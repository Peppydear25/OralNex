"use client";

import { useEffect, useRef, useState } from "react";

type ConnectionState = "online" | "offline" | "restored";

export function ConnectivityStatus() {
  const [state, setState] = useState<ConnectionState>("online");
  const restoredTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const clearRestoredTimer = () => {
      if (restoredTimer.current) clearTimeout(restoredTimer.current);
      restoredTimer.current = null;
    };
    const markOffline = () => {
      clearRestoredTimer();
      setState("offline");
    };
    const markOnline = () => {
      setState((current) => {
        if (current !== "offline") return "online";
        clearRestoredTimer();
        restoredTimer.current = setTimeout(() => setState("online"), 3500);
        return "restored";
      });
    };

    if (!navigator.onLine) markOffline();
    window.addEventListener("offline", markOffline);
    window.addEventListener("online", markOnline);
    return () => {
      clearRestoredTimer();
      window.removeEventListener("offline", markOffline);
      window.removeEventListener("online", markOnline);
    };
  }, []);

  if (state === "online") return null;

  return (
    <div
      className={`fixed inset-x-0 bottom-4 z-[250] mx-auto flex w-[calc(100%-2rem)] max-w-xl items-center justify-between gap-4 rounded-xl border px-4 py-3 text-sm shadow-xl ${
        state === "offline"
          ? "border-amber-300 bg-amber-50 text-amber-950"
          : "border-emerald-300 bg-emerald-50 text-emerald-950"
      }`}
      role="status"
      aria-live="polite"
    >
      <span>
        <strong className="block">
          {state === "offline" ? "You’re offline" : "Connection restored"}
        </strong>
        {state === "offline"
          ? "You can keep viewing this page, but checkout and form submissions need a connection."
          : "Online actions are available again."}
      </span>
      {state === "offline" ? (
        <button
          className="shrink-0 rounded-lg border border-amber-400 bg-white px-3 py-2 font-bold"
          type="button"
          onClick={() => window.location.reload()}
        >
          Retry
        </button>
      ) : null}
    </div>
  );
}
