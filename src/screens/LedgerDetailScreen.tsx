import { useEffect, useMemo, useState } from "react";
import { Text, TouchableOpacity, View } from "react-native";
import { listInvoicesApi } from "../api/invoices";
import { useAuth } from "../auth/AuthContext";
import { AppHeader } from "../components/AppHeader";
import { BoxIcon, Card, Loader } from "../components/common";
import { useToast } from "../feedback/ToastContext";
import { useAppTheme } from "../theme/AppThemeContext";
import type { Customer, Invoice } from "../types/entities";
import { formatMoney, statusLabel } from "../utils/format";

export function LedgerDetailScreen({
  customer,
  onBack,
  refreshTick = 0,
}: {
  customer: Customer | null;
  onBack: () => void;
  refreshTick?: number;
}) {
  const { styles, badgeStyle } = useAppTheme();
  const { showToast } = useToast();
  const { token } = useAuth();

  const [items, setItems] = useState<Invoice[]>([]);
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
        setItems(response.items);
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

  return (
    <>
      <AppHeader>
        <TouchableOpacity onPress={onBack}>
          <BoxIcon label="←" />
        </TouchableOpacity>
      </AppHeader>

      <Text style={styles.sec}>LEDGER DETAILS</Text>
      <View style={styles.heroCard}>
        <Text style={styles.itemTitle}>
          {customer?.shop_name || customer?.name || "Customer"}
        </Text>
        <Text style={styles.itemSub}>
          {customer?.phone || customer?.address || "-"}
        </Text>
      </View>

      <Card>
        {isLoading ? <Loader /> : null}

        {!isLoading && error ? (
          <View style={styles.listItem}>
            <Text style={styles.badgeUnpaid}>{error}</Text>
          </View>
        ) : null}

        {!isLoading && !error && items.length === 0 ? (
          <View style={styles.listItem}>
            <Text style={styles.itemSub}>
              No invoices found for this customer.
            </Text>
          </View>
        ) : null}

        {!isLoading &&
          !error &&
          items.map((inv, idx) => (
            <View
              key={inv._id}
              style={[
                styles.listItem,
                idx === items.length - 1 && styles.noBorder,
              ]}
            >
              <View style={styles.itemMain}>
                <Text style={styles.itemTitle}>{inv.invoice_no}</Text>
                <Text style={styles.itemSub}>
                  Total: {formatMoney(inv.total_amount)} · Remaining:{" "}
                  {formatMoney(inv.remaining_amount)}
                </Text>
              </View>
              <Text style={badgeStyle(statusLabel(inv.status))}>
                {statusLabel(inv.status)}
              </Text>
            </View>
          ))}
      </Card>

      <Text style={styles.sec}>SUMMARY</Text>
      <Card>
        <View style={styles.listItem}>
          <View style={styles.itemMain}>
            <Text style={styles.itemTitle}>Combined Invoice Amount</Text>
          </View>
          <Text style={styles.amount}>{formatMoney(totals.totalAmount)}</Text>
        </View>
        <View style={styles.listItem}>
          <View style={styles.itemMain}>
            <Text style={styles.itemTitle}>Overall Receivable</Text>
          </View>
          <Text style={styles.amountSuccess}>
            {formatMoney(totals.receivable)}
          </Text>
        </View>
        <View style={[styles.listItem, styles.noBorder]}>
          <View style={styles.itemMain}>
            <Text style={styles.itemTitle}>Overall Remaining</Text>
          </View>
          <Text style={styles.amountDanger}>
            {formatMoney(totals.remaining)}
          </Text>
        </View>
      </Card>
    </>
  );
}
