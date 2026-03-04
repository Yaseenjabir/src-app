import { useEffect, useMemo, useRef, useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import {
  Animated,
  Easing,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { createCustomerApi, listCustomersApi } from "../api/customers";
import { addInvoicePaymentApi, createInvoiceApi } from "../api/invoices";
import { listProductsApi } from "../api/products";
import { useAuth } from "../auth/AuthContext";
import { ApiError } from "../api/http";
import { Card } from "../components/common";
import { useAppTheme } from "../theme/AppThemeContext";
import type { Customer, Product } from "../types/entities";
import { formatMoney } from "../utils/format";

type LineItem = {
  productId: string;
  quantity: string;
};

export function NewInvoiceScreen({
  onBack,
  onCreated,
}: {
  onBack: () => void;
  onCreated?: () => void;
}) {
  const { styles } = useAppTheme();
  const { token } = useAuth();

  const [customerQuery, setCustomerQuery] = useState("");
  const [customerSuggestions, setCustomerSuggestions] = useState<Customer[]>(
    [],
  );
  const [isCustomerLoading, setIsCustomerLoading] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState("");
  const [activeProductPickerIndex, setActiveProductPickerIndex] = useState<
    number | null
  >(null);
  const productPickerAnim = useRef(new Animated.Value(0)).current;

  const [invoiceNo] = useState(`#INV-${String(Date.now()).slice(-4)}`);
  const [status, setStatus] = useState<"unpaid" | "partial" | "completed">(
    "unpaid",
  );
  const [amountReceived, setAmountReceived] = useState("");
  const [notes, setNotes] = useState("");
  const [lineItems, setLineItems] = useState<LineItem[]>([
    { productId: "", quantity: "1" },
  ]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [screenError, setScreenError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    const loadProducts = async () => {
      if (!token) return;
      try {
        const productsResponse = await listProductsApi(token);
        setProducts(productsResponse.items.filter((p) => p.is_active));
      } catch {
        setScreenError("Unable to load products for invoice form.");
      }
    };

    void loadProducts();
  }, [token]);

  useEffect(() => {
    if (!token) return;

    const trimmed = customerQuery.trim();
    if (!trimmed) {
      setCustomerSuggestions([]);
      setIsCustomerLoading(false);
      return;
    }

    setIsCustomerLoading(true);
    const timer = setTimeout(async () => {
      try {
        const response = await listCustomersApi(token, {
          q: trimmed,
          isActive: true,
          page: 1,
          limit: 8,
        });
        setCustomerSuggestions(response.items);
      } catch {
        setCustomerSuggestions([]);
      } finally {
        setIsCustomerLoading(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [customerQuery, token]);

  const selectedCustomer = useMemo(
    () =>
      customerSuggestions.find(
        (customer) => customer._id === selectedCustomerId,
      ),
    [customerSuggestions, selectedCustomerId],
  );

  const itemRows = useMemo(() => {
    return lineItems.map((row) => {
      const product = products.find((p) => p._id === row.productId);
      const qty = Math.max(parseInt(row.quantity || "0", 10) || 0, 0);
      const unitPrice = product?.price ?? 0;
      return {
        ...row,
        product,
        qty,
        unitPrice,
        lineTotal: qty * unitPrice,
      };
    });
  }, [lineItems, products]);

  const subtotal = itemRows.reduce((sum, row) => sum + row.lineTotal, 0);
  const grandTotal = subtotal;

  const updateLineItem = (index: number, patch: Partial<LineItem>) => {
    setLineItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, ...patch } : item)),
    );
  };

  const addLineItem = () => {
    setLineItems((prev) => [...prev, { productId: "", quantity: "1" }]);
  };

  const removeLineItem = (index: number) => {
    setLineItems((prev) => prev.filter((_, i) => i !== index));
  };

  const adjustLineItemQuantity = (index: number, delta: number) => {
    setLineItems((prev) =>
      prev.map((item, i) => {
        if (i !== index) return item;
        const current = Math.max(parseInt(item.quantity || "0", 10) || 0, 0);
        const next = Math.max(current + delta, 1);
        return { ...item, quantity: String(next) };
      }),
    );
  };

  const closeProductPicker = () => {
    Animated.timing(productPickerAnim, {
      toValue: 0,
      duration: 140,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start(() => {
      setActiveProductPickerIndex(null);
    });
  };

  const toggleProductPicker = (index: number) => {
    const isSame = activeProductPickerIndex === index;

    if (isSame) {
      closeProductPicker();
      return;
    }

    setActiveProductPickerIndex(index);
    productPickerAnim.setValue(0);
    Animated.timing(productPickerAnim, {
      toValue: 1,
      duration: 180,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  };

  const submit = async () => {
    if (!token) return;
    setScreenError(null);
    setSuccessMessage(null);

    if (!selectedCustomerId && !customerQuery.trim()) {
      setScreenError(
        "Type and select a customer, or type a new customer name.",
      );
      return;
    }

    const hasInvalidItem = itemRows.some((row) => !row.product || row.qty <= 0);
    if (hasInvalidItem) {
      setScreenError(
        "Please select product and valid quantity for each line item.",
      );
      return;
    }

    const parsedAmount = Math.max(parseInt(amountReceived || "0", 10) || 0, 0);

    let paymentAmount = 0;
    if (status === "partial") {
      if (parsedAmount <= 0) {
        setScreenError(
          "For Partial status, amount received must be greater than 0.",
        );
        return;
      }
      if (parsedAmount >= grandTotal) {
        setScreenError(
          "For Partial status, amount received must be less than grand total.",
        );
        return;
      }
      paymentAmount = parsedAmount;
    } else if (status === "completed") {
      paymentAmount = parsedAmount > 0 ? parsedAmount : grandTotal;
    }

    setIsSubmitting(true);
    try {
      const today = new Date().toISOString().slice(0, 10);
      let customerIdToUse = selectedCustomerId;

      if (!customerIdToUse) {
        const customerName = customerQuery.trim();
        if (!customerName) {
          setScreenError(
            "Type and select a customer, or type a new customer name.",
          );
          return;
        }

        const createdCustomer = await createCustomerApi(token, {
          name: customerName,
        });

        customerIdToUse = createdCustomer._id;
        setSelectedCustomerId(createdCustomer._id);
        setCustomerSuggestions((prev) => [createdCustomer, ...prev]);
        setCustomerQuery(createdCustomer.shop_name || createdCustomer.name);
      }

      const createdInvoice = await createInvoiceApi(token, {
        invoiceNo,
        customerId: customerIdToUse,
        invoiceDate: today,
        notes: notes.trim() || undefined,
        discount: 0,
        items: itemRows.map((row) => ({
          productId: row.product!._id,
          quantity: row.qty,
          unitPriceSnapshot: row.unitPrice,
        })),
      });

      if (paymentAmount > 0) {
        await addInvoicePaymentApi(token, createdInvoice._id, {
          paymentDate: today,
          amount: paymentAmount,
          method: "OTHER",
          notes: "Auto payment from invoice form",
        });
      }

      setSuccessMessage("Invoice created successfully.");
      onCreated?.();
    } catch (error) {
      if (error instanceof ApiError) {
        setScreenError(error.message);
      } else {
        setScreenError("Unable to create invoice.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <View style={styles.appBar}>
        <TouchableOpacity onPress={onBack}>
          <Text style={styles.back}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>New Invoice</Text>
        <View style={{ width: 36 }} />
      </View>

      <View style={styles.formSection}>
        <Text style={styles.formLabel}>Invoice Number</Text>
        <View style={styles.formInputBox}>
          <Text style={styles.formValue}>{invoiceNo}</Text>
        </View>
      </View>

      <View style={styles.formSection}>
        <Text style={styles.formLabel}>Customer</Text>
        <TextInput
          value={customerQuery}
          onChangeText={(value) => {
            setCustomerQuery(value);
            setSelectedCustomerId("");
          }}
          style={styles.formInput}
          placeholder="Type customer name"
          placeholderTextColor="#9aa3b2"
        />

        {isCustomerLoading ? (
          <Text style={styles.itemSub}>Searching customers...</Text>
        ) : null}

        {customerSuggestions.length > 0 ? (
          <View style={styles.inlineSuggestionsCard}>
            {customerSuggestions.map((customer, index) => (
              <TouchableOpacity
                key={customer._id}
                style={[
                  styles.suggestionItem,
                  index === customerSuggestions.length - 1 && styles.noBorder,
                ]}
                onPress={() => {
                  setSelectedCustomerId(customer._id);
                  setCustomerQuery(customer.shop_name || customer.name);
                  setCustomerSuggestions([]);
                }}
              >
                <Text style={styles.suggestionText}>
                  {customer.shop_name || customer.name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        ) : null}

        {!selectedCustomerId && customerQuery.trim() ? (
          <Text style={styles.itemSub}>
            No selection made. A new customer will be created on submit.
          </Text>
        ) : null}

        {selectedCustomer ? (
          <Text style={styles.badgePaid}>
            Selected: {selectedCustomer.shop_name || selectedCustomer.name}
          </Text>
        ) : null}
      </View>

      <Text style={styles.sec}>LINE ITEMS</Text>
      <Card>
        {itemRows.map((row, index) => (
          <View
            key={`${index}-${row.productId}`}
            style={[
              styles.formRow,
              index === itemRows.length - 1 && styles.noBorder,
            ]}
          >
            <TouchableOpacity
              style={styles.formInputBox}
              onPress={() => toggleProductPicker(index)}
            >
              <Text style={styles.formValue}>
                {row.product
                  ? `${row.product.name} (${row.product.sku})`
                  : "— Select Product —"}
              </Text>
            </TouchableOpacity>

            {activeProductPickerIndex === index ? (
              <Animated.View
                style={[
                  styles.inlineSuggestionsCard,
                  {
                    opacity: productPickerAnim,
                    transform: [
                      {
                        translateY: productPickerAnim.interpolate({
                          inputRange: [0, 1],
                          outputRange: [-6, 0],
                        }),
                      },
                    ],
                  },
                ]}
              >
                {products.map((product, pIndex) => (
                  <TouchableOpacity
                    key={product._id}
                    style={[
                      styles.suggestionItem,
                      pIndex === products.length - 1 && styles.noBorder,
                    ]}
                    onPress={() => {
                      updateLineItem(index, {
                        productId: product._id,
                      });
                      closeProductPicker();
                    }}
                  >
                    <Text style={styles.suggestionText}>{product.name}</Text>
                    <Text style={styles.amount}>
                      {formatMoney(product.price)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </Animated.View>
            ) : null}

            <View style={styles.formRow3}>
              <View style={{ flex: 1 }}>
                <Text style={styles.formLabel}>QTY</Text>
                <View style={styles.qtyControlRow}>
                  <TouchableOpacity
                    style={styles.qtyBtn}
                    onPress={() => adjustLineItemQuantity(index, -1)}
                  >
                    <Text style={styles.qtyBtnText}>−</Text>
                  </TouchableOpacity>

                  <TextInput
                    keyboardType="number-pad"
                    value={row.quantity}
                    onChangeText={(value) =>
                      updateLineItem(index, {
                        quantity: value.replace(/[^0-9]/g, ""),
                      })
                    }
                    style={styles.qtyInput}
                  />

                  <TouchableOpacity
                    style={styles.qtyBtn}
                    onPress={() => adjustLineItemQuantity(index, 1)}
                  >
                    <Text style={styles.qtyBtnText}>+</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>

            <View style={styles.formRow2}>
              <View style={{ flex: 1 }}>
                <Text style={styles.formLabel}>PRICE</Text>
                <View style={styles.formInputBox}>
                  <Text style={styles.formValue}>
                    {formatMoney(row.unitPrice)}
                  </Text>
                </View>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.formLabel}>TOTAL</Text>
                <View style={styles.formInputBox}>
                  <Text style={styles.formValue}>
                    {formatMoney(row.lineTotal)}
                  </Text>
                </View>
              </View>
            </View>

            {itemRows.length > 1 ? (
              <TouchableOpacity
                style={styles.removeItemBtn}
                onPress={() => removeLineItem(index)}
              >
                <Ionicons name="trash-outline" size={14} color="#e8141c" />
                <Text style={styles.removeItemBtnText}>Remove Item</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        ))}
      </Card>

      <TouchableOpacity style={styles.addItemBtn} onPress={addLineItem}>
        <Text style={styles.seeAll}>+ Add Item</Text>
      </TouchableOpacity>

      <Text style={styles.sec}>PAYMENT</Text>
      <View style={styles.formSection}>
        <Text style={styles.formLabel}>Status</Text>
        <View style={styles.statusRow}>
          <TouchableOpacity
            style={[styles.chip, status === "unpaid" && styles.chipActive]}
            onPress={() => setStatus("unpaid")}
          >
            <Text
              style={[
                styles.chipText,
                status === "unpaid" && styles.chipTextActive,
              ]}
            >
              Unpaid
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.chip, status === "partial" && styles.chipActive]}
            onPress={() => setStatus("partial")}
          >
            <Text
              style={[
                styles.chipText,
                status === "partial" && styles.chipTextActive,
              ]}
            >
              Partial
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.chip, status === "completed" && styles.chipActive]}
            onPress={() => setStatus("completed")}
          >
            <Text
              style={[
                styles.chipText,
                status === "completed" && styles.chipTextActive,
              ]}
            >
              Paid
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.formSection}>
        <Text style={styles.formLabel}>Amount Received (PKR)</Text>
        <TextInput
          keyboardType="number-pad"
          value={amountReceived}
          onChangeText={(value) =>
            setAmountReceived(value.replace(/[^0-9]/g, ""))
          }
          style={styles.formInput}
          placeholder="0"
          placeholderTextColor="#9aa3b2"
        />
      </View>

      <View style={styles.formSection}>
        <Text style={styles.formLabel}>Notes (Optional)</Text>
        <TextInput
          value={notes}
          onChangeText={setNotes}
          style={styles.formInput}
          placeholder="Add a note..."
          placeholderTextColor="#9aa3b2"
        />
      </View>

      <Card>
        <View style={styles.formRow}>
          <View style={styles.itemMain}>
            <Text style={styles.itemSub}>
              Subtotal ({itemRows.length} items)
            </Text>
          </View>
          <Text style={styles.amount}>{formatMoney(subtotal)}</Text>
        </View>
        <View style={[styles.formRow, styles.noBorder]}>
          <View style={styles.itemMain}>
            <Text style={styles.itemTitle}>Grand Total</Text>
          </View>
          <Text style={styles.amount}>{formatMoney(grandTotal)}</Text>
        </View>
      </Card>

      {screenError ? (
        <Text style={[styles.loginError, { marginHorizontal: 20 }]}>
          {screenError}
        </Text>
      ) : null}
      {successMessage ? (
        <Text
          style={[styles.badgePaid, { marginHorizontal: 20, marginTop: 10 }]}
        >
          {successMessage}
        </Text>
      ) : null}

      <TouchableOpacity
        style={styles.cta}
        onPress={submit}
        disabled={isSubmitting}
      >
        <Text style={styles.ctaText}>
          {isSubmitting ? "Generating..." : "Generate Invoice"}
        </Text>
      </TouchableOpacity>
    </>
  );
}
