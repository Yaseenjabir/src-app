import { useEffect, useState } from "react";
import { ScrollView, Text, TouchableOpacity, View } from "react-native";
import { listInvoicesApi } from "../api/invoices";
import { useAuth } from "../auth/AuthContext";
import type { Page } from "../types/navigation";
import { useAppTheme } from "../theme/AppThemeContext";
import type { Invoice, InvoiceStatus } from "../types/entities";
import { customerNameFromRef, formatMoney, statusLabel } from "../utils/format";
import { ActionPill, BoxIcon, Card, SectionTitle } from "../components/common";

type InvoiceFilterKey = "all" | InvoiceStatus;

export function InvoicesScreen({
  onGo,
  refreshTick = 0,
}: {
  onGo: (p: Page) => void;
  refreshTick?: number;
}) {
  const { styles, badgeStyle } = useAppTheme();
  const { token } = useAuth();
  const [items, setItems] = useState<Invoice[]>([]);
  const [activeFilter, setActiveFilter] = useState<InvoiceFilterKey>("all");
  const [counts, setCounts] = useState<Record<InvoiceFilterKey, number>>({
    all: 0,
    unpaid: 0,
    partial: 0,
    completed: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      if (!token) return;
      setIsLoading(true);
      setError(null);

      try {
        const [
          listResponse,
          allResponse,
          unpaidResponse,
          partialResponse,
          paidResponse,
        ] = await Promise.all([
          listInvoicesApi(token, {
            status: activeFilter === "all" ? undefined : activeFilter,
            page: 1,
            limit: 50,
          }),
          listInvoicesApi(token, { page: 1, limit: 1 }),
          listInvoicesApi(token, { status: "unpaid", page: 1, limit: 1 }),
          listInvoicesApi(token, { status: "partial", page: 1, limit: 1 }),
          listInvoicesApi(token, { status: "completed", page: 1, limit: 1 }),
        ]);

        setItems(listResponse.items);
        setCounts({
          all: allResponse.pagination.total,
          unpaid: unpaidResponse.pagination.total,
          partial: partialResponse.pagination.total,
          completed: paidResponse.pagination.total,
        });
      } catch {
        setError("Unable to load invoices");
      } finally {
        setIsLoading(false);
      }
    };

    void load();
  }, [token, refreshTick, activeFilter]);

  const filterChips: Array<{
    key: InvoiceFilterKey;
    label: string;
  }> = [
    { key: "all", label: "All" },
    { key: "unpaid", label: "Unpaid" },
    { key: "partial", label: "Partial" },
    { key: "completed", label: "Paid" },
  ];

  return (
    <>
      <View style={styles.appBar}>
        <Text style={styles.title}>Invoices</Text>
        <TouchableOpacity onPress={() => onGo("newInvoice")}>
          <BoxIcon label="＋" red />
        </TouchableOpacity>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.actions}
      >
        {filterChips.map((filter) => (
          <ActionPill
            key={filter.key}
            label={`${filter.label} (${counts[filter.key] ?? 0})`}
            active={activeFilter === filter.key}
            onPress={() => setActiveFilter(filter.key)}
          />
        ))}
      </ScrollView>

      <SectionTitle title="Invoice List" />
      <Card>
        {isLoading ? (
          <View style={styles.listItem}>
            <Text style={styles.itemSub}>Loading invoices...</Text>
          </View>
        ) : null}

        {!isLoading && error ? (
          <View style={styles.listItem}>
            <Text style={styles.badgeUnpaid}>{error}</Text>
          </View>
        ) : null}

        {!isLoading && !error && items.length === 0 ? (
          <View style={styles.listItem}>
            <Text style={styles.itemSub}>No invoices found.</Text>
          </View>
        ) : null}

        {!isLoading &&
          !error &&
          items.map((inv, idx) => (
            <TouchableOpacity
              key={inv._id}
              style={[
                styles.listItem,
                idx === items.length - 1 && styles.noBorder,
              ]}
              onPress={() => onGo("invDetail")}
            >
              <View style={styles.itemMain}>
                <Text style={styles.itemTitle}>{inv.invoice_no}</Text>
                <Text style={styles.itemSub}>
                  {customerNameFromRef(inv.customer_id)}
                </Text>
              </View>
              <View style={styles.itemRight}>
                <Text style={styles.amount}>
                  {formatMoney(inv.total_amount)}
                </Text>
                <Text style={badgeStyle(statusLabel(inv.status))}>
                  {statusLabel(inv.status)}
                </Text>
              </View>
            </TouchableOpacity>
          ))}
      </Card>
    </>
  );
}
