import { useEffect, useMemo, useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import { Alert, Text, TextInput, TouchableOpacity, View } from "react-native";
import {
  createPaymentApi,
  deletePaymentApi,
  listPaymentsApi,
  type PaymentListItem,
  type PaymentMethod,
} from "../api/payments";
import { listInvoicesApi } from "../api/invoices";
import { ApiError } from "../api/http";
import { useAuth } from "../auth/AuthContext";
import { BoxIcon, Card, Loader } from "../components/common";
import { AppHeader } from "../components/AppHeader";
import { useToast } from "../feedback/ToastContext";
import { useAppTheme } from "../theme/AppThemeContext";
import type { Invoice } from "../types/entities";
import { customerNameFromRef, formatMoney } from "../utils/format";

type MethodFilter = "ALL" | PaymentMethod;

export function PaymentsScreen({
  refreshTick = 0,
  onOpenPayment,
}: {
  refreshTick?: number;
  onOpenPayment: (payment: PaymentListItem) => void;
}) {
  const { styles } = useAppTheme();
  const { showToast } = useToast();
  const { token } = useAuth();

  const [items, setItems] = useState<PaymentListItem[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [activeFilter, setActiveFilter] = useState<MethodFilter>("ALL");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState("");
  const [showInvoiceOptions, setShowInvoiceOptions] = useState(false);
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState<PaymentMethod>("CASH");
  const [notes, setNotes] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [actionPaymentId, setActionPaymentId] = useState<string | null>(null);

  const selectedInvoice = useMemo(
    () => invoices.find((invoice) => invoice._id === selectedInvoiceId),
    [invoices, selectedInvoiceId],
  );

  const resetForm = () => {
    setSelectedInvoiceId("");
    setAmount("");
    setMethod("CASH");
    setNotes("");
    setFormError(null);
    setShowInvoiceOptions(false);
  };

  const load = async () => {
    if (!token) return;
    setIsLoading(true);
    setError(null);

    try {
      const [paymentsResponse, invoicesResponse] = await Promise.all([
        listPaymentsApi(token, {
          page: 1,
          limit: 40,
          method: activeFilter === "ALL" ? undefined : activeFilter,
        }),
        listInvoicesApi(token, { page: 1, limit: 40 }),
      ]);

      setItems(paymentsResponse.items);
      setInvoices(invoicesResponse.items);
    } catch {
      setError("Unable to load payments");
      showToast("Unable to load payments.", "error");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, refreshTick, activeFilter]);

  const submitPayment = async () => {
    if (!token) return;
    setFormError(null);

    if (!selectedInvoiceId) {
      setFormError("Select an invoice.");
      return;
    }

    const parsedAmount = Math.max(parseInt(amount || "0", 10) || 0, 0);
    if (parsedAmount <= 0) {
      setFormError("Amount must be greater than 0.");
      return;
    }

    const maxAllowedAmount = Math.max(
      selectedInvoice?.remaining_amount ?? 0,
      0,
    );

    if (parsedAmount > maxAllowedAmount) {
      setFormError(
        `Amount cannot be greater than remaining amount (${maxAllowedAmount}).`,
      );
      return;
    }

    setIsSaving(true);
    try {
      await createPaymentApi(token, {
        invoiceId: selectedInvoiceId,
        paymentDate: new Date().toISOString().slice(0, 10),
        amount: parsedAmount,
        method,
        notes: notes.trim() || undefined,
      });
      showToast("Payment added successfully.", "success");

      resetForm();
      setIsFormOpen(false);
      await load();
    } catch (e) {
      if (e instanceof ApiError) {
        setFormError(e.message);
        showToast(e.message, "error");
      } else {
        setFormError("Unable to create payment.");
        showToast("Unable to create payment.", "error");
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeletePayment = (payment: PaymentListItem) => {
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
        <TouchableOpacity
          onPress={() => {
            if (isFormOpen) {
              resetForm();
            }
            setIsFormOpen((prev) => !prev);
          }}
        >
          <BoxIcon label="＋" red />
        </TouchableOpacity>
      </AppHeader>

      <View style={styles.paymentFilterWrap}>
        <Text style={styles.paymentFilterLabel}>Filter by method</Text>
        <View style={styles.paymentFilterRow}>
          {(
            [
              { label: "All", value: "ALL" },
              { label: "Cash", value: "CASH" },
              { label: "Bank", value: "BANK" },
              { label: "Other", value: "OTHER" },
            ] as const
          ).map((item) => {
            const isActive = activeFilter === item.value;

            return (
              <TouchableOpacity
                key={item.value}
                style={[
                  styles.paymentFilterButton,
                  isActive && styles.paymentFilterButtonActive,
                ]}
                onPress={() => setActiveFilter(item.value)}
              >
                <Text
                  style={[
                    styles.paymentFilterButtonText,
                    isActive && styles.paymentFilterButtonTextActive,
                  ]}
                >
                  {item.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {isFormOpen ? (
        <Card>
          <View style={styles.formRow}>
            <Text style={styles.itemTitle}>Record Payment</Text>

            <Text style={styles.formLabel}>Invoice *</Text>
            <TouchableOpacity
              style={styles.formInputBox}
              onPress={() => setShowInvoiceOptions((prev) => !prev)}
            >
              <Text style={styles.formValue}>
                {selectedInvoice
                  ? `${selectedInvoice.invoice_no} · ${formatMoney(
                      selectedInvoice.remaining_amount,
                    )} due`
                  : "Select invoice"}
              </Text>
            </TouchableOpacity>

            {showInvoiceOptions ? (
              <View style={styles.inlineSuggestionsCard}>
                {invoices.map((inv, idx) => (
                  <TouchableOpacity
                    key={inv._id}
                    style={[
                      styles.suggestionItem,
                      idx === invoices.length - 1 && styles.noBorder,
                    ]}
                    onPress={() => {
                      setSelectedInvoiceId(inv._id);
                      setShowInvoiceOptions(false);
                    }}
                  >
                    <Text style={styles.suggestionText}>{inv.invoice_no}</Text>
                    <Text style={styles.itemSub}>
                      {formatMoney(inv.remaining_amount)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            ) : null}

            <Text style={styles.formLabel}>Amount (PKR) *</Text>
            <TextInput
              value={amount}
              onChangeText={(value) => setAmount(value.replace(/[^0-9]/g, ""))}
              keyboardType="number-pad"
              placeholder="0"
              placeholderTextColor="#9aa3b2"
              style={styles.formInput}
            />

            <Text style={styles.formLabel}>Method</Text>
            <View style={styles.statusRow}>
              {(["CASH", "BANK", "OTHER"] as PaymentMethod[]).map((item) => (
                <TouchableOpacity
                  key={item}
                  style={[styles.chip, method === item && styles.chipActive]}
                  onPress={() => setMethod(item)}
                >
                  <Text
                    style={[
                      styles.chipText,
                      method === item && styles.chipTextActive,
                    ]}
                  >
                    {item}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.formLabel}>Notes (Optional)</Text>
            <TextInput
              value={notes}
              onChangeText={setNotes}
              placeholder="Add note"
              placeholderTextColor="#9aa3b2"
              style={styles.formInput}
            />

            {formError ? (
              <Text style={styles.loginError}>{formError}</Text>
            ) : null}

            <TouchableOpacity
              style={styles.cta}
              onPress={submitPayment}
              disabled={isSaving}
            >
              <Text style={styles.ctaText}>
                {isSaving ? "Saving..." : "Add Payment"}
              </Text>
            </TouchableOpacity>
          </View>
        </Card>
      ) : null}

      <Card>
        {isLoading ? <Loader /> : null}

        {!isLoading && error ? (
          <View style={styles.listItem}>
            <Text style={styles.badgeUnpaid}>{error}</Text>
          </View>
        ) : null}

        {!isLoading && !error && items.length === 0 ? (
          <View style={styles.listItem}>
            <Text style={styles.itemSub}>No payments found.</Text>
          </View>
        ) : null}

        {!isLoading &&
          !error &&
          items.map((payment, idx) => {
            const invoiceRef =
              typeof payment.invoice_id === "string"
                ? undefined
                : payment.invoice_id;
            const customerRef =
              typeof invoiceRef?.customer_id === "string"
                ? undefined
                : invoiceRef?.customer_id;

            return (
              <TouchableOpacity
                key={payment._id}
                style={[
                  styles.listItem,
                  idx === items.length - 1 && styles.noBorder,
                ]}
                onPress={() => onOpenPayment(payment)}
              >
                <View style={styles.itemMain}>
                  <Text style={styles.itemTitle}>
                    {customerRef?.name || customerRef?.shop_name || "Customer"}
                  </Text>
                  <Text style={styles.itemSub}>
                    {invoiceRef?.invoice_no || "Invoice"} · {payment.method}
                  </Text>
                </View>
                <View style={styles.itemRight}>
                  <Text
                    style={styles.amount}
                  >{`+ ${formatMoney(payment.amount)}`}</Text>
                  <Text style={styles.itemSub}>
                    {new Date(payment.payment_date).toLocaleDateString()}
                  </Text>
                </View>

                <View style={styles.customerRowActions}>
                  <TouchableOpacity
                    style={styles.customerIconBtnDanger}
                    onPress={() => handleDeletePayment(payment)}
                    disabled={actionPaymentId === payment._id}
                  >
                    <Ionicons name="trash-outline" size={16} color="#e8141c" />
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
            );
          })}
      </Card>
    </>
  );
}
