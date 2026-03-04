import { Text, TouchableOpacity, View } from "react-native";
import { Card } from "../components/common";
import { useAppTheme } from "../theme/AppThemeContext";

export function NewInvoiceScreen({ onBack }: { onBack: () => void }) {
  const { styles } = useAppTheme();

  return (
    <>
      <View style={styles.appBar}>
        <TouchableOpacity onPress={onBack}>
          <Text style={styles.back}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>New Invoice</Text>
        <View style={{ width: 36 }} />
      </View>

      <Card>
        <View style={styles.formRow}>
          <Text style={styles.formLabel}>Invoice Number</Text>
          <Text style={styles.formValue}>#INV-0043</Text>
        </View>
        <View style={styles.formRow}>
          <Text style={styles.formLabel}>Customer</Text>
          <Text style={styles.formValue}>— Select Customer —</Text>
        </View>
        <View style={[styles.formRow, styles.noBorder]}>
          <Text style={styles.formLabel}>Status</Text>
          <Text style={styles.formValue}>Unpaid</Text>
        </View>
      </Card>

      <TouchableOpacity style={styles.cta}>
        <Text style={styles.ctaText}>Generate Invoice</Text>
      </TouchableOpacity>
    </>
  );
}
