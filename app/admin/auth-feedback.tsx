"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ActionResultModal, type ActionResult } from "../components/action-result-modal";

export function AdminAuthFeedback({ status }: { status?: "signed-in" }) {
  const router = useRouter();
  const [result, setResult] = useState<ActionResult | null>(
    status === "signed-in"
      ? {
          tone: "success",
          title: "Admin access confirmed",
          message:
            "You have signed in successfully and can now manage products, inventory, categories, and homepage merchandising.",
          actionLabel: "Continue to dashboard",
        }
      : null,
  );

  return (
    <ActionResultModal
      result={result}
      onClose={() => {
        setResult(null);
        router.replace("/admin");
      }}
    />
  );
}
