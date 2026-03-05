export type MainTab =
  | "dashboard"
  | "invoices"
  | "customers"
  | "ledger"
  | "products"
  | "payments";
export type Page =
  | MainTab
  | "invDetail"
  | "newInvoice"
  | "payDetail"
  | "ledgerDetail";
