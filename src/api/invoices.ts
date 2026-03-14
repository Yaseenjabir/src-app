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
