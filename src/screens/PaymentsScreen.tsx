import { useEffect, useMemo, useState } from "react";
import { Text, TextInput, TouchableOpacity, View } from "react-native";
import { listLedgerPaymentsApi } from "../api/ledgerPayments";
import { useAuth } from "../auth/AuthContext";
import { AppHeader } from "../components/AppHeader";
import { Card, Loader } from "../components/common";
import { useToast } from "../feedback/ToastContext";
import { useAppTheme } from "../theme/AppThemeContext";
import type { LedgerPayment } from "../types/entities";
import { formatMoney } from "../utils/format";

type MethodFilter = "ALL" | "CASH" | "BANK" | "OTHER";

export function PaymentsScreen({ refreshTick = 0 }: { refreshTick?: number }) {
  const { styles } = useAppTheme();
  const { showToast } = useToast();
  const { token } = useAuth();

  const [items, setItems] = useState<LedgerPayment[]>([]);
  const [activeFilter, setActiveFilter] = useState<MethodFilter>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      if (!token) return;
      setIsLoading(true);
      setError(null);
      try {
        const res = await listLedgerPaymentsApi(token, {
          method: activeFilter === "ALL" ? undefined : activeFilter,
          limit: 100,
        });
        setItems(res.items);
      } catch {
        setError("Unable to load payments");
        showToast("Unable to load payments.", "error");
      } finally {
        setIsLoading(false);
      }
    };
    void load();
  }, [token, refreshTick, activeFilter, showToast]);

  const filteredItems = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return items;
    return items.filter((p) => {
      const customerRef =
        typeof p.customer_id === "string" ? undefined : p.customer_id;
      const name = customerRef?.name?.toLowerCase() ?? "";
      const shop = customerRef?.shop_name?.toLowerCase() ?? "";
      return name.includes(q) || shop.includes(q);
    });
  }, [items, searchQuery]);

  const groupedByDate = useMemo(() => {
    const map = new Map<string, LedgerPayment[]>();
    for (const p of filteredItems) {
      const label = new Date(p.payment_date).toLocaleDateString();
      if (!map.has(label)) map.set(label, []);
      map.get(label)!.push(p);
    }
    return Array.from(map.entries()).map(([dateLabel, dateItems]) => ({
      dateLabel,
      dateItems,
    }));
  }, [filteredItems]);

  return (
    <>
      <AppHeader />

      <View style={styles.paymentFilterWrap}>
        <Text style={styles.paymentFilterLabel}>Filter by method</Text>
        <View style={styles.paymentFilterRow}>
          {(
            [
              { label: "All", value: "ALL" },
              { label: "Cash", value: "CASH" },
              { label: "Bank", value: "BANK" },
              { label: "Other", value: "OTHER" },
            ] as const
          ).map((item) => {
            const isActive = activeFilter === item.value;
            return (
              <TouchableOpacity
                key={item.value}
                style={[
                  styles.paymentFilterButton,
                  isActive && styles.paymentFilterButtonActive,
                ]}
                onPress={() => setActiveFilter(item.value)}
              >
                <Text
                  style={[
                    styles.paymentFilterButtonText,
                    isActive && styles.paymentFilterButtonTextActive,
                  ]}
                >
                  {item.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      <View style={styles.formSection}>
        <Text style={styles.formLabel}>Search Customer</Text>
        <TextInput
          value={searchQuery}
          onChangeText={setSearchQuery}
          style={styles.formInput}
          placeholder="Search by name or shop"
          placeholderTextColor="#9aa3b2"
        />
      </View>

      <Card>
        {isLoading ? <Loader /> : null}

        {!isLoading && error ? (
          <View style={styles.listItem}>
            <Text style={styles.badgeUnpaid}>{error}</Text>
          </View>
        ) : null}

        {!isLoading && !error && filteredItems.length === 0 ? (
          <View style={[styles.listItem, styles.noBorder]}>
            <Text style={styles.itemSub}>No payments found.</Text>
          </View>
        ) : null}

        {!isLoading &&
          !error &&
          groupedByDate.flatMap(({ dateLabel, dateItems }, groupIdx) => {
            const isLastGroup = groupIdx === groupedByDate.length - 1;
            return [
              <View key={`sep-${dateLabel}`} style={styles.dateSeparator}>
                <Text style={styles.dateSeparatorText}>{dateLabel}</Text>
              </View>,
              ...dateItems.map((payment, idx) => {
                const customerRef =
                  typeof payment.customer_id === "string"
                    ? undefined
                    : payment.customer_id;
                const customerName =
                  customerRef?.shop_name || customerRef?.name || "Customer";
                return (
                  <View
                    key={payment._id}
                    style={[
                      styles.listItem,
                      isLastGroup &&
                        idx === dateItems.length - 1 &&
                        styles.noBorder,
                    ]}
                  >
                    <View style={styles.itemMain}>
                      <Text style={styles.itemTitle}>{customerName}</Text>
                      <Text style={styles.itemSub}>{payment.method}</Text>
                    </View>
                    <View style={styles.itemRight}>
                      <Text style={styles.amountSuccess}>
                        {`+ ${formatMoney(payment.amount)}`}
                      </Text>
                    </View>
                  </View>
                );
              }),
            ];
          })}
      </Card>
    </>
  );
}
