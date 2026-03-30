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
import type { Invoice } from "../types/entities";
import { customerNameFromRef, formatMoney, statusLabel } from "../utils/format";
import {
  BoxIcon,
  Card,
  Loader,
  SectionTitle,
} from "../components/common";
import { AppHeader } from "../components/AppHeader";

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
      dateItems: [...dateItems].sort(
        (a, b) => parseInt(b.invoice_no, 10) - parseInt(a.invoice_no, 10),
      ),
    }));
  }, [filteredItems]);

  useEffect(() => {
    const load = async () => {
      if (!token) return;
      setIsLoading(true);
      setError(null);

      try {
        const allInvoices: Invoice[] = [];
        let page = 1;
        let totalPages = 1;
        while (page <= totalPages) {
          const res = await listInvoicesApi(token, { page, limit: 100 });
          allInvoices.push(...res.items);
          totalPages = res.pagination.totalPages;
          page += 1;
        }
        setItems(allInvoices);
      } catch {
        setError("Unable to load invoices");
      } finally {
        setIsLoading(false);
      }
    };

    void load();
  }, [token, refreshTick]);

  return (
    <>
      <AppHeader>
        <TouchableOpacity onPress={() => onGo("newInvoice")}>
          <BoxIcon label="＋" red />
        </TouchableOpacity>
      </AppHeader>

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
              <View key={`sep-${dateLabel}`} style={[styles.dateSeparator, groupIdx > 0 && { marginTop: 12 }]}>
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
