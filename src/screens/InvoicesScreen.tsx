import { ScrollView, Text, TouchableOpacity, View } from "react-native";
import { invoiceData } from "../data/mock";
import type { Page } from "../types/navigation";
import { useAppTheme } from "../theme/AppThemeContext";
import { BoxIcon, Card, Chip, SectionTitle } from "../components/common";

export function InvoicesScreen({ onGo }: { onGo: (p: Page) => void }) {
  const { styles, badgeStyle } = useAppTheme();

  return (
    <>
      <View style={styles.appBar}>
        <Text style={styles.title}>Invoices</Text>
        <BoxIcon label="＋" red />
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.actions}
      >
        <Chip label="All (42)" active />
        <Chip label="Unpaid (12)" />
        <Chip label="Partial (8)" />
        <Chip label="Paid (22)" />
      </ScrollView>

      <SectionTitle title="Invoice List" />
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
