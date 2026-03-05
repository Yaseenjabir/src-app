export type MainTab =
  | "dashboard"
  | "invoices"
  | "customers"
  | "products"
  | "payments";
export type Page = MainTab | "invDetail" | "newInvoice";
