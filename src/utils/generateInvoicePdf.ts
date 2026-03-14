import { Asset } from "expo-asset";
import * as FileSystem from "expo-file-system/legacy";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import type { InvoiceDetail } from "../api/invoices";
import { customerNameFromRef, formatMoney } from "./format";

async function assetToBase64(moduleId: number): Promise<string | null> {
  try {
    const asset = Asset.fromModule(moduleId);

    // Extracts the asset from the APK bundle and sets localUri.
    // Wrapped separately so a failure here doesn't skip Strategy 1.
    try {
      await asset.downloadAsync();
    } catch {
      // continue — localUri might still be set from a prior call
    }

    // Strategy 1: read from localUri (reliable in production APK builds)
    if (asset.localUri) {
      try {
        const uri = asset.localUri.startsWith("file://")
          ? asset.localUri
          : `file://${asset.localUri}`;
        const b64 = await FileSystem.readAsStringAsync(uri, {
          encoding: FileSystem.EncodingType.Base64,
        });
        return `data:image/png;base64,${b64}`;
      } catch {
        // fall through to Strategy 2
      }
    }

    // Strategy 2: download asset.uri to a temp file (works in Expo Go where
    // asset.uri is an HTTP Metro URL). In APK builds asset.uri is asset:/ which
    // FileSystem.downloadAsync cannot handle — wrapped so it doesn't propagate.
    try {
      const tempPath = `${FileSystem.cacheDirectory}logo_${moduleId}.png`;
      await FileSystem.downloadAsync(asset.uri, tempPath);
      const b64 = await FileSystem.readAsStringAsync(tempPath, {
        encoding: FileSystem.EncodingType.Base64,
      });
      return `data:image/png;base64,${b64}`;
    } catch {
      // fall through
    }

    return null;
  } catch {
    return null;
  }
}

function getCustomerName(ref: InvoiceDetail["customer_id"]): string {
  if (!ref || typeof ref === "string") return "—";
  return ref.name || ref.shop_name || "—";
}

function modelDisplayName(sku: string | undefined): string {
  if (!sku) return "—";
  const prefix = sku.split("-")[0].toUpperCase();
  switch (prefix) {
    case "AS": return "A Series";
    case "KS": return "K Series";
    case "RS": return "R Series";
    case "US": return "Unique Series";
    default:   return sku;
  }
}

function buildHtml(
  invoice: InvoiceDetail,
  logo1: string | null,
  logo2: string | null,
): string {
  const customerName = getCustomerName(invoice.customer_id);
  const date = invoice.invoice_date
    ? new Date(invoice.invoice_date).toLocaleDateString("en-PK", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : "";

  const subtotal = invoice.subtotal ?? invoice.total_amount;
  const discount = invoice.discount ?? 0;
  const paidAmount = invoice.paid_amount ?? 0;

  const itemCount = (invoice.items ?? []).length;

  const itemRows = (invoice.items ?? [])
    .map(
      (item, i) => `
        <tr class="${i % 2 === 1 ? "row-alt" : ""}">
          <td class="center">${i + 1}</td>
          <td>${item.product_name_snapshot}</td>
          <td>${modelDisplayName(item.sku_snapshot)}</td>
          <td class="center">${item.box_qty != null ? item.box_qty : "—"}</td>
          <td class="center">${item.quantity}</td>
          <td class="right">${formatMoney(item.unit_price_snapshot)}</td>
          <td class="right bold">${formatMoney(item.line_total)}</td>
        </tr>`,
    )
    .join("");

  const discountRow =
    discount > 0
      ? `<tr class="sum-row">
          <td class="center">${itemCount + 2}</td>
          <td colspan="5" class="sum-label-left">Discount</td>
          <td class="right red bold">&minus; ${formatMoney(discount)}</td>
        </tr>`
      : "";

  const paymentRows =
    paidAmount > 0
      ? `<tr class="sum-row">
          <td colspan="5" class="sum-label">Paid</td>
          <td class="right green bold">${formatMoney(paidAmount)}</td>
        </tr>
        <tr class="sum-row">
          <td colspan="5" class="sum-label">Remaining</td>
          <td class="right bold ${invoice.remaining_amount > 0 ? "red" : "green"}">${formatMoney(invoice.remaining_amount)}</td>
        </tr>`
      : "";

  const notesSection = invoice.notes?.trim()
    ? `<div class="notes-box"><span class="notes-label">Notes</span> ${invoice.notes.trim()}</div>`
    : "";

  const logoImg = (src: string | null, alt: string) =>
    src
      ? `<img src="${src}" alt="${alt}" class="logo-img" />`
      : `<div class="logo-placeholder">${alt}</div>`;

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
    width: 80px;
    height: 80px;
    object-fit: contain;
    border-radius: 6px;
  }
  .logo-placeholder {
    width: 80px;
    height: 80px;
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
  .sku { color: #7986cb; font-size: 11px; }
  .bold { font-weight: 700; }

  /* ─── Summary section ─── */
  .sum-row td { border: none; padding: 8px 10px; }
  .sum-row-divider td { border-bottom: 1px solid #c5cae9; }
  .sum-label {
    text-align: right;
    font-size: 11px;
    font-weight: 600;
    color: #5c6bc0;
  }
  .sum-label-left {
    text-align: left;
    font-size: 11px;
    font-weight: 600;
    color: #5c6bc0;
  }

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

  /* ─── Payment rows ─── */
  .payment-rows { padding: 6px 24px 0; }
  .pay-row {
    display: flex;
    justify-content: space-between;
    padding: 3px 0;
    font-size: 12px;
  }
  .pay-row-label { color: #5c6bc0; font-weight: 600; }

  /* ─── Colors ─── */
  .red   { color: #c62828; }
  .green { color: #2e7d32; }

  /* ─── Notes ─── */
  .notes-box {
    margin: 14px 24px 0;
    padding: 10px 14px;
    background: #fff8e1;
    border-left: 3px solid #ffb300;
    border-radius: 4px;
    font-size: 11px;
    color: #555;
    line-height: 1.6;
  }
  .notes-label {
    font-weight: 700;
    color: #f57f17;
    text-transform: uppercase;
    font-size: 9px;
    letter-spacing: 0.5px;
    display: block;
    margin-bottom: 3px;
  }

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

  <!-- Coloured header -->
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

  <!-- Invoice meta -->
  <div class="meta-strip">
    <div class="meta-item">
      <span class="meta-label">Bill No.</span>
      <span class="meta-value">${invoice.invoice_no}</span>
    </div>
    <div class="meta-item" style="text-align:center">
      <span class="meta-label">Customer</span>
      <span class="meta-value">${customerName}</span>
    </div>
    <div class="meta-item" style="text-align:right">
      <span class="meta-label">Date</span>
      <span class="meta-value">${date}</span>
    </div>
  </div>

  <!-- Line items -->
  <div class="table-wrap">
    <table>
      <thead>
        <tr>
          <th class="center" style="width:34px">S.No</th>
          <th>Item</th>
          <th>Model</th>
          <th class="center" style="width:54px">Box Qty</th>
          <th class="center" style="width:44px">Qty</th>
          <th class="right"  style="width:108px">Unit Price</th>
          <th class="right"  style="width:108px">Amount</th>
        </tr>
      </thead>
      <tbody>
        ${itemRows}
      </tbody>
      <tbody>
        <tr><td colspan="7" style="padding:0; border:none; height:6px;"></td></tr>
        <tr class="sum-row sum-row-divider">
          <td class="center">${itemCount + 1}</td>
          <td colspan="5" class="sum-label-left">List Total</td>
          <td class="right bold">${formatMoney(subtotal)}</td>
        </tr>
        ${discountRow}
      </tbody>
    </table>
  </div>

  <!-- Net Total band -->
  <div class="total-band">
    <span class="total-label">NET TOTAL</span>
    <span class="total-value">${formatMoney(invoice.total_amount)}</span>
  </div>

  <!-- Payment rows -->
  ${
    paidAmount > 0
      ? `<div class="payment-rows">
          <div class="pay-row">
            <span class="pay-row-label">Paid</span>
            <span class="bold green">${formatMoney(paidAmount)}</span>
          </div>
          <div class="pay-row">
            <span class="pay-row-label">Remaining</span>
            <span class="bold ${invoice.remaining_amount > 0 ? "red" : "green"}">${formatMoney(invoice.remaining_amount)}</span>
          </div>
        </div>`
      : ""
  }

  ${notesSection}

  <!-- Signatures -->
  <div class="sig-row">
    <div class="sig-box">Customer Signature</div>
    <div class="sig-box right">Authorised Signature</div>
  </div>

</body>
</html>`;
}

export async function exportInvoicePdf(invoice: InvoiceDetail): Promise<void> {
  const [logo1, logo2] = await Promise.all([
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    assetToBase64(require("../../assets/logo.png") as number),
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    assetToBase64(require("../../assets/logo2.png") as number),
  ]);

  const html = buildHtml(invoice, logo1, logo2);

  const { uri } = await Print.printToFileAsync({ html, base64: false });

  // Rename to a meaningful filename before sharing
  const customerName = getCustomerName(invoice.customer_id).replace(
    /[^a-zA-Z0-9]/g,
    "_",
  );
  const filename = `${invoice.invoice_no}_${customerName}.pdf`;
  const namedUri = `${FileSystem.cacheDirectory ?? ""}${filename}`;
  await FileSystem.moveAsync({ from: uri, to: namedUri });

  await Sharing.shareAsync(namedUri, {
    mimeType: "application/pdf",
    UTI: "com.adobe.pdf",
    dialogTitle: filename,
  });
}
