import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { getCustomerApi } from "../api/customers";
import { listInvoicesApi } from "../api/invoices";
import {
  createLedgerPaymentApi,
  listCustomerLedgerPaymentsApi,
  setOpeningBalanceApi,
} from "../api/ledgerPayments";
import { useAuth } from "../auth/AuthContext";
import { AppHeader } from "../components/AppHeader";
import { BoxIcon, Card, Loader } from "../components/common";
import { useToast } from "../feedback/ToastContext";
import { useAppTheme } from "../theme/AppThemeContext";
import type { Customer, Invoice, LedgerPayment } from "../types/entities";
import { formatMoney } from "../utils/format";

type LedgerRow =
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

const PAYMENT_METHODS: Array<"CASH" | "BANK" | "OTHER"> = [
  "CASH",
  "BANK",
  "OTHER",
];

export function LedgerDetailScreen({
  customer: customerProp,
  onBack,
  refreshTick = 0,
}: {
  customer: Customer | null;
  onBack: () => void;
  refreshTick?: number;
}) {
  const { styles } = useAppTheme();
  const { showToast } = useToast();
  const { token } = useAuth();

  const [localCustomer, setLocalCustomer] = useState<Customer | null>(
    customerProp,
  );
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [payments, setPayments] = useState<LedgerPayment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Opening balance form
  const [isObFormOpen, setIsObFormOpen] = useState(false);
  const [obInput, setObInput] = useState("");
  const [isSavingOb, setIsSavingOb] = useState(false);

  // Payment form
  const [isPaymentFormOpen, setIsPaymentFormOpen] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentMethod, setPaymentMethod] =
    useState<"CASH" | "BANK" | "OTHER">("CASH");
  const [paymentNotes, setPaymentNotes] = useState("");
  const [isSavingPayment, setIsSavingPayment] = useState(false);

  const customerId = customerProp?._id;

  const load = useCallback(async () => {
    if (!token || !customerId) return;
    setIsLoading(true);
    setError(null);
    try {
      const [freshCustomer, invoiceRes, ledgerPayments] = await Promise.all([
        getCustomerApi(token, customerId),
        listInvoicesApi(token, { customerId, page: 1, limit: 200 }),
        listCustomerLedgerPaymentsApi(token, customerId),
      ]);
      setLocalCustomer(freshCustomer);
      setInvoices(invoiceRes.items);
      setPayments(ledgerPayments);
    } catch {
      setError("Unable to load ledger details");
      showToast("Unable to load ledger details.", "error");
    } finally {
      setIsLoading(false);
    }
  }, [token, customerId, showToast]);

  useEffect(() => {
    void load();
  }, [load, refreshTick]);

  const totals = useMemo(() => {
    const openingBalance = localCustomer?.opening_balance ?? 0;
    const totalInvoiced = invoices.reduce(
      (sum, inv) => sum + (inv.total_amount || 0),
      0,
    );
    const totalOutstanding = openingBalance + totalInvoiced;
    const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);
    const remaining = Math.max(totalOutstanding - totalPaid, 0);
    return {
      openingBalance,
      totalInvoiced,
      totalOutstanding,
      totalPaid,
      remaining,
    };
  }, [localCustomer, invoices, payments]);

  const ledgerRows = useMemo((): LedgerRow[] => {
    const rows: LedgerRow[] = [];

    if (
      localCustomer?.opening_balance_set &&
      (localCustomer.opening_balance ?? 0) > 0
    ) {
      rows.push({
        _key: "opening",
        kind: "opening",
        credit: localCustomer.opening_balance,
        ts: 0,
        sortId: "",
      });
    }

    for (const inv of invoices) {
      rows.push({
        _key: `inv-${inv._id}`,
        kind: "invoice",
        date: inv.invoice_date,
        invoiceNo: inv.invoice_no,
        credit: inv.total_amount || 0,
        ts: new Date(inv.created_at).getTime() || 0,
        sortId: inv._id,
      });
    }

    for (const p of payments) {
      rows.push({
        _key: `pay-${p._id}`,
        kind: "payment",
        date: p.payment_date,
        amount: p.amount,
        method: p.method,
        ts: new Date(p.created_at).getTime() || 0,
        sortId: p._id,
      });
    }

    // Opening balance always first (ts=0); everything else in actual creation order
    rows.sort((a, b) => {
      if (a.ts !== b.ts) return a.ts - b.ts;
      return a.sortId < b.sortId ? -1 : a.sortId > b.sortId ? 1 : 0;
    });

    return rows;
  }, [localCustomer, invoices, payments]);

  async function handleSetOpeningBalance() {
    if (!token || !customerId) return;
    const amount = parseInt(obInput.trim(), 10);
    if (isNaN(amount) || amount < 0) {
      showToast("Enter a valid amount (0 or more).", "error");
      return;
    }
    setIsSavingOb(true);
    try {
      await setOpeningBalanceApi(token, customerId, amount);
      setIsObFormOpen(false);
      setObInput("");
      await load();
      showToast("Opening balance set.", "success");
    } catch {
      showToast("Failed to set opening balance.", "error");
    } finally {
      setIsSavingOb(false);
    }
  }

  async function handleRecordPayment() {
    if (!token || !customerId) return;
    const amount = parseInt(paymentAmount.trim(), 10);
    if (isNaN(amount) || amount <= 0) {
      showToast("Enter a valid payment amount.", "error");
      return;
    }
    if (amount > totals.remaining) {
      showToast(
        `Amount exceeds remaining balance (${totals.remaining.toLocaleString()}).`,
        "error",
      );
      return;
    }
    setIsSavingPayment(true);
    try {
      await createLedgerPaymentApi(token, customerId, {
        amount,
        method: paymentMethod,
        notes: paymentNotes.trim() || undefined,
      });
      setIsPaymentFormOpen(false);
      setPaymentAmount("");
      setPaymentMethod("CASH");
      setPaymentNotes("");
      await load();
      showToast("Payment recorded.", "success");
    } catch {
      showToast("Failed to record payment.", "error");
    } finally {
      setIsSavingPayment(false);
    }
  }

  const customer = localCustomer ?? customerProp;
  let runningBalance = 0;

  return (
    <>
      <AppHeader>
        <TouchableOpacity onPress={onBack}>
          <BoxIcon label="←" />
        </TouchableOpacity>
      </AppHeader>

      <Text style={styles.sec}>CUSTOMER</Text>
      <View style={[styles.heroCard, { marginBottom: 12 }]}>
        <Text style={styles.itemTitle}>{customer?.name ?? "Customer"}</Text>
        {customer?.shop_name ? (
          <Text style={styles.itemSub}>
            <Text style={{ fontWeight: "700" }}>Shop: </Text>
            {customer.shop_name}
          </Text>
        ) : null}
        {customer?.phone ? (
          <Text style={styles.itemSub}>
            <Text style={{ fontWeight: "700" }}>Phone: </Text>
            {customer.phone}
          </Text>
        ) : null}
        {customer?.address ? (
          <Text style={styles.itemSub}>
            <Text style={{ fontWeight: "700" }}>Address: </Text>
            {customer.address}
          </Text>
        ) : null}
      </View>

      {/* Opening balance section */}
      {!isLoading && customer && !customer.opening_balance_set ? (
        <View style={{ marginHorizontal: 20, marginBottom: 12 }}>
          {!isObFormOpen ? (
            <TouchableOpacity
              style={[styles.customerSecondaryBtn, { alignSelf: "flex-start" }]}
              onPress={() => setIsObFormOpen(true)}
            >
              <Text style={[styles.itemTitle, { fontSize: 12 }]}>
                + Set Opening Balance
              </Text>
            </TouchableOpacity>
          ) : (
            <View
              style={[
                styles.heroCard,
                { marginHorizontal: 0, marginTop: 0, marginBottom: 0 },
              ]}
            >
              <Text style={styles.formLabel}>OPENING BALANCE (PKR)</Text>
              <TextInput
                style={styles.formInput}
                value={obInput}
                onChangeText={setObInput}
                keyboardType="numeric"
                placeholder="e.g. 50000"
                placeholderTextColor="#666"
              />
              <View style={[styles.customerFormActions, { marginTop: 12 }]}>
                <TouchableOpacity
                  style={styles.customerSecondaryBtn}
                  onPress={() => {
                    setIsObFormOpen(false);
                    setObInput("");
                  }}
                  disabled={isSavingOb}
                >
                  <Text style={styles.itemSub}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.customerPrimaryBtn}
                  onPress={handleSetOpeningBalance}
                  disabled={isSavingOb}
                >
                  {isSavingOb ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={styles.customerPrimaryBtnText}>Submit</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>
      ) : null}

      <Text style={styles.sec}>LEDGER</Text>
      <Card>
        {isLoading ? <Loader /> : null}

        {!isLoading && error ? (
          <View style={styles.listItem}>
            <Text style={styles.badgeUnpaid}>{error}</Text>
          </View>
        ) : null}

        {!isLoading && !error ? (
          <>
            {/* Table header */}
            <View style={[styles.listItem, { paddingVertical: 9 }]}>
              <Text
                style={[
                  styles.itemSub,
                  { width: 26, fontWeight: "700" },
                  styles.tableColDivider,
                ]}
              >
                #
              </Text>
              <Text
                style={[
                  styles.itemSub,
                  { flex: 1.1, fontWeight: "700" },
                  styles.tableColDivider,
                ]}
              >
                Date
              </Text>
              <Text
                style={[
                  styles.itemSub,
                  { flex: 1.6, fontWeight: "700" },
                  styles.tableColDivider,
                ]}
              >
                Description
              </Text>
              <Text
                style={[
                  styles.itemSub,
                  { flex: 1, textAlign: "right", fontWeight: "700" },
                  styles.tableColDivider,
                ]}
              >
                Debit
              </Text>
              <Text
                style={[
                  styles.itemSub,
                  { flex: 1, textAlign: "right", fontWeight: "700" },
                  styles.tableColDivider,
                ]}
              >
                Credit
              </Text>
              <Text
                style={[
                  styles.itemSub,
                  { flex: 1, textAlign: "right", fontWeight: "700" },
                ]}
              >
                Balance
              </Text>
            </View>

            {ledgerRows.length === 0 ? (
              <View style={[styles.listItem, styles.noBorder]}>
                <Text style={styles.itemSub}>
                  No ledger entries for this customer.
                </Text>
              </View>
            ) : null}

            {ledgerRows.map((row, idx) => {
              let debit = 0;
              let credit = 0;
              let description = "";
              let dateLabel = "—";

              if (row.kind === "opening") {
                credit = row.credit;
                description = "Opening Bal.";
              } else if (row.kind === "invoice") {
                credit = row.credit;
                description = `Inv #${row.invoiceNo}`;
                dateLabel = new Date(row.date).toLocaleDateString();
              } else {
                debit = row.amount;
                description = `Payment (${row.method})`;
                dateLabel = new Date(row.date).toLocaleDateString();
              }

              runningBalance = runningBalance + credit - debit;
              const isLast = idx === ledgerRows.length - 1;

              return (
                <View
                  key={row._key}
                  style={[
                    styles.listItem,
                    isLast && styles.noBorder,
                    { paddingVertical: 10 },
                  ]}
                >
                  <Text
                    style={[
                      styles.itemSub,
                      { width: 26 },
                      styles.tableColDivider,
                    ]}
                  >
                    {idx + 1}
                  </Text>
                  <Text
                    style={[
                      styles.itemSub,
                      { flex: 1.1 },
                      styles.tableColDivider,
                    ]}
                    numberOfLines={1}
                  >
                    {dateLabel}
                  </Text>
                  <Text
                    style={[
                      styles.itemSub,
                      { flex: 1.6 },
                      styles.tableColDivider,
                    ]}
                    numberOfLines={1}
                  >
                    {description}
                  </Text>
                  <Text
                    style={[
                      styles.amount,
                      {
                        flex: 1,
                        textAlign: "right",
                        fontSize: 12,
                      },
                      styles.tableColDivider,
                    ]}
                  >
                    {debit > 0 ? debit.toLocaleString() : "—"}
                  </Text>
                  <Text
                    style={[
                      styles.amountSuccess,
                      { flex: 1, textAlign: "right", fontSize: 12 },
                      styles.tableColDivider,
                    ]}
                  >
                    {credit > 0 ? credit.toLocaleString() : "—"}
                  </Text>
                  <Text
                    style={[
                      runningBalance > 0
                        ? styles.amountDanger
                        : styles.amountSuccess,
                      { flex: 1, textAlign: "right", fontSize: 12 },
                    ]}
                  >
                    {runningBalance.toLocaleString()}
                  </Text>
                </View>
              );
            })}
          </>
        ) : null}
      </Card>

      {/* Summary */}
      {!isLoading && !error ? (
        <>
          <Text style={styles.sec}>SUMMARY</Text>
          <Card>
            <View style={styles.listItem}>
              <Text style={[styles.itemTitle, { flex: 1 }]}>
                Opening Balance
              </Text>
              <Text style={styles.amount}>
                {formatMoney(totals.openingBalance)}
              </Text>
            </View>
            <View style={styles.listItem}>
              <Text style={[styles.itemTitle, { flex: 1 }]}>
                Total Invoiced
              </Text>
              <Text style={styles.amount}>
                {formatMoney(totals.totalInvoiced)}
              </Text>
            </View>
            <View style={styles.listItem}>
              <Text style={[styles.itemTitle, { flex: 1 }]}>
                Total Outstanding
              </Text>
              <Text style={styles.amount}>
                {formatMoney(totals.totalOutstanding)}
              </Text>
            </View>
            <View style={styles.listItem}>
              <Text style={[styles.itemTitle, { flex: 1 }]}>Total Paid</Text>
              <Text style={styles.amountSuccess}>
                {formatMoney(totals.totalPaid)}
              </Text>
            </View>
            <View style={[styles.listItem, styles.noBorder]}>
              <Text style={[styles.itemTitle, { flex: 1 }]}>Remaining</Text>
              <Text style={styles.amountDanger}>
                {formatMoney(totals.remaining)}
              </Text>
            </View>
          </Card>
        </>
      ) : null}

      {/* Payment form */}
      {!isLoading && !error && isPaymentFormOpen ? (
        <>
          <Text style={styles.sec}>RECORD PAYMENT</Text>
          <Card>
            <View style={styles.formRow}>
              <Text style={styles.formLabel}>AMOUNT (PKR)</Text>
              <TextInput
                style={styles.formInput}
                value={paymentAmount}
                onChangeText={setPaymentAmount}
                keyboardType="numeric"
                placeholder="e.g. 10000"
                placeholderTextColor="#666"
              />
            </View>
            <View style={styles.formRow}>
              <Text style={styles.formLabel}>METHOD</Text>
              <View style={styles.statusRow}>
                {PAYMENT_METHODS.map((m) => (
                  <TouchableOpacity
                    key={m}
                    style={[
                      styles.chip,
                      paymentMethod === m && styles.chipActive,
                    ]}
                    onPress={() => setPaymentMethod(m)}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        paymentMethod === m && styles.chipTextActive,
                      ]}
                    >
                      {m}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
            <View style={[styles.formRow, { borderBottomWidth: 0 }]}>
              <Text style={styles.formLabel}>NOTES (optional)</Text>
              <TextInput
                style={styles.formInput}
                value={paymentNotes}
                onChangeText={setPaymentNotes}
                placeholder="Optional note"
                placeholderTextColor="#666"
              />
            </View>
            <View
              style={[
                styles.customerFormActions,
                { paddingHorizontal: 16, paddingBottom: 14 },
              ]}
            >
              <TouchableOpacity
                style={styles.customerSecondaryBtn}
                onPress={() => {
                  setIsPaymentFormOpen(false);
                  setPaymentAmount("");
                  setPaymentMethod("CASH");
                  setPaymentNotes("");
                }}
                disabled={isSavingPayment}
              >
                <Text style={styles.itemSub}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.customerPrimaryBtn}
                onPress={handleRecordPayment}
                disabled={isSavingPayment}
              >
                {isSavingPayment ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.customerPrimaryBtnText}>Submit</Text>
                )}
              </TouchableOpacity>
            </View>
          </Card>
        </>
      ) : null}

      {/* CTA */}
      {!isLoading && !error && !isPaymentFormOpen ? (
        <TouchableOpacity
          style={[
            styles.cta,
            { marginBottom: 24 },
            totals.remaining <= 0 && styles.ctaDisabled,
          ]}
          onPress={() => setIsPaymentFormOpen(true)}
          disabled={totals.remaining <= 0}
        >
          <Text style={styles.ctaText}>Record Payment</Text>
        </TouchableOpacity>
      ) : null}
    </>
  );
}
