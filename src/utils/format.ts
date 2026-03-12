import type { InvoiceStatus } from "../types/entities";

const MODEL_LABELS: Record<string, string> = {
  A_SERIES: "A Series",
  K_SERIES: "K Series",
  R_SERIES: "R Series",
  UNIQUE_SERIES: "Unique Series",
};

export function formatModel(model: string): string {
  return MODEL_LABELS[model] ?? model;
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
  return ref.shop_name || ref.name || "Customer";
}
