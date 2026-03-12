import { useEffect, useMemo, useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import { Alert, Text, TouchableOpacity, View } from "react-native";
import {
  deleteInvoiceApi,
  getInvoiceByIdApi,
  type InvoiceDetail,
} from "../api/invoices";
import { ApiError } from "../api/http";
import { useAuth } from "../auth/AuthContext";
import { BoxIcon, Card, Loader } from "../components/common";
import { AppHeader } from "../components/AppHeader";
import { useToast } from "../feedback/ToastContext";
import { useAppTheme } from "../theme/AppThemeContext";
import { customerNameFromRef, formatMoney, statusLabel } from "../utils/format";

export function InvoiceDetailScreen({
  onBack,
  invoiceId,
  onInvoiceDeleted,
}: {
  onBack: () => void;
  invoiceId: string | null;
  onInvoiceDeleted?: () => void;
}) {
  const { styles, badgeStyle } = useAppTheme();
  const { showToast } = useToast();
  const { token } = useAuth();
  const [invoice, setInvoice] = useState<InvoiceDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    if (!token || !invoiceId) return;
    setIsLoading(true);
    setError(null);
    try {
      const invoiceResponse = await getInvoiceByIdApi(token, invoiceId);
      setInvoice(invoiceResponse);
    } catch {
      setError("Unable to load invoice details.");
      showToast("Unable to load invoice details.", "error");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, invoiceId]);

  const invoiceDateText = useMemo(() => {
    if (!invoice?.invoice_date) return "";
    const dt = new Date(invoice.invoice_date);
    if (Number.isNaN(dt.getTime())) return invoice.invoice_date;
    return dt.toLocaleDateString();
  }, [invoice?.invoice_date]);

  const handleDeleteInvoice = () => {
    if (!token || !invoiceId || !invoice) return;

    Alert.alert(
      "Delete invoice",
      `Delete ${invoice.invoice_no}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteInvoiceApi(token, invoiceId);
              showToast("Invoice deleted successfully.", "success");
              onInvoiceDeleted?.();
              if (!onInvoiceDeleted) {
                onBack();
              }
            } catch (e) {
              const message =
                e instanceof ApiError ? e.message : "Unable to delete invoice.";
              setError(message);
              showToast(message, "error");
            }
          },
        },
      ],
    );
  };

  return (
    <>
      <AppHeader>
        <TouchableOpacity onPress={onBack}>
          <BoxIcon label="←" />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => void load()}>
          <BoxIcon label="↻" />
        </TouchableOpacity>
      </AppHeader>

      {!invoiceId ? (
        <View style={styles.heroCard}>
          <Text style={styles.itemSub}>No invoice selected.</Text>
        </View>
      ) : null}

      {isLoading ? (
        <View style={styles.heroCard}>
          <Loader />
        </View>
      ) : null}

      {!isLoading && error ? (
        <View style={styles.heroCard}>
          <Text style={styles.badgeUnpaid}>{error}</Text>
        </View>
      ) : null}

      {!isLoading && invoice ? (
        <>
          <View style={styles.heroCard}>
            <Text style={styles.itemTitle}>{invoice.invoice_no}</Text>
            <Text style={styles.itemSub}>
              {customerNameFromRef(invoice.customer_id)} · {invoiceDateText}
            </Text>
            <Text style={[styles.amount, { marginTop: 12 }]}>
              Total: {formatMoney(invoice.total_amount)}
            </Text>
            <Text
              style={[
                badgeStyle(statusLabel(invoice.status)),
                { marginTop: 8 },
              ]}
            >
              {statusLabel(invoice.status)}
            </Text>

            <View style={styles.customerFormActions}>
              <TouchableOpacity
                style={styles.customerIconBtnDanger}
                onPress={handleDeleteInvoice}
              >
                <Ionicons name="trash-outline" size={16} color="#e8141c" />
              </TouchableOpacity>
            </View>
          </View>

          <Text style={styles.sec}>LINE ITEMS</Text>
          <Card>
            {invoice.items && invoice.items.length > 0 ? (
              invoice.items.map((item, idx) => (
                <View
                  key={`${item.product_name_snapshot}-${idx}`}
                  style={[
                    styles.listItem,
                    idx === invoice.items!.length - 1 && styles.noBorder,
                  ]}
                >
                  <View style={styles.itemMain}>
                    <Text style={styles.itemTitle}>
                      {item.product_name_snapshot}
                    </Text>
                    <Text style={styles.itemSub}>
                      {item.quantity} × {formatMoney(item.unit_price_snapshot)}
                    </Text>
                  </View>
                  <Text style={styles.amount}>
                    {formatMoney(item.line_total)}
                  </Text>
                </View>
              ))
            ) : (
              <View style={styles.listItem}>
                <Text style={styles.itemSub}>No line items found.</Text>
              </View>
            )}
          </Card>

          <Text style={styles.sec}>NOTES</Text>
          <Card>
            <View style={[styles.listItem, styles.noBorder]}>
              <Text style={styles.itemSub}>
                {invoice.notes?.trim() || "No notes added."}
              </Text>
            </View>
          </Card>
        </>
      ) : null}
    </>
  );
}
