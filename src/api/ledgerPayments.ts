import { apiRequest } from "./http";
import type { PaginatedResponse } from "../types/api";
import type { LedgerPayment } from "../types/entities";

type ListLedgerPaymentsOptions = {
  customerId?: string;
  method?: "CASH" | "BANK" | "OTHER";
  page?: number;
  limit?: number;
};

export type LedgerPaymentPayload = {
  amount: number;
  method: "CASH" | "BANK" | "OTHER";
  paymentDate?: string;
  notes?: string;
};

export function listLedgerPaymentsApi(
  token: string,
  options: ListLedgerPaymentsOptions = {},
) {
  const params = new URLSearchParams();
  params.set("page", String(options.page ?? 1));
  params.set("limit", String(options.limit ?? 50));

  if (options.customerId) params.set("customerId", options.customerId);
  if (options.method) params.set("method", options.method);

  return apiRequest<PaginatedResponse<LedgerPayment>>(
    `/ledger-payments?${params.toString()}`,
    { method: "GET", token },
  );
}

export function listCustomerLedgerPaymentsApi(
  token: string,
  customerId: string,
) {
  return apiRequest<LedgerPayment[]>(
    `/customers/${customerId}/ledger-payments`,
    { method: "GET", token },
  );
}

export function createLedgerPaymentApi(
  token: string,
  customerId: string,
  body: LedgerPaymentPayload,
) {
  return apiRequest<LedgerPayment>(
    `/customers/${customerId}/ledger-payments`,
    { method: "POST", token, body },
  );
}

export function deleteLedgerPaymentApi(token: string, paymentId: string) {
  return apiRequest(`/ledger-payments/${paymentId}`, {
    method: "DELETE",
    token,
  });
}

export function setOpeningBalanceApi(
  token: string,
  customerId: string,
  amount: number,
) {
  return apiRequest(`/customers/${customerId}/opening-balance`, {
    method: "PATCH",
    token,
    body: { amount },
  });
}
