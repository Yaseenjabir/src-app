import { useEffect, useMemo, useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import { Alert, Text, TextInput, TouchableOpacity, View } from "react-native";
import {
  addInvoicePaymentApi,
  deleteInvoiceApi,
  getInvoiceByIdApi,
  listInvoicePaymentsApi,
  type InvoiceDetail,
  type InvoicePayment,
} from "../api/invoices";
import { deletePaymentApi } from "../api/payments";
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
  onPaymentAdded,
  onInvoiceDeleted,
}: {
  onBack: () => void;
  invoiceId: string | null;
  onPaymentAdded?: () => void;
  onInvoiceDeleted?: () => void;
}) {
  const { styles, badgeStyle } = useAppTheme();
  const { showToast } = useToast();
  const { token } = useAuth();
  const [invoice, setInvoice] = useState<InvoiceDetail | null>(null);
  const [payments, setPayments] = useState<InvoicePayment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionPaymentId, setActionPaymentId] = useState<string | null>(null);

  const [isPaymentPanelOpen, setIsPaymentPanelOpen] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"CASH" | "BANK" | "OTHER">(
    "CASH",
  );
  const [paymentNotes, setPaymentNotes] = useState("");
  const [isSavingPayment, setIsSavingPayment] = useState(false);

  const load = async () => {
    if (!token || !invoiceId) return;
    setIsLoading(true);
    setError(null);
    try {
      const [invoiceResponse, paymentsResponse] = await Promise.all([
        getInvoiceByIdApi(token, invoiceId),
        listInvoicePaymentsApi(token, invoiceId),
      ]);
      setInvoice(invoiceResponse);
      setPayments(paymentsResponse.payments);
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

  useEffect(() => {
    setIsPaymentPanelOpen(false);
    setPaymentAmount("");
    setPaymentNotes("");
    setPaymentMethod("CASH");
  }, [invoiceId]);

  const invoiceDateText = useMemo(() => {
    if (!invoice?.invoice_date) return "";
    const dt = new Date(invoice.invoice_date);
    if (Number.isNaN(dt.getTime())) return invoice.invoice_date;
    return dt.toLocaleDateString();
  }, [invoice?.invoice_date]);

  const submitPayment = async () => {
    if (!token || !invoiceId || !invoice) return;

    const amount = Math.max(parseInt(paymentAmount || "0", 10) || 0, 0);
    const remainingAmount = Math.max(invoice.remaining_amount ?? 0, 0);

    if (amount <= 0) {
      setError("Payment amount must be greater than 0.");
      return;
    }

    if (amount > remainingAmount) {
      setError(`Payment cannot exceed remaining amount (${remainingAmount}).`);
      return;
    }

    setIsSavingPayment(true);
    setError(null);

    try {
      await addInvoicePaymentApi(token, invoiceId, {
        paymentDate: new Date().toISOString().slice(0, 10),
        amount,
        method: paymentMethod,
        notes: paymentNotes.trim() || undefined,
      });

      setPaymentAmount("");
      setPaymentNotes("");
      setPaymentMethod("CASH");
      setIsPaymentPanelOpen(false);
      showToast("Payment recorded successfully.", "success");
      onPaymentAdded?.();
      await load();
    } catch (e) {
      if (e instanceof ApiError) {
        setError(e.message);
        showToast(e.message, "error");
      } else {
        setError("Unable to add payment.");
        showToast("Unable to add payment.", "error");
      }
    } finally {
      setIsSavingPayment(false);
    }
  };

  const handleDeleteInvoice = () => {
    if (!token || !invoiceId || !invoice) return;

    Alert.alert(
      "Delete invoice",
      `Delete ${invoice.invoice_no}? This will remove all related payments.`,
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

  const handleDeletePayment = (payment: InvoicePayment) => {
    if (!token) return;

    Alert.alert("Delete payment", "Do you want to delete this payment?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            setActionPaymentId(payment._id);
            await deletePaymentApi(token, payment._id);
            showToast("Payment deleted successfully.", "success");
            onPaymentAdded?.();
            await load();
          } catch (e) {
            const message =
              e instanceof ApiError ? e.message : "Unable to delete payment.";
            setError(message);
            showToast(message, "error");
          } finally {
            setActionPaymentId(null);
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
            <Text style={[styles.amount, { marginTop: 6 }]}>
              Paid: {formatMoney(invoice.paid_amount ?? 0)}
            </Text>
            <Text style={[styles.itemSub, { color: "#ff4d6a", marginTop: 6 }]}>
              Remaining: {formatMoney(invoice.remaining_amount)}
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

          {payments.length > 0 ? (
            <>
              <Text style={styles.sec}>PAYMENT HISTORY</Text>
              <Card>
                {payments.map((payment, idx) => (
                  <View
                    key={payment._id}
                    style={[
                      styles.listItem,
                      idx === payments.length - 1 && styles.noBorder,
                    ]}
                  >
                    <View style={styles.itemMain}>
                      <Text style={styles.itemTitle}>{payment.method}</Text>
                      <Text style={styles.itemSub}>
                        {new Date(payment.payment_date).toLocaleDateString()}
                      </Text>
                    </View>
                    <Text style={[styles.amount, { marginRight: 8 }]}>
                      {formatMoney(payment.amount)}
                    </Text>

                    <TouchableOpacity
                      style={styles.customerIconBtnDanger}
                      onPress={() => handleDeletePayment(payment)}
                      disabled={actionPaymentId === payment._id}
                    >
                      <Ionicons
                        name="trash-outline"
                        size={16}
                        color="#e8141c"
                      />
                    </TouchableOpacity>
                  </View>
                ))}
              </Card>
            </>
          ) : null}

          <Text style={styles.sec}>RECORD PAYMENT</Text>
          {!isPaymentPanelOpen ? (
            <TouchableOpacity
              style={styles.cta}
              onPress={() => {
                setIsPaymentPanelOpen(true);
                setPaymentAmount(String(Math.max(invoice.remaining_amount, 0)));
              }}
              disabled={invoice.remaining_amount <= 0}
            >
              <Text style={styles.ctaText}>
                {invoice.remaining_amount <= 0 ? "Already Paid" : "Pay Amount"}
              </Text>
            </TouchableOpacity>
          ) : (
            <>
              <View style={styles.formSection}>
                <Text style={styles.formLabel}>Amount (PKR)</Text>
                <TextInput
                  value={paymentAmount}
                  onChangeText={(value) =>
                    setPaymentAmount(value.replace(/[^0-9]/g, ""))
                  }
                  keyboardType="number-pad"
                  placeholder="0"
                  placeholderTextColor="#9aa3b2"
                  style={styles.formInput}
                />

                <Text style={[styles.formLabel, { marginTop: 10 }]}>
                  Method
                </Text>
                <View style={styles.statusRow}>
                  {(["CASH", "BANK", "OTHER"] as const).map((item) => (
                    <TouchableOpacity
                      key={item}
                      style={[
                        styles.chip,
                        paymentMethod === item && styles.chipActive,
                      ]}
                      onPress={() => setPaymentMethod(item)}
                    >
                      <Text
                        style={[
                          styles.chipText,
                          paymentMethod === item && styles.chipTextActive,
                        ]}
                      >
                        {item}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <Text style={[styles.formLabel, { marginTop: 10 }]}>
                  Notes (Optional)
                </Text>
                <TextInput
                  value={paymentNotes}
                  onChangeText={setPaymentNotes}
                  placeholder="Add note"
                  placeholderTextColor="#9aa3b2"
                  style={styles.formInput}
                />

                <View style={styles.customerFormActions}>
                  <TouchableOpacity
                    style={styles.customerSecondaryBtn}
                    onPress={() => {
                      setIsPaymentPanelOpen(false);
                      setPaymentAmount("");
                      setPaymentNotes("");
                      setPaymentMethod("CASH");
                    }}
                    disabled={isSavingPayment}
                  >
                    <Text style={styles.itemSub}>Cancel</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.customerPrimaryBtn}
                    onPress={submitPayment}
                    disabled={isSavingPayment}
                  >
                    <Text style={styles.customerPrimaryBtnText}>
                      {isSavingPayment ? "Paying..." : "Pay Now"}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </>
          )}
        </>
      ) : null}
    </>
  );
}
