import { apiRequest } from "./http";
import type { PaginatedResponse } from "../types/api";
import type { Invoice, InvoiceStatus } from "../types/entities";

type ListInvoicesOptions = {
  status?: InvoiceStatus;
  page?: number;
  limit?: number;
};

export type CreateInvoicePayload = {
  invoiceNo?: string;
  customerId: string;
  invoiceDate: string;
  discount?: number;
  notes?: string;
  items: Array<{
    productId: string;
    quantity: number;
    unitPriceSnapshot?: number;
  }>;
};

export type AddPaymentPayload = {
  paymentDate: string;
  amount: number;
  method?: "CASH" | "BANK" | "OTHER";
  reference?: string;
  notes?: string;
};

export function listInvoicesApi(
  token: string,
  options: ListInvoicesOptions = {},
) {
  const params = new URLSearchParams();
  params.set("limit", String(options.limit ?? 20));
  params.set("page", String(options.page ?? 1));

  if (options.status) {
    params.set("status", options.status);
  }

  return apiRequest<PaginatedResponse<Invoice>>(
    `/invoices?${params.toString()}`,
    {
      method: "GET",
      token,
    },
  );
}

export function createInvoiceApi(token: string, body: CreateInvoicePayload) {
  return apiRequest<Invoice>("/invoices", {
    method: "POST",
    token,
    body,
  });
}

export function addInvoicePaymentApi(
  token: string,
  invoiceId: string,
  body: AddPaymentPayload,
) {
  return apiRequest(`/invoices/${invoiceId}/payments`, {
    method: "POST",
    token,
    body,
  });
}
