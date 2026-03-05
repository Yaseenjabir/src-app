import { Text, TouchableOpacity, View } from "react-native";
import { invoiceData } from "../data/mock";
import type { Page } from "../types/navigation";
import { useAppTheme } from "../theme/AppThemeContext";
import { Card, SectionTitle, StatCard } from "../components/common";
import { AppHeader } from "../components/AppHeader";

export function DashboardScreen({ onGo }: { onGo: (p: Page) => void }) {
  const { styles, badgeStyle } = useAppTheme();

  return (
    <>
      <AppHeader />

      <View style={styles.hero}>
        <Text style={styles.heroMuted}>Good morning 👋</Text>
        <Text style={styles.heroTitle}>SRC Admin</Text>
        <Text style={styles.heroMeta}>Wed, 4 March 2026 · Gujrat</Text>
      </View>

      <Text style={styles.sec}>OVERVIEW</Text>
      <View style={styles.grid2}>
        <StatCard
          label="Receivable"
          value="PKR 1,24,500"
          sub="12 unpaid"
          color="#e8141c"
        />
        <StatCard
          label="Collected"
          value="PKR 78,200"
          sub="↑ 18% Feb"
          color="#00c97a"
        />
        <StatCard label="Partial" value="8" sub="invoices" color="#ffb020" />
        <StatCard
          label="Overdue"
          value="PKR 31K"
          sub="3 customers"
          color="#ff4d6a"
        />
      </View>

      <View style={styles.alert}>
        <Text style={styles.alertTitle}>Ahmad Electronics overdue</Text>
        <Text style={styles.alertSub}>PKR 18,500 · 7 days past due</Text>
      </View>

      <SectionTitle
        title="Recent Invoices"
        right="See all"
        onRightPress={() => onGo("invoices")}
      />
      <Card>
        {invoiceData.map((inv, idx) => (
          <TouchableOpacity
            key={inv.no}
            style={[
              styles.listItem,
              idx === invoiceData.length - 1 && styles.noBorder,
            ]}
            onPress={() => onGo("invDetail")}
          >
            <View style={styles.itemMain}>
              <Text style={styles.itemTitle}>{inv.no}</Text>
              <Text style={styles.itemSub}>{inv.customer}</Text>
            </View>
            <View style={styles.itemRight}>
              <Text style={styles.amount}>{inv.amount}</Text>
              <Text style={badgeStyle(inv.status)}>{inv.status}</Text>
            </View>
          </TouchableOpacity>
        ))}
      </Card>
    </>
  );
}
