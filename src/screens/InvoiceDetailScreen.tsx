import { Text, TouchableOpacity, View } from "react-native";
import { BoxIcon } from "../components/common";
import { useAppTheme } from "../theme/AppThemeContext";

export function InvoiceDetailScreen({ onBack }: { onBack: () => void }) {
  const { styles } = useAppTheme();

  return (
    <>
      <View style={styles.appBar}>
        <TouchableOpacity onPress={onBack}>
          <Text style={styles.back}>← Back</Text>
        </TouchableOpacity>
        <BoxIcon label="✎" />
      </View>

      <View style={styles.heroCard}>
        <Text style={styles.itemTitle}>#INV-0042</Text>
        <Text style={styles.itemSub}>Ahmad Electronics · 25 Feb 2026</Text>
        <Text style={[styles.amount, { marginTop: 12 }]}>
          Total: PKR 22,000
        </Text>
        <Text style={[styles.itemSub, { color: "#ff4d6a" }]}>
          Remaining: PKR 22,000
        </Text>
      </View>
    </>
  );
}
