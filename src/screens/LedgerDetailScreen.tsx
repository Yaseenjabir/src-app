import { useEffect, useMemo, useState } from "react";
import { Text, TouchableOpacity, View } from "react-native";
import { listInvoicesApi } from "../api/invoices";
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

  const ledgerRows = useMemo(() => {
    return items.flatMap((inv) => {
      const invoiceItems = (
        inv as Invoice & {
          items?: Array<{
            product_name_snapshot?: string;
            quantity?: number;
            unit_price_snapshot?: number;
            line_total?: number;
          }>;
        }
      ).items;

      if (!invoiceItems?.length) return [];

      return invoiceItems.map((item) => {
        const qty = Math.max(item.quantity ?? 0, 0);
        const unitPrice = Math.max(item.unit_price_snapshot ?? 0, 0);
        const computedTotal = qty * unitPrice;

        return {
          productName: item.product_name_snapshot || "-",
          quantity: qty,
          unitPrice,
          totalPrice: computedTotal || Math.max(item.line_total ?? 0, 0),
        };
      });
    });
  }, [items]);

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

        {!isLoading && !error && ledgerRows.length === 0 ? (
          <View style={styles.listItem}>
            <Text style={styles.itemSub}>No product entries found.</Text>
          </View>
        ) : null}

        {!isLoading && !error && ledgerRows.length > 0 ? (
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
                  { flex: 1.5, fontWeight: "700" },
                  styles.tableColDivider,
                ]}
              >
                Product
              </Text>
              <Text
                style={[
                  styles.itemSub,
                  { flex: 0.6, textAlign: "center", fontWeight: "700" },
                  styles.tableColDivider,
                ]}
              >
                Qty
              </Text>
              <Text
                style={[
                  styles.itemSub,
                  { flex: 0.9, textAlign: "right", fontWeight: "700" },
                  styles.tableColDivider,
                ]}
              >
                Price
              </Text>
              <Text
                style={[
                  styles.itemSub,
                  { flex: 1, textAlign: "right", fontWeight: "700" },
                ]}
              >
                Total
              </Text>
            </View>

            {ledgerRows.map((row, idx) => (
              <View key={`${row.productName}-${idx}`} style={styles.listItem}>
                <Text
                  style={[
                    styles.itemTitle,
                    { flex: 0.4 },
                    styles.tableColDivider,
                  ]}
                >
                  {idx + 1}
                </Text>
                <Text
                  style={[
                    styles.itemTitle,
                    { flex: 1.5 },
                    styles.tableColDivider,
                  ]}
                  numberOfLines={1}
                >
                  {row.productName}
                </Text>
                <Text
                  style={[
                    styles.itemSub,
                    { flex: 0.6, textAlign: "center" },
                    styles.tableColDivider,
                  ]}
                >
                  {row.quantity}
                </Text>
                <Text
                  style={[
                    styles.amount,
                    { flex: 0.9, textAlign: "right" },
                    styles.tableColDivider,
                  ]}
                >
                  {row.unitPrice.toLocaleString()}
                </Text>
                <Text style={[styles.amount, { flex: 1, textAlign: "right" }]}>
                  {row.totalPrice.toLocaleString()}
                </Text>
              </View>
            ))}
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
