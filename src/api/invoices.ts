import { apiRequest } from "./http";
import type { PaginatedResponse } from "../types/api";
import type { Invoice, InvoiceStatus } from "../types/entities";

type ListInvoicesOptions = {
  status?: InvoiceStatus;
  customerId?: string;
  page?: number;
  limit?: number;
};

export type CreateInvoicePayload = {
  customerId: string;
  invoiceDate: string;
  discount?: number;
  notes?: string;
  items: Array<{
    productId: string;
    quantity: number;
    unitPriceSnapshot?: number;
    boxQty?: number;
  }>;
};

export type AddPaymentPayload = {
  paymentDate: string;
  amount: number;
  method?: "CASH" | "BANK" | "OTHER";
  reference?: string;
  notes?: string;
};

export type InvoiceItemSnapshot = {
  product_name_snapshot: string;
  sku_snapshot?: string;
  model_snapshot?: string;
  unit_price_snapshot: number;
  quantity: number;
  line_total: number;
  box_qty?: number;
};

export type InvoiceDetail = Invoice & {
  paid_amount?: number;
  subtotal?: number;
  discount?: number;
  notes?: string;
  items?: InvoiceItemSnapshot[];
};

export type InvoicePayment = {
  _id: string;
  invoice_id: string;
  payment_date: string;
  amount: number;
  method: "CASH" | "BANK" | "OTHER";
  reference?: string;
  notes?: string;
};

export type InvoicePaymentsResponse = {
  invoice: {
    _id: string;
    invoice_no: string;
    total_amount: number;
    paid_amount: number;
    remaining_amount: number;
    status: InvoiceStatus;
  };
  payments: InvoicePayment[];
};

export type AddInvoicePaymentResponse = {
  payment: InvoicePayment;
  invoice: InvoiceDetail;
};

export type UpdateInvoicePayload = {
  invoiceDate?: string;
  discount?: number;
  notes?: string;
  items?: Array<{
    productId: string;
    quantity: number;
    unitPriceSnapshot?: number;
  }>;
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

  if (options.customerId) {
    params.set("customerId", options.customerId);
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

export function getInvoiceByIdApi(token: string, invoiceId: string) {
  return apiRequest<InvoiceDetail>(`/invoices/${invoiceId}`, {
    method: "GET",
    token,
  });
}

export function updateInvoiceApi(
  token: string,
  invoiceId: string,
  body: UpdateInvoicePayload,
) {
  return apiRequest<InvoiceDetail>(`/invoices/${invoiceId}`, {
    method: "PATCH",
    token,
    body,
  });
}

export function deleteInvoiceApi(token: string, invoiceId: string) {
  return apiRequest<{ message: string }>(`/invoices/${invoiceId}`, {
    method: "DELETE",
    token,
  });
}

export function listInvoicePaymentsApi(token: string, invoiceId: string) {
  return apiRequest<InvoicePaymentsResponse>(
    `/invoices/${invoiceId}/payments`,
    {
      method: "GET",
      token,
    },
  );
}

export function addInvoicePaymentApi(
  token: string,
  invoiceId: string,
  body: AddPaymentPayload,
) {
  return apiRequest<AddInvoicePaymentResponse>(
    `/invoices/${invoiceId}/payments`,
    {
      method: "POST",
      token,
      body,
    },
  );
}

export function appendInvoiceItemsApi(
  token: string,
  invoiceId: string,
  items: Array<{
    productId: string;
    quantity: number;
    unitPriceSnapshot?: number;
    boxQty?: number;
  }>,
) {
  return apiRequest<InvoiceDetail>(`/invoices/${invoiceId}/items`, {
    method: "POST",
    token,
    body: { items },
  });
}

export function deleteInvoicePaymentApi(token: string, paymentId: string) {
  return apiRequest<{ message: string }>(`/invoices/payments/${paymentId}`, {
    method: "DELETE",
    token,
  });
}
