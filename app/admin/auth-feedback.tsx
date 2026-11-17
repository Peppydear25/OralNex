"use client";

import { useState } from "react";
import { ActionResultModal, type ActionResult } from "../components/action-result-modal";

export function AdminAuthFeedback({ status }: { status?: "signed-in" }) {
  const [result, setResult] = useState<ActionResult | null>(
    status === "signed-in"
      ? {
          tone: "success",
          title: "Admin access confirmed",
          message: "You are signed in.",
        }
      : null,
  );

  return (
    <ActionResultModal
      result={result}
      onClose={() => {
        setResult(null);
        const url = new URL(window.location.href);
        url.searchParams.delete("auth");
        window.history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
      }}
    />
  );
}
