import type { InvoiceStatus } from "../types/entities";

export function formatModel(model: string): string {
  return model;
}

export function formatMoney(amount: number): string {
  return `PKR ${amount.toLocaleString()}`;
}

export function statusLabel(
  status: InvoiceStatus,
): "Unpaid" | "Partial" | "Paid" {
  if (status === "completed") return "Paid";
  if (status === "partial") return "Partial";
  return "Unpaid";
}

export function customerNameFromRef(
  ref: string | { name?: string; shop_name?: string } | undefined,
): string {
  if (!ref || typeof ref === "string") return "Customer";
  return ref.name || ref.shop_name || "Customer";
}
