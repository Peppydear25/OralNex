import type { Collection, Product } from "../../data/catalog";

export type AdminTab = "overview" | "inventory" | "categories" | "orders";

export type Editor =
  { kind: "product"; product?: Product } | { kind: "collection"; collection?: Collection } | null;

export type Notice = {
  title: string;
  message?: string;
  tone?: "success" | "error";
} | null;
