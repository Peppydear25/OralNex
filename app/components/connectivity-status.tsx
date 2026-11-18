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
      className={`fixed inset-x-0 bottom-4 z-[250] mx-auto flex w-fit max-w-[calc(100%-2rem)] items-center gap-3 rounded-lg border px-3 py-2 text-xs shadow-lg ${
        state === "offline"
          ? "border-amber-300 bg-amber-50 text-amber-950"
          : "border-emerald-300 bg-emerald-50 text-emerald-950"
      }`}
      role="status"
      aria-live="polite"
    >
      <span>{state === "offline" ? "No internet connection" : "Connection restored"}</span>
      {state === "offline" ? (
        <button
          className="shrink-0 rounded border border-amber-400 bg-white px-2 py-1 font-semibold"
          type="button"
          onClick={() => window.location.reload()}
        >
          Retry
        </button>
      ) : null}
    </div>
  );
}
