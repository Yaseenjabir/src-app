import { apiRequest } from "./http";
import type { InvoiceStatus } from "../types/entities";

export type DashboardInvoiceItem = {
  _id: string;
  invoice_no: string;
  invoice_date: string;
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
      };
};

export type DashboardSummaryResponse = {
  period: {
    from: string;
    to: string;
  };
  overdue_days: number;
  kpis: {
    receivable: number;
    collected: number;
    partial_count: number;
    overdue_amount: number;
    overdue_customers: number;
  };
  top_overdue_customer: {
    customer_id: string;
    customer_name?: string;
    shop_name?: string;
    overdue_amount: number;
    oldest_invoice_date: string;
    invoice_count: number;
  } | null;
  recent_invoices: DashboardInvoiceItem[];
};

export function getDashboardSummaryApi(token: string) {
  return apiRequest<DashboardSummaryResponse>("/summary/dashboard", {
    method: "GET",
    token,
  });
}
