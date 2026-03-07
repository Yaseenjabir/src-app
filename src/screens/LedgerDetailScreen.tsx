import { useEffect, useMemo, useState } from "react";
import { Text, TouchableOpacity, View } from "react-native";
import {
  listInvoicePaymentsApi,
  listInvoicesApi,
  type InvoicePayment,
} from "../api/invoices";
import { useAuth } from "../auth/AuthContext";
import { AppHeader } from "../components/AppHeader";
import { BoxIcon, Card, Loader } from "../components/common";
import { useToast } from "../feedback/ToastContext";
import { useAppTheme } from "../theme/AppThemeContext";
import type { Customer, Invoice } from "../types/entities";
import { formatMoney } from "../utils/format";

export function LedgerDetailScreen({
  customer,
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

  const [items, setItems] = useState<Invoice[]>([]);
  const [invoicePaymentsMap, setInvoicePaymentsMap] = useState<
    Record<string, InvoicePayment[]>
  >({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      if (!token || !customer?._id) return;
      setIsLoading(true);
      setError(null);

      try {
        const response = await listInvoicesApi(token, {
          customerId: customer._id,
          page: 1,
          limit: 200,
        });

        const paymentResults = await Promise.all(
          response.items.map(async (inv) => {
            const paymentsResponse = await listInvoicePaymentsApi(
              token,
              inv._id,
            );
            return [inv._id, paymentsResponse.payments] as const;
          }),
        );

        const nextMap: Record<string, InvoicePayment[]> = {};
        for (const [invoiceId, payments] of paymentResults) {
          nextMap[invoiceId] = payments;
        }

        setItems(response.items);
        setInvoicePaymentsMap(nextMap);
      } catch {
        setError("Unable to load ledger details");
        showToast("Unable to load ledger details.", "error");
      } finally {
        setIsLoading(false);
      }
    };

    void load();
  }, [token, customer?._id, refreshTick, showToast]);

  const totals = useMemo(() => {
    const totalAmount = items.reduce(
      (sum, inv) => sum + (inv.total_amount || 0),
      0,
    );
    const remaining = items.reduce(
      (sum, inv) => sum + (inv.remaining_amount || 0),
      0,
    );
    const receivable = Math.max(totalAmount - remaining, 0);

    return { totalAmount, receivable, remaining };
  }, [items]);

  const ledgerGroups = useMemo(() => {
    const groups: Array<{
      invoiceId: string;
      invoiceNo: string;
      rows: Array<{
        id: string;
        paymentDate: string;
        credit: number;
        balance: number;
        isSnapshot?: boolean;
      }>;
    }> = [];

    const sortedInvoices = [...items].sort((a, b) => {
      const dateDiff =
        new Date(a.invoice_date).getTime() - new Date(b.invoice_date).getTime();
      if (dateDiff !== 0) return dateDiff;
      return a.invoice_no.localeCompare(b.invoice_no);
    });

    for (const inv of sortedInvoices) {
      const payments = [...(invoicePaymentsMap[inv._id] || [])].sort((a, b) => {
        const dateDiff =
          new Date(a.payment_date).getTime() -
          new Date(b.payment_date).getTime();
        if (dateDiff !== 0) return dateDiff;
        return a._id.localeCompare(b._id);
      });

      let runningBalance = Math.max(inv.total_amount || 0, 0);
      const rows: Array<{
        id: string;
        paymentDate: string;
        credit: number;
        balance: number;
        isSnapshot?: boolean;
      }> = [
        {
          id: `snapshot-${inv._id}`,
          paymentDate: inv.invoice_date,
          credit: 0,
          balance: runningBalance,
          isSnapshot: true,
        },
      ];

      rows.push(
        ...payments.map((payment) => {
          const credit = Math.max(payment.amount || 0, 0);
          runningBalance = Math.max(runningBalance - credit, 0);

          return {
            id: payment._id,
            paymentDate: payment.payment_date,
            credit,
            balance: runningBalance,
          };
        }),
      );

      groups.push({
        invoiceId: inv._id,
        invoiceNo: inv.invoice_no,
        rows,
      });
    }

    return groups;
  }, [items, invoicePaymentsMap]);

  const totalLedgerRows = useMemo(
    () => ledgerGroups.reduce((sum, group) => sum + group.rows.length, 0),
    [ledgerGroups],
  );

  return (
    <>
      <AppHeader>
        <TouchableOpacity onPress={onBack}>
          <BoxIcon label="←" />
        </TouchableOpacity>
      </AppHeader>

      <Text style={styles.sec}>LEDGER ITEMS</Text>
      <View style={[styles.heroCard, { marginBottom: 12 }]}>
        <Text style={styles.itemTitle}>{customer?.name || "Customer"}</Text>
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
        {customer?.notes ? (
          <Text style={styles.itemSub}>
            <Text style={{ fontWeight: "700" }}>Notes: </Text>
            {customer.notes}
          </Text>
        ) : null}
        {!customer?.shop_name &&
        !customer?.phone &&
        !customer?.address &&
        !customer?.notes ? (
          <Text style={styles.itemSub}>-</Text>
        ) : null}
      </View>

      <Card>
        {isLoading ? <Loader /> : null}

        {!isLoading && error ? (
          <View style={styles.listItem}>
            <Text style={styles.badgeUnpaid}>{error}</Text>
          </View>
        ) : null}

        {!isLoading && !error && totalLedgerRows === 0 ? (
          <View style={styles.listItem}>
            <Text style={styles.itemSub}>
              No invoices found for this customer.
            </Text>
          </View>
        ) : null}

        {!isLoading && !error && totalLedgerRows > 0 ? (
          <>
            <View style={styles.listItem}>
              <Text
                style={[
                  styles.itemSub,
                  { flex: 0.4, fontWeight: "700" },
                  styles.tableColDivider,
                ]}
              ></Text>
              <Text
                style={[
                  styles.itemSub,
                  { flex: 1.1, fontWeight: "700" },
                  styles.tableColDivider,
                ]}
              >
                Invoice
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
                  { flex: 0.9, textAlign: "right", fontWeight: "700" },
                  styles.tableColDivider,
                ]}
              >
                Credit
              </Text>
              <Text
                style={[
                  styles.itemSub,
                  { flex: 0.9, textAlign: "right", fontWeight: "700" },
                ]}
              >
                Balance
              </Text>
            </View>

            {(() => {
              let serial = 0;

              return ledgerGroups.map((group) => (
                <View key={group.invoiceId} style={styles.ledgerGroupCard}>
                  {group.rows.map((row, idx) => {
                    serial += 1;

                    return (
                      <View
                        key={row.id}
                        style={[
                          styles.listItem,
                          idx === group.rows.length - 1 && styles.noBorder,
                        ]}
                      >
                        <Text
                          style={[
                            styles.itemTitle,
                            { flex: 0.4 },
                            styles.tableColDivider,
                          ]}
                        >
                          {serial}
                        </Text>
                        <Text
                          style={[
                            styles.itemTitle,
                            { flex: 1.1 },
                            styles.tableColDivider,
                          ]}
                          numberOfLines={1}
                        >
                          {group.invoiceNo}
                        </Text>
                        <Text
                          style={[
                            styles.itemSub,
                            { flex: 1.1 },
                            styles.tableColDivider,
                          ]}
                          numberOfLines={1}
                        >
                          {new Date(row.paymentDate).toLocaleDateString()}
                        </Text>
                        <Text
                          style={[
                            row.isSnapshot
                              ? styles.amount
                              : styles.amountSuccess,
                            { flex: 0.9, textAlign: "right" },
                            styles.tableColDivider,
                          ]}
                        >
                          {row.credit.toLocaleString()}
                        </Text>
                        <Text
                          style={[
                            styles.amountDanger,
                            { flex: 0.9, textAlign: "right" },
                          ]}
                        >
                          {row.balance.toLocaleString()}
                        </Text>
                      </View>
                    );
                  })}
                </View>
              ));
            })()}
          </>
        ) : null}

        {!isLoading && !error ? (
          <>
            <View style={styles.listItem}>
              <Text style={[styles.itemSub, { fontWeight: "700" }]}>
                SUMMARY
              </Text>
            </View>

            <View style={styles.listItem}>
              <Text style={[styles.itemTitle, { flex: 1 }]}>Total</Text>
              <Text style={[styles.amount, { textAlign: "right" }]}>
                {formatMoney(totals.totalAmount)}
              </Text>
            </View>

            <View style={styles.listItem}>
              <Text style={[styles.itemTitle, { flex: 1 }]}>Received</Text>
              <Text style={[styles.amountSuccess, { textAlign: "right" }]}>
                {formatMoney(totals.receivable)}
              </Text>
            </View>

            <View style={[styles.listItem, styles.noBorder]}>
              <Text style={[styles.itemTitle, { flex: 1 }]}>Remaining</Text>
              <Text style={[styles.amountDanger, { textAlign: "right" }]}>
                {formatMoney(totals.remaining)}
              </Text>
            </View>
          </>
        ) : null}
      </Card>
    </>
  );
}
