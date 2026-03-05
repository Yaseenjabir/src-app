import { Ionicons } from "@expo/vector-icons";
import { Alert, Text, TouchableOpacity, View } from "react-native";
import { deletePaymentApi, type PaymentListItem } from "../api/payments";
import { ApiError } from "../api/http";
import { useAuth } from "../auth/AuthContext";
import { BoxIcon, Card } from "../components/common";
import { AppHeader } from "../components/AppHeader";
import { useToast } from "../feedback/ToastContext";
import { useAppTheme } from "../theme/AppThemeContext";
import { customerNameFromRef, formatMoney } from "../utils/format";

export function PaymentDetailScreen({
  payment,
  onBack,
  onDeleted,
}: {
  payment: PaymentListItem | null;
  onBack: () => void;
  onDeleted?: () => void;
}) {
  const { styles } = useAppTheme();
  const { showToast } = useToast();
  const { token } = useAuth();

  const invoiceRef =
    payment && typeof payment.invoice_id !== "string"
      ? payment.invoice_id
      : undefined;
  const customerRef =
    invoiceRef && typeof invoiceRef.customer_id !== "string"
      ? invoiceRef.customer_id
      : undefined;

  const handleDelete = () => {
    if (!token || !payment) return;

    Alert.alert("Delete payment", "Do you want to delete this payment?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await deletePaymentApi(token, payment._id);
            showToast("Payment deleted successfully.", "success");
            onDeleted?.();
            onBack();
          } catch (e) {
            const message =
              e instanceof ApiError ? e.message : "Unable to delete payment.";
            showToast(message, "error");
          }
        },
      },
    ]);
  };

  return (
    <>
      <AppHeader>
        <TouchableOpacity onPress={onBack}>
          <BoxIcon label="←" />
        </TouchableOpacity>
      </AppHeader>

      {!payment ? (
        <View style={styles.heroCard}>
          <Text style={styles.itemSub}>No payment selected.</Text>
        </View>
      ) : (
        <>
          <Text style={styles.sec}>PAYMENT DETAILS</Text>
          <Card>
            <View style={styles.formRow}>
              <Text style={styles.itemTitle}>Amount</Text>
              <Text style={styles.amount}>{formatMoney(payment.amount)}</Text>

              <Text style={styles.formLabel}>Method</Text>
              <Text style={styles.formValue}>{payment.method}</Text>

              <Text style={styles.formLabel}>Date</Text>
              <Text style={styles.formValue}>
                {new Date(payment.payment_date).toLocaleDateString()}
              </Text>

              <Text style={styles.formLabel}>Customer</Text>
              <Text style={styles.formValue}>
                {customerNameFromRef(customerRef)}
              </Text>

              <Text style={styles.formLabel}>Invoice</Text>
              <Text style={styles.formValue}>
                {invoiceRef?.invoice_no || "-"}
              </Text>

              <Text style={styles.formLabel}>Notes</Text>
              <Text style={styles.formValue}>
                {payment.notes?.trim() || "No notes"}
              </Text>

              <TouchableOpacity
                style={[styles.removeItemBtn, { marginTop: 16 }]}
                onPress={handleDelete}
              >
                <Ionicons name="trash-outline" size={14} color="#e8141c" />
                <Text style={styles.removeItemBtnText}>Delete Payment</Text>
              </TouchableOpacity>
            </View>
          </Card>
        </>
      )}
    </>
  );
}
