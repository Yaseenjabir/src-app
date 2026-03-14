import { useEffect, useMemo, useState } from "react";
import {
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { listInvoicesApi } from "../api/invoices";
import { useAuth } from "../auth/AuthContext";
import type { Page } from "../types/navigation";
import { useAppTheme } from "../theme/AppThemeContext";
import type { Invoice, InvoiceStatus } from "../types/entities";
import { customerNameFromRef, formatMoney, statusLabel } from "../utils/format";
import {
  ActionPill,
  BoxIcon,
  Card,
  Loader,
  SectionTitle,
} from "../components/common";
import { AppHeader } from "../components/AppHeader";

type InvoiceFilterKey = "all" | InvoiceStatus;

export function InvoicesScreen({
  onGo,
  onOpenInvoice,
  refreshTick = 0,
}: {
  onGo: (p: Page) => void;
  onOpenInvoice: (invoiceId: string) => void;
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
  const [searchQuery, setSearchQuery] = useState("");

  const filteredItems = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return items;

    return items.filter((inv) => {
      const customer =
        typeof inv.customer_id === "string"
          ? ""
          : `${inv.customer_id.name || ""} ${inv.customer_id.shop_name || ""} ${inv.customer_id.address || ""}`.toLowerCase();
      return customer.includes(q);
    });
  }, [items, searchQuery]);

  const groupedByDate = useMemo(() => {
    const map = new Map<string, Invoice[]>();
    for (const inv of filteredItems) {
      const label = new Date(inv.invoice_date).toLocaleDateString();
      if (!map.has(label)) map.set(label, []);
      map.get(label)!.push(inv);
    }
    return Array.from(map.entries()).map(([dateLabel, dateItems]) => ({
      dateLabel,
      dateItems,
    }));
  }, [filteredItems]);

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
      <AppHeader>
        <TouchableOpacity onPress={() => onGo("newInvoice")}>
          <BoxIcon label="＋" red />
        </TouchableOpacity>
      </AppHeader>

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

      <View style={styles.formSection}>
        <Text style={styles.formLabel}>Search Customer</Text>
        <TextInput
          value={searchQuery}
          onChangeText={setSearchQuery}
          style={styles.formInput}
          placeholder="Search by name, shop or location"
          placeholderTextColor="#9aa3b2"
        />
      </View>

      <SectionTitle title="Invoice List" />
      <Card>
        {isLoading ? <Loader /> : null}

        {!isLoading && error ? (
          <View style={styles.listItem}>
            <Text style={styles.badgeUnpaid}>{error}</Text>
          </View>
        ) : null}

        {!isLoading && !error && filteredItems.length === 0 ? (
          <View style={styles.listItem}>
            <Text style={styles.itemSub}>No matching invoices found.</Text>
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
              ...dateItems.map((inv, idx) => (
                <TouchableOpacity
                  key={inv._id}
                  style={[
                    styles.listItem,
                    isLastGroup &&
                      idx === dateItems.length - 1 &&
                      styles.noBorder,
                  ]}
                  onPress={() => onOpenInvoice(inv._id)}
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
              )),
            ];
          })}
      </Card>
    </>
  );
}
