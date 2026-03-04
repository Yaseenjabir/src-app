export type InvoiceListItem = {
  no: string;
  customer: string;
  amount: string;
  status: "Unpaid" | "Partial" | "Paid";
};

export const invoiceData: InvoiceListItem[] = [
  {
    no: "#INV-0042",
    customer: "Ahmad Electronics",
    amount: "PKR 22,000",
    status: "Unpaid",
  },
  {
    no: "#INV-0041",
    customer: "Zahid Traders",
    amount: "PKR 11,500",
    status: "Partial",
  },
  {
    no: "#INV-0040",
    customer: "Raza Stores",
    amount: "PKR 8,800",
    status: "Paid",
  },
];
