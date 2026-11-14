"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { createClient } from "../../lib/supabase/client";
import { isSupabaseConfigured } from "../../lib/supabase/config";
import { readStoredJson, removeStoredValue, writeStoredJson } from "../lib/browser-storage";
import { loadShippingAddresses } from "./supabase-addresses";
import { clearBuyerSessionPreference } from "../../lib/supabase/remember-me";

export type ShippingAddress = {
  id: string;
  label: string;
  firstName: string;
  lastName: string;
  company?: string;
  address1: string;
  address2?: string;
  city: string;
  state: string;
  postalCode: string;
  isDefault: boolean;
};

export type BuyerAccount = {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  addresses?: ShippingAddress[];
};
type BuyerAccountContextValue = {
  buyer: BuyerAccount | null;
  signIn: (buyer: BuyerAccount) => void;
  signOut: () => void;
};
const BuyerAccountContext = createContext<BuyerAccountContextValue | null>(null);
const STORAGE_KEY = "otm-buyer-preview-v1";

function validateBuyer(value: unknown): BuyerAccount | null {
  if (!value || typeof value !== "object") return null;

  const candidate = value as Partial<BuyerAccount>;
  if (
    typeof candidate.firstName !== "string" ||
    typeof candidate.lastName !== "string" ||
    typeof candidate.email !== "string"
  ) {
    return null;
  }

  const buyer = {
    firstName: candidate.firstName.trim().slice(0, 80),
    lastName: candidate.lastName.trim().slice(0, 80),
    email: candidate.email.trim().toLowerCase().slice(0, 254),
    phone: typeof candidate.phone === "string" ? candidate.phone.trim().slice(0, 30) : undefined,
    addresses: Array.isArray(candidate.addresses)
      ? candidate.addresses
          .filter(
            (address): address is ShippingAddress =>
              Boolean(address) &&
              typeof address.id === "string" &&
              typeof address.label === "string" &&
              typeof address.firstName === "string" &&
              typeof address.lastName === "string" &&
              typeof address.address1 === "string" &&
              typeof address.city === "string" &&
              typeof address.state === "string" &&
              typeof address.postalCode === "string" &&
              typeof address.isDefault === "boolean",
          )
          .slice(0, 10)
      : [],
  };
  return buyer.firstName && buyer.lastName && buyer.email ? buyer : null;
}

export function BuyerAccountProvider({ children }: { children: React.ReactNode }) {
  const [buyer, setBuyer] = useState<BuyerAccount | null>(null);
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    if (isSupabaseConfigured()) {
      const supabase = createClient();
      let active = true;
      const syncUser = async (
        user: {
          id: string;
          email?: string;
          user_metadata?: { first_name?: string; last_name?: string; phone?: string };
        } | null,
      ) => {
        if (!active) return;
        if (!user?.email) {
          setBuyer(null);
          return;
        }

        const { data: claimsData } = await supabase.auth.getClaims();
        if (!active) return;
        if (claimsData?.claims?.user_role === "admin") {
          setBuyer(null);
          return;
        }

        const [{ data: profile }, addressResult] = await Promise.all([
          supabase
            .from("profiles")
            .select("first_name,last_name,phone")
            .eq("id", user.id)
            .maybeSingle(),
          loadShippingAddresses(user.id),
        ]);
        if (!active) return;

        setBuyer({
          firstName: String(profile?.first_name || user.user_metadata?.first_name || "Buyer"),
          lastName: String(profile?.last_name || user.user_metadata?.last_name || ""),
          email: user.email,
          phone: profile?.phone || user.user_metadata?.phone,
          addresses: addressResult.addresses,
        });
      };

      void supabase.auth.getUser().then(async ({ data }) => {
        await syncUser(data.user);
        if (active) setHydrated(true);
      });
      const { data } = supabase.auth.onAuthStateChange((_event, session) => {
        // Defer the profile query until the auth callback has released its lock.
        window.setTimeout(() => void syncUser(session?.user ?? null), 0);
      });
      return () => {
        active = false;
        data.subscription.unsubscribe();
      };
    }

    const saved = readStoredJson(STORAGE_KEY, validateBuyer, null);
    queueMicrotask(() => {
      setBuyer(saved);
      setHydrated(true);
    });
  }, []);
  useEffect(() => {
    if (!hydrated) return;
    if (isSupabaseConfigured()) {
      removeStoredValue(STORAGE_KEY);
      return;
    }
    if (buyer) writeStoredJson(STORAGE_KEY, buyer);
    else removeStoredValue(STORAGE_KEY);
  }, [buyer, hydrated]);
  const value = useMemo(
    () => ({
      buyer,
      signIn: setBuyer,
      signOut: () => {
        setBuyer(null);
        if (isSupabaseConfigured()) {
          clearBuyerSessionPreference();
          void createClient().auth.signOut();
        }
      },
    }),
    [buyer],
  );
  return <BuyerAccountContext.Provider value={value}>{children}</BuyerAccountContext.Provider>;
}

export function useBuyerAccount() {
  const value = useContext(BuyerAccountContext);
  if (!value) {
    throw new Error("useBuyerAccount must be used within BuyerAccountProvider");
  }
  return value;
}
