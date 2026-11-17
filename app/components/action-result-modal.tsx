"use client";

import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";

export type ActionResult = {
  tone: "success" | "error";
  title: string;
  message: string;
};

export function ActionResultModal({
  result,
  onClose,
}: {
  result: ActionResult | null;
  onClose: () => void;
}) {
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!result) return;
    const timeout = window.setTimeout(
      () => onCloseRef.current(),
      result.tone === "success" ? 5000 : 9000,
    );
    return () => window.clearTimeout(timeout);
  }, [result]);

  if (!result || typeof document === "undefined") return null;
  const success = result.tone === "success";
  const duration = success ? 5000 : 9000;

  return createPortal(
    <section
      className="fixed right-4 top-4 z-[220] w-[min(420px,calc(100vw-2rem))] overflow-hidden rounded-lg border border-slate-200 bg-white text-[#172d36] shadow-[0_18px_55px_rgba(8,36,44,.22)] sm:right-6 sm:top-6"
      role={success ? "status" : "alert"}
      aria-live={success ? "polite" : "assertive"}
      aria-atomic="true"
    >
      <div className="flex items-start gap-3 p-4 pr-12 sm:p-5 sm:pr-14">
        <span
          className={`grid size-10 shrink-0 place-items-center rounded-lg ${success ? "bg-[#e8f6f6] text-[#087f8e]" : "bg-red-50 text-red-600"}`}
          aria-hidden="true"
        >
          {success ? (
            <svg className="size-5" viewBox="0 0 24 24" fill="none">
              <path
                d="m5 12 4.5 4.5L19 7"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2.2"
              />
            </svg>
          ) : (
            <svg className="size-5" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8" />
              <path
                d="m9 9 6 6m0-6-6 6"
                stroke="currentColor"
                strokeLinecap="round"
                strokeWidth="1.8"
              />
            </svg>
          )}
        </span>
        <div className="min-w-0 flex-1 break-words">
          <h2 className="text-[15px] font-semibold leading-5">{result.title}</h2>
          <p className="mt-1 text-[13px] leading-5 text-slate-600">{result.message}</p>
        </div>
      </div>
      <button
        className="absolute right-2 top-2 grid size-10 place-items-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#087f8e]"
        type="button"
        onClick={onClose}
        aria-label="Dismiss notification"
      >
        <svg className="size-4" aria-hidden="true" viewBox="0 0 20 20">
          <path
            d="m5 5 10 10M15 5 5 15"
            fill="none"
            stroke="currentColor"
            strokeLinecap="round"
            strokeWidth="1.8"
          />
        </svg>
      </button>
      <div className="h-1 w-full bg-slate-100" aria-hidden="true">
        <div
          className={`action-result-countdown h-full w-full ${success ? "bg-[#087f8e]" : "bg-red-600"}`}
          style={{ animationDuration: `${duration}ms` }}
        />
      </div>
    </section>,
    document.body,
  );
}
