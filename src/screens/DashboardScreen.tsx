import { useEffect, useMemo, useState } from "react";
import { Text, TouchableOpacity, View } from "react-native";
import {
  getDashboardSummaryApi,
  type DashboardSummaryResponse,
} from "../api/dashboard";
import { useAuth } from "../auth/AuthContext";
import { AppHeader } from "../components/AppHeader";
import { Card, Loader, SectionTitle, StatCard } from "../components/common";
import { useToast } from "../feedback/ToastContext";
import { useAppTheme } from "../theme/AppThemeContext";
import type { Page } from "../types/navigation";
import { customerNameFromRef, formatMoney, statusLabel } from "../utils/format";

const EMPTY_SUMMARY: DashboardSummaryResponse = {
  period: { from: new Date().toISOString(), to: new Date().toISOString() },
  overdue_days: 7,
  kpis: {
    receivable: 0,
    collected: 0,
    partial_count: 0,
    overdue_amount: 0,
    overdue_customers: 0,
  },
  top_overdue_customer: null,
  recent_invoices: [],
};

export function DashboardScreen({
  onGo,
  refreshTick = 0,
}: {
  onGo: (p: Page) => void;
  refreshTick?: number;
}) {
  const { styles, badgeStyle } = useAppTheme();
  const { token, user } = useAuth();
  const { showToast } = useToast();
  const [summary, setSummary] =
    useState<DashboardSummaryResponse>(EMPTY_SUMMARY);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      if (!token) return;

      setIsLoading(true);
      setError(null);

      try {
        const response = await getDashboardSummaryApi(token);
        setSummary(response);
      } catch {
        setError("Unable to load dashboard summary");
        showToast("Unable to load dashboard summary.", "error");
      } finally {
        setIsLoading(false);
      }
    };

    void load();
  }, [token, refreshTick, showToast]);

  const periodText = useMemo(() => {
    const from = new Date(summary.period.from);
    return from.toLocaleDateString("en-GB", {
      month: "short",
      year: "numeric",
    });
  }, [summary.period.from]);

  const todayText = useMemo(
    () =>
      new Date().toLocaleDateString("en-GB", {
        weekday: "short",
        day: "numeric",
        month: "long",
        year: "numeric",
      }),
    [],
  );

  const greetingText = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning 👋";
    if (hour < 17) return "Good afternoon 👋";
    return "Good evening 👋";
  }, []);

  const topOverdueName = summary.top_overdue_customer
    ? summary.top_overdue_customer.shop_name ||
      summary.top_overdue_customer.customer_name ||
      "Customer"
    : null;

  return (
    <>
      <AppHeader />

      <View style={styles.hero}>
        <Text style={styles.heroMuted}>{greetingText}</Text>
        <Text style={styles.heroTitle}>{user?.name || "SRC Admin"}</Text>
        <Text style={styles.heroMeta}>{todayText}</Text>
      </View>

      <Text style={styles.sec}>OVERVIEW</Text>
      {isLoading ? <Loader /> : null}

      {!isLoading && error ? (
        <View style={styles.alert}>
          <Text style={styles.alertTitle}>{error}</Text>
          <Text style={styles.alertSub}>Pull down to refresh.</Text>
        </View>
      ) : null}

      <View style={styles.grid2}>
        <StatCard
          label="Receivable"
          value={formatMoney(summary.kpis.receivable)}
          sub={`${summary.kpis.overdue_customers} overdue customers`}
          color="#e8141c"
        />
        <StatCard
          label="Collected"
          value={formatMoney(summary.kpis.collected)}
          sub={`${periodText} total`}
          color="#00c97a"
        />
        <StatCard
          label="Partial"
          value={String(summary.kpis.partial_count)}
          sub="invoices"
          color="#ffb020"
        />
        <StatCard
          label="Overdue"
          value={formatMoney(summary.kpis.overdue_amount)}
          sub={`${summary.kpis.overdue_customers} customers`}
          color="#ff4d6a"
        />
      </View>

      {topOverdueName ? (
        <View style={styles.alert}>
          <Text style={styles.alertTitle}>{topOverdueName} overdue</Text>
          <Text style={styles.alertSub}>
            {formatMoney(summary.top_overdue_customer?.overdue_amount ?? 0)} ·{" "}
            {summary.overdue_days}+ days
          </Text>
        </View>
      ) : null}

      <SectionTitle
        title="Recent Invoices"
        right="See all"
        onRightPress={() => onGo("invoices")}
      />

      <Card>
        {!isLoading && summary.recent_invoices.length === 0 ? (
          <View style={styles.listItem}>
            <Text style={styles.itemSub}>No recent invoices found.</Text>
          </View>
        ) : null}

        {summary.recent_invoices.map((inv, idx) => (
          <TouchableOpacity
            key={inv._id}
            style={[
              styles.listItem,
              idx === summary.recent_invoices.length - 1 && styles.noBorder,
            ]}
            onPress={() => onGo("invoices")}
          >
            <View style={styles.itemMain}>
              <Text style={styles.itemTitle}>{inv.invoice_no}</Text>
              <Text style={styles.itemSub}>
                {customerNameFromRef(inv.customer_id)}
              </Text>
            </View>
            <View style={styles.itemRight}>
              <Text style={styles.amount}>{formatMoney(inv.total_amount)}</Text>
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
