import type { BuyerOrder } from "./buyer-data";

export function buyerPaymentStatus(status: BuyerOrder["status"]) {
  return ["paid", "processing", "packed", "shipped", "delivered"].includes(status)
    ? "paid"
    : status;
}

export function buyerPaymentLabel(status: BuyerOrder["status"]) {
  const paymentStatus = buyerPaymentStatus(status);
  return paymentStatus.charAt(0).toUpperCase() + paymentStatus.slice(1);
}
