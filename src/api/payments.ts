import { apiRequest } from "./http";
import type { PaginatedResponse } from "../types/api";
import type { InvoiceStatus } from "../types/entities";

export type PaymentMethod = "CASH" | "BANK" | "OTHER";

export type PaymentListItem = {
  _id: string;
  payment_date: string;
  amount: number;
  method: PaymentMethod;
  reference?: string;
  notes?: string;
  invoice_id:
    | string
    | {
        _id: string;
        invoice_no: string;
        total_amount: number;
        remaining_amount: number;
        status: InvoiceStatus;
        customer_id:
          | string
          | {
              _id: string;
              name?: string;
              shop_name?: string;
              phone?: string;
              address?: string;
            };
      };
};

export type ListPaymentsOptions = {
  invoiceId?: string;
  method?: PaymentMethod;
  fromDate?: string;
  toDate?: string;
  page?: number;
  limit?: number;
};

export type CreatePaymentPayload = {
  invoiceId: string;
  paymentDate: string;
  amount: number;
  method?: PaymentMethod;
  reference?: string;
  notes?: string;
};

export type UpdatePaymentPayload = {
  paymentDate?: string;
  amount?: number;
  method?: PaymentMethod;
  reference?: string;
  notes?: string;
};

export function listPaymentsApi(
  token: string,
  options: ListPaymentsOptions = {},
) {
  const params = new URLSearchParams();
  params.set("page", String(options.page ?? 1));
  params.set("limit", String(options.limit ?? 20));

  if (options.invoiceId) params.set("invoiceId", options.invoiceId);
  if (options.method) params.set("method", options.method);
  if (options.fromDate) params.set("fromDate", options.fromDate);
  if (options.toDate) params.set("toDate", options.toDate);

  return apiRequest<PaginatedResponse<PaymentListItem>>(
    `/payments?${params.toString()}`,
    {
      method: "GET",
      token,
    },
  );
}

export function createPaymentApi(token: string, body: CreatePaymentPayload) {
  return apiRequest<{ payment: PaymentListItem }>("/payments", {
    method: "POST",
    token,
    body,
  });
}

export function updatePaymentApi(
  token: string,
  paymentId: string,
  body: UpdatePaymentPayload,
) {
  return apiRequest<{ payment: PaymentListItem }>(`/payments/${paymentId}`, {
    method: "PATCH",
    token,
    body,
  });
}

export function deletePaymentApi(token: string, paymentId: string) {
  return apiRequest<{ message: string }>(`/payments/${paymentId}`, {
    method: "DELETE",
    token,
  });
}
