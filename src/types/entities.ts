export type Customer = {
  _id: string;
  name: string;
  shop_name?: string;
  address?: string;
  phone?: string;
  notes?: string;
  is_active: boolean;
};

export type Product = {
  _id: string;
  sku: string;
  name: string;
  category: string;
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
      };
  invoice_date: string;
  total_amount: number;
  remaining_amount: number;
  status: InvoiceStatus;
};
