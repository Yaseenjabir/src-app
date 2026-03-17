import * as FileSystem from "expo-file-system/legacy";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import type { Customer } from "../types/entities";
import { formatMoney } from "./format";
import { LOGO1_BASE64, LOGO2_BASE64 } from "./pdfLogoAssets";

export type LedgerRow =
  | { kind: "opening"; credit: number; ts: 0; sortId: ""; _key: string }
  | {
      kind: "invoice";
      date: string;
      invoiceNo: string;
      credit: number;
      ts: number;
      sortId: string;
      _key: string;
    }
  | {
      kind: "payment";
      date: string;
      amount: number;
      method: string;
      ts: number;
      sortId: string;
      _key: string;
    };

type Totals = {
  openingBalance: number;
  totalInvoiced: number;
  totalOutstanding: number;
  totalPaid: number;
  remaining: number;
};

function buildHtml(
  customer: Customer,
  ledgerRows: LedgerRow[],
  totals: Totals,
  logo1: string | null,
  logo2: string | null,
): string {
  const logoImg = (src: string | null, alt: string) =>
    src
      ? `<img src="${src}" alt="${alt}" class="logo-img" />`
      : `<div class="logo-placeholder">${alt}</div>`;

  let runningBalance = 0;
  let rowsHtml = "";

  if (ledgerRows.length === 0) {
    rowsHtml = `<tr><td colspan="6" style="text-align:center;color:#999;padding:20px;">No ledger entries.</td></tr>`;
  } else {
    ledgerRows.forEach((row, idx) => {
      let debit = 0;
      let credit = 0;
      let description = "";
      let dateLabel = "—";

      if (row.kind === "opening") {
        credit = row.credit;
        description = "Opening Balance";
      } else if (row.kind === "invoice") {
        credit = row.credit;
        description = `Invoice #${row.invoiceNo}`;
        dateLabel = new Date(row.date).toLocaleDateString("en-PK", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        });
      } else {
        debit = row.amount;
        description = `Payment (${row.method})`;
        dateLabel = new Date(row.date).toLocaleDateString("en-PK", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        });
      }

      runningBalance = runningBalance + credit - debit;
      const altRow = idx % 2 === 1 ? "row-alt" : "";
      const balanceColor = runningBalance > 0 ? "#c62828" : "#2e7d32";

      rowsHtml += `
        <tr class="${altRow}">
          <td class="center">${idx + 1}</td>
          <td>${dateLabel}</td>
          <td>${description}</td>
          <td class="right red bold">${debit > 0 ? debit.toLocaleString() : "—"}</td>
          <td class="right green bold">${credit > 0 ? credit.toLocaleString() : "—"}</td>
          <td class="right bold" style="color:${balanceColor}">${runningBalance.toLocaleString()}</td>
        </tr>`;
    });
  }

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: Arial, sans-serif;
    font-size: 12px;
    color: #1a1a2e;
    background: #fff;
  }

  /* ─── Header Band ─── */
  .header-band {
    background: #ffffff;
    padding: 16px 24px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    border-bottom: 2px solid #eeeeee;
  }
  .logo-img {
    width: 130px;
    height: 130px;
    object-fit: contain;
    border-radius: 6px;
  }
  .logo-placeholder {
    width: 130px;
    height: 130px;
    background: #f5f5f5;
    border-radius: 6px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #999;
    font-size: 9px;
    font-weight: 700;
  }
  .header-center {
    flex: 1;
    text-align: center;
    padding: 0 14px;
  }
  .brand {
    font-size: 38px;
    font-weight: 900;
    color: #e8141c;
    letter-spacing: 4px;
    line-height: 1;
  }
  .traders {
    font-size: 12px;
    font-weight: 700;
    color: #333;
    letter-spacing: 8px;
    margin-top: 3px;
  }
  .contact {
    font-size: 11px;
    color: #555;
    margin-top: 8px;
  }
  .wa-icon { vertical-align: middle; margin-right: 3px; }

  /* ─── Red accent line ─── */
  .accent-line {
    height: 4px;
    background: linear-gradient(to right, #e8141c, #ff6b35, #e8141c);
  }

  /* ─── Meta Strip ─── */
  .meta-strip {
    background: #e8eaf6;
    padding: 10px 24px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-bottom: 2px solid #c5cae9;
  }
  .meta-item { display: flex; flex-direction: column; gap: 1px; }
  .meta-label {
    font-size: 8px;
    font-weight: 700;
    color: #5c6bc0;
    letter-spacing: 0.8px;
    text-transform: uppercase;
  }
  .meta-value { font-size: 14px; font-weight: 800; color: #1a237e; }

  /* ─── Table ─── */
  .table-wrap { padding: 0 24px; margin-top: 0; }
  table { width: 100%; border-collapse: collapse; margin-top: 14px; }
  thead tr { background: #1a237e; }
  th {
    padding: 9px 10px;
    font-size: 10px;
    font-weight: 700;
    color: #fff;
    text-align: left;
    letter-spacing: 0.5px;
    text-transform: uppercase;
  }
  th.center, td.center { text-align: center; }
  th.right,  td.right  { text-align: right; }
  td {
    padding: 8px 10px;
    font-size: 12px;
    border-bottom: 1px solid #e8eaf6;
    color: #1a1a2e;
  }
  .row-alt td { background: #e8eaf6; }
  .bold { font-weight: 700; }

  /* ─── Summary rows ─── */
  .sum-section { padding: 14px 24px 0; }
  .sum-row {
    display: flex;
    justify-content: space-between;
    padding: 6px 0;
    border-bottom: 1px solid #e8eaf6;
    font-size: 12px;
  }
  .sum-row:last-child { border-bottom: none; }
  .sum-label { color: #5c6bc0; font-weight: 600; }

  /* ─── Total band ─── */
  .total-band {
    background: #1a237e;
    margin: 6px 24px 0;
    border-radius: 6px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 10px 16px;
  }
  .total-label { font-size: 13px; font-weight: 700; color: #90caf9; letter-spacing: 0.5px; }
  .total-value { font-size: 20px; font-weight: 900; color: #fff; }

  /* ─── Colors ─── */
  .red   { color: #c62828; }
  .green { color: #2e7d32; }

  /* ─── Signature ─── */
  .sig-row {
    display: flex;
    justify-content: space-between;
    margin: 36px 24px 0;
  }
  .sig-box {
    width: 40%;
    padding-top: 6px;
    border-top: 1.5px solid #9fa8da;
    font-size: 9px;
    font-weight: 700;
    color: #7986cb;
    letter-spacing: 0.5px;
    text-transform: uppercase;
  }
  .sig-box.right { text-align: right; }
</style>
</head>
<body>

  <!-- Header -->
  <div class="header-band">
    ${logoImg(logo1, "SRC")}
    <div class="header-center">
      <div class="brand">JAVED</div>
      <div class="traders">T R A D E R S</div>
      <div class="contact">Shafiq Ur Rehman &nbsp;<svg class="wa-icon" xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24"><path fill="#25D366" d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/></svg>&nbsp;0333-8998646</div>
    </div>
    ${logoImg(logo2, "NON")}
  </div>
  <div class="accent-line"></div>

  <!-- Customer meta -->
  <div class="meta-strip">
    <div class="meta-item">
      <span class="meta-label">Customer</span>
      <span class="meta-value">${customer.name || "—"}</span>
    </div>
    <div class="meta-item" style="text-align:center">
      <span class="meta-label">Shop</span>
      <span class="meta-value">${customer.shop_name || "—"}</span>
    </div>
    <div class="meta-item" style="text-align:right">
      <span class="meta-label">Phone</span>
      <span class="meta-value">${customer.phone || "—"}</span>
    </div>
  </div>

  <!-- Ledger table -->
  <div class="table-wrap">
    <table>
      <thead>
        <tr>
          <th class="center" style="width:34px">#</th>
          <th style="width:110px">Date</th>
          <th>Description</th>
          <th class="right" style="width:110px">Debit</th>
          <th class="right" style="width:110px">Credit</th>
          <th class="right" style="width:110px">Balance</th>
        </tr>
      </thead>
      <tbody>
        ${rowsHtml}
      </tbody>
    </table>
  </div>

  <!-- Summary -->
  <div class="sum-section">
    <div class="sum-row">
      <span class="sum-label">Opening Balance</span>
      <span class="bold">${formatMoney(totals.openingBalance)}</span>
    </div>
    <div class="sum-row">
      <span class="sum-label">Total Invoiced</span>
      <span class="bold">${formatMoney(totals.totalInvoiced)}</span>
    </div>
    <div class="sum-row">
      <span class="sum-label">Total Outstanding</span>
      <span class="bold">${formatMoney(totals.totalOutstanding)}</span>
    </div>
    <div class="sum-row">
      <span class="sum-label">Total Paid</span>
      <span class="bold green">${formatMoney(totals.totalPaid)}</span>
    </div>
  </div>

  <!-- Remaining band -->
  <div class="total-band">
    <span class="total-label">REMAINING BALANCE</span>
    <span class="total-value">${formatMoney(totals.remaining)}</span>
  </div>

  <!-- Signatures -->
  <div class="sig-row">
    <div class="sig-box">Customer Signature</div>
    <div class="sig-box right">Authorised Signature</div>
  </div>

</body>
</html>`;
}

export async function exportLedgerPdf(
  customer: Customer,
  ledgerRows: LedgerRow[],
  totals: Totals,
): Promise<void> {
  const html = buildHtml(customer, ledgerRows, totals, LOGO1_BASE64, LOGO2_BASE64);

  const { uri } = await Print.printToFileAsync({ html, base64: false });

  const safeName = (customer.name || "Customer").replace(/[^a-zA-Z0-9]/g, "_");
  const today = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const filename = `LEDGER_${safeName}_${today}.pdf`;
  const namedUri = `${FileSystem.cacheDirectory ?? ""}${filename}`;
  await FileSystem.moveAsync({ from: uri, to: namedUri });

  await Sharing.shareAsync(namedUri, {
    mimeType: "application/pdf",
    UTI: "com.adobe.pdf",
    dialogTitle: filename,
  });
}
