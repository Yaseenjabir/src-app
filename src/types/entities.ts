export type Customer = {
  _id: string;
  name: string;
  shop_name?: string;
  address?: string;
  phone?: string;
  notes?: string;
  is_active: boolean;
  opening_balance: number;
  opening_balance_set: boolean;
};

export type LedgerPayment = {
  _id: string;
  customer_id:
    | string
    | { _id: string; name?: string; shop_name?: string };
  payment_date: string;
  amount: number;
  method: "CASH" | "BANK" | "OTHER";
  notes?: string;
  created_at: string;
};

export type Product = {
  _id: string;
  sku: string;
  name: string;
  model: string;
  price: number;
  is_active: boolean;
};

export type InvoiceStatus = "unpaid" | "partial" | "completed";

export type Invoice = {
  _id: string;
  invoice_no: string;
  customer_id:
    | string
    | {
        _id: string;
        name?: string;
        shop_name?: string;
        phone?: string;
        address?: string;
      };
  invoice_date: string;
  total_amount: number;
  remaining_amount: number;
  status: InvoiceStatus;
};
