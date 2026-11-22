"use client";

import { useEffect } from "react";
import type { Notice } from "./types";

export function Metric({ label, value, tone }: { label: string; value: string; tone?: "warning" }) {
  return (
    <article className="flex min-h-24 flex-col justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
      <span className="text-sm font-medium text-slate-600">{label}</span>
      <strong
        className={`text-2xl font-semibold tabular-nums ${tone === "warning" ? "text-amber-700" : "text-slate-900"}`}
      >
        {value}
      </strong>
    </article>
  );
}

export function PanelHead({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex min-h-16 min-w-0 items-center justify-between gap-5 border-b border-slate-200 px-5 py-4 max-sm:flex-col max-sm:items-start [&_h2]:text-lg [&_h2]:font-semibold [&_p]:text-xs [&_p]:text-slate-500 [&_button]:rounded-lg [&_button]:border [&_button]:border-slate-300 [&_button]:px-3 [&_button]:py-2 [&_button]:text-sm [&_button]:font-semibold [&_button]:transition [&_button]:hover:border-[#08788c] [&_button]:hover:text-[#08788c]">
      <div className="grid gap-1">
        <h2>{title}</h2>
        {description && <p>{description}</p>}
      </div>
      {children}
    </div>
  );
}

export function OperationNotice({
  notice,
  onClose,
}: {
  notice: Exclude<Notice, null>;
  onClose: () => void;
}) {
  const isError = notice.tone === "error";
  useEffect(() => {
    const timer = window.setTimeout(onClose, 2000);
    return () => window.clearTimeout(timer);
  }, [onClose]);
  return (
    <div
      className="fixed inset-0 z-[140] flex items-center justify-center bg-slate-950/40 p-6 backdrop-blur-sm"
      role="presentation"
    >
      <section
        className="relative grid w-full max-w-md grid-cols-[54px_1fr] items-center gap-4 rounded-lg bg-white p-5 shadow-2xl [&>span]:grid [&>span]:size-14 [&>span]:place-items-center [&>span]:rounded-full [&>span]:text-2xl [&_h2]:text-base [&_h2]:font-semibold [&_p]:text-xs [&_p]:font-bold [&_p]:tracking-wider [&_small]:text-sm [&_small]:text-slate-500 [&>button]:absolute [&>button]:right-3 [&>button]:top-3"
        role="status"
        aria-live="polite"
      >
        <span
          className={isError ? "bg-red-100 text-red-700" : "bg-emerald-100 text-emerald-700"}
          aria-hidden="true"
        >
          {isError ? "!" : "✓"}
        </span>
        <div>
          <h2>{notice.title}</h2>
          {notice.message && (
            <small className="mt-1 block break-words leading-5">{notice.message}</small>
          )}
        </div>
        <button type="button" onClick={onClose} aria-label="Close notification">
          ×
        </button>
      </section>
    </div>
  );
}

type ConfirmationDialogProps = {
  title: string;
  message: string;
  confirmLabel: string;
  onConfirm: () => void;
  onClose: () => void;
};

export function ConfirmationDialog({
  title,
  message,
  confirmLabel,
  onConfirm,
  onClose,
}: ConfirmationDialogProps) {
  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[140] flex items-center justify-center bg-slate-950/50 p-6 backdrop-blur-sm"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        className="w-full max-w-md overflow-hidden rounded-lg border border-slate-200 bg-white shadow-[0_35px_100px_rgba(4,25,35,.38)]"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirmation-title"
        aria-describedby="confirmation-message"
      >
        <div className="px-5 py-5">
          <h2 className="text-lg font-semibold" id="confirmation-title">
            {title}
          </h2>
          <p className="mt-2 text-sm leading-6 text-slate-600" id="confirmation-message">
            {message}
          </p>
        </div>
        <div className="flex justify-end gap-2 border-t border-slate-200 px-5 py-3 [&_button]:rounded-lg [&_button]:px-4 [&_button]:py-2 [&_button]:text-sm [&_button]:font-bold">
          <button className="border border-slate-300" type="button" onClick={onClose}>
            Cancel
          </button>
          <button
            className="bg-red-600 text-white hover:bg-red-700"
            type="button"
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
        </div>
      </section>
    </div>
  );
}
