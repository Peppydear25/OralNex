"use client";

import Script from "next/script";
import { useEffect, useState } from "react";

type EmbeddedCheckout = {
  mount: (selector: string) => void;
  destroy: () => void;
};

type StripeClient = {
  createEmbeddedCheckoutPage: (options: {
    fetchClientSecret: () => Promise<string>;
    onComplete: () => void;
  }) => Promise<EmbeddedCheckout>;
};

declare global {
  interface Window {
    Stripe?: (publishableKey: string) => StripeClient;
  }
}

export function EmbeddedPayment({
  clientSecret,
  publishableKey,
  sessionId,
}: {
  clientSecret: string;
  publishableKey: string;
  sessionId: string;
}) {
  const [scriptReady, setScriptReady] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!scriptReady || !window.Stripe) return;

    let disposed = false;
    let checkout: EmbeddedCheckout | undefined;
    const mount = async () => {
      try {
        checkout = await window.Stripe!(publishableKey).createEmbeddedCheckoutPage({
          fetchClientSecret: async () => clientSecret,
          onComplete: () => {
            window.location.replace(
              `/checkout/success?session_id=${encodeURIComponent(sessionId)}`,
            );
          },
        });
        if (disposed) checkout.destroy();
        else checkout.mount("#stripe-embedded-checkout");
      } catch {
        if (!disposed) setError("The payment form could not load. Please retry or contact us.");
      }
    };
    void mount();

    return () => {
      disposed = true;
      checkout?.destroy();
    };
  }, [clientSecret, publishableKey, scriptReady, sessionId]);

  return (
    <>
      <Script
        src="https://js.stripe.com/v3/"
        strategy="afterInteractive"
        onReady={() => setScriptReady(true)}
        onError={() => setError("Stripe could not load. Check your connection and retry.")}
      />
      {error ? (
        <p className="rounded-xl bg-red-50 p-4 text-sm text-red-700" role="alert">
          {error}
        </p>
      ) : (
        !scriptReady && <p className="p-4 text-sm text-slate-500">Loading secure payment…</p>
      )}
      <div id="stripe-embedded-checkout" className="min-w-0" />
    </>
  );
}
