import { useEffect, useMemo, useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import { Text, TextInput, TouchableOpacity, View } from "react-native";
import { createCustomerApi, listCustomersApi } from "../api/customers";
import { createInvoiceApi } from "../api/invoices";
import { listProductsApi } from "../api/products";
import { useAuth } from "../auth/AuthContext";
import { ApiError } from "../api/http";
import { BoxIcon, Card, Loader } from "../components/common";
import { AppHeader } from "../components/AppHeader";
import { useToast } from "../feedback/ToastContext";
import { useAppTheme } from "../theme/AppThemeContext";
import type { Customer, Product } from "../types/entities";
import { formatMoney, formatModel } from "../utils/format";

type LineItem = {
  productId: string;
  quantity: string;
  boxQty?: string;
};

export function NewInvoiceScreen({
  onBack,
  onCreated,
}: {
  onBack: () => void;
  onCreated?: () => void;
}) {
  const { styles } = useAppTheme();
  const { showToast } = useToast();
  const { token } = useAuth();

  const [customerQuery, setCustomerQuery] = useState("");
  const [customerSuggestions, setCustomerSuggestions] = useState<Customer[]>(
    [],
  );
  const [isCustomerInputActive, setIsCustomerInputActive] = useState(false);
  const [selectedCustomerLabel, setSelectedCustomerLabel] = useState("");
  const [isCustomerLoading, setIsCustomerLoading] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [productQuery, setProductQuery] = useState("");
  const [itemNameSuggestions, setItemNameSuggestions] = useState<string[]>([]);
  const [showItemSuggestions, setShowItemSuggestions] = useState(false);
  const [selectedItemName, setSelectedItemName] = useState("");
  const [showModelPicker, setShowModelPicker] = useState(false);
  const [selectedCustomerId, setSelectedCustomerId] = useState("");

  const [notes, setNotes] = useState("");
  const [draftBoxQty, setDraftBoxQty] = useState("");
  const [lineItems, setLineItems] = useState<LineItem[]>([]);
  const [draftProductId, setDraftProductId] = useState("");
  const [draftQuantity, setDraftQuantity] = useState("1");

  const [discountInput, setDiscountInput] = useState("");
  const [discountMode, setDiscountMode] = useState<"PKR" | "%">("PKR");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [screenError, setScreenError] = useState<string | null>(null);

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

    if (!isCustomerInputActive) {
      setCustomerSuggestions([]);
      setIsCustomerLoading(false);
      return;
    }

    const trimmed = customerQuery.trim();
    setIsCustomerLoading(true);
    const timer = setTimeout(async () => {
      try {
        const response = await listCustomersApi(token, {
          q: trimmed || undefined,
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
  }, [customerQuery, token, isCustomerInputActive]);

  useEffect(() => {
    if (!showItemSuggestions) {
      setItemNameSuggestions([]);
      return;
    }

    const query = productQuery.trim().toLowerCase();
    const uniqueNames = [...new Set(products.map((p) => p.name))];
    const filtered = uniqueNames.filter((n) => n.toLowerCase().includes(query));
    setItemNameSuggestions(filtered.slice(0, 20));
  }, [products, productQuery, showItemSuggestions]);

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

  const draftProduct = useMemo(
    () => products.find((p) => p._id === draftProductId),
    [products, draftProductId],
  );

  const modelsForSelectedItem = useMemo(
    () => products.filter((p) => p.name === selectedItemName),
    [products, selectedItemName],
  );

  const draftQty = Math.max(parseInt(draftQuantity || "0", 10) || 0, 0);
  const draftUnitPrice = draftProduct?.price ?? 0;
  const draftLineTotal = draftQty * draftUnitPrice;

  const subtotal = itemRows.reduce((sum, row) => sum + row.lineTotal, 0);
  const discountAmount =
    discountMode === "%"
      ? Math.round((subtotal * (parseFloat(discountInput) || 0)) / 100)
      : parseInt(discountInput || "0", 10) || 0;
  const grandTotal = Math.max(subtotal - discountAmount, 0);

  const addLineItem = () => {
    const qty = Math.max(parseInt(draftQuantity || "0", 10) || 0, 0);

    if (!draftProductId) {
      setScreenError("Please select a product before adding item.");
      return;
    }

    if (qty <= 0) {
      setScreenError("Quantity must be at least 1.");
      return;
    }

    setLineItems((prev) => [
      ...prev,
      {
        productId: draftProductId,
        quantity: String(qty),
        boxQty: draftBoxQty.trim() || undefined,
      },
    ]);
    setDraftProductId("");
    setProductQuery("");
    setDraftQuantity("1");
    setDraftBoxQty("");
    setSelectedItemName("");
    setShowItemSuggestions(false);
    setShowModelPicker(false);
    setScreenError(null);
  };

  const removeLineItem = (index: number) => {
    setLineItems((prev) => prev.filter((_, i) => i !== index));
  };

  const adjustDraftQuantity = (delta: number) => {
    const current = Math.max(parseInt(draftQuantity || "0", 10) || 0, 0);
    const next = Math.max(current + delta, 1);
    setDraftQuantity(String(next));
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

    if (lineItems.length === 0) {
      setScreenError("Please add at least one line item.");
      return;
    }

    const hasInvalidItem = itemRows.some((row) => !row.product || row.qty <= 0);
    if (hasInvalidItem) {
      setScreenError(
        "Please select product and valid quantity for each line item.",
      );
      return;
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
        setSelectedCustomerLabel(createdCustomer.name);
        setCustomerSuggestions((prev) => [createdCustomer, ...prev]);
        setCustomerQuery(createdCustomer.name);
        setIsCustomerInputActive(false);
      }

      await createInvoiceApi(token, {
        customerId: customerIdToUse,
        invoiceDate: today,
        notes: notes.trim() || undefined,
        discount: discountAmount,
        items: itemRows.map((row) => ({
          productId: row.product!._id,
          quantity: row.qty,
          unitPriceSnapshot: row.unitPrice,
          boxQty: row.boxQty ? parseInt(row.boxQty, 10) : undefined,
        })),
      });

      showToast("Invoice created successfully.", "success");
      onCreated?.();
    } catch (error) {
      if (error instanceof ApiError) {
        setScreenError(error.message);
        showToast(error.message, "error");
      } else {
        setScreenError("Unable to create invoice.");
        showToast("Unable to create invoice.", "error");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <AppHeader>
        <TouchableOpacity onPress={onBack}>
          <BoxIcon label="←" />
        </TouchableOpacity>
      </AppHeader>

      <View style={styles.formSection}>
        <Text style={styles.formLabel}>Customer</Text>
        <TextInput
          value={customerQuery}
          onChangeText={(value) => {
            setCustomerQuery(value);
            setSelectedCustomerId("");
            setSelectedCustomerLabel("");
            setIsCustomerInputActive(true);
          }}
          onFocus={() => setIsCustomerInputActive(true)}
          style={styles.formInput}
          placeholder="Type customer name"
          placeholderTextColor="#9aa3b2"
        />

        {isCustomerLoading ? <Loader compact /> : null}

        {customerSuggestions.length > 0 && isCustomerInputActive ? (
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
                  setSelectedCustomerLabel(customer.name);
                  setCustomerQuery(customer.name);
                  setCustomerSuggestions([]);
                  setIsCustomerLoading(false);
                  setIsCustomerInputActive(false);
                }}
              >
                <Text style={styles.suggestionText}>{customer.name}</Text>
              </TouchableOpacity>
            ))}
          </View>
        ) : null}

        {!selectedCustomerId && customerQuery.trim() ? (
          <Text style={styles.itemSub}>
            No selection made. A new customer will be created on submit.
          </Text>
        ) : null}

        {selectedCustomerId && selectedCustomerLabel ? (
          <Text style={styles.badgePaid}>
            Selected: {selectedCustomerLabel}
          </Text>
        ) : null}
      </View>

      <Text style={styles.sec}>LINE ITEMS</Text>
      <Card>
        <View style={styles.formRow}>
          <TextInput
            value={productQuery}
            onFocus={() => setShowItemSuggestions(true)}
            onChangeText={(value) => {
              setProductQuery(value);
              setDraftProductId("");
              setSelectedItemName("");
              setShowModelPicker(false);
              setShowItemSuggestions(true);
            }}
            style={styles.formInput}
            placeholder="Search item"
            placeholderTextColor="#9aa3b2"
          />

          {showItemSuggestions ? (
            <View style={styles.inlineSuggestionsCard}>
              {itemNameSuggestions.length === 0 ? (
                <View style={[styles.suggestionItem, styles.noBorder]}>
                  <Text style={styles.itemSub}>No items found.</Text>
                </View>
              ) : null}

              {itemNameSuggestions.map((itemName, idx) => (
                <TouchableOpacity
                  key={itemName}
                  style={[
                    styles.suggestionItem,
                    idx === itemNameSuggestions.length - 1 && styles.noBorder,
                  ]}
                  onPress={() => {
                    setSelectedItemName(itemName);
                    setProductQuery(itemName);
                    setShowItemSuggestions(false);
                    setShowModelPicker(true);
                    setDraftProductId("");
                  }}
                >
                  <Text style={styles.suggestionText}>{itemName}</Text>
                </TouchableOpacity>
              ))}
            </View>
          ) : null}

          {showModelPicker ? (
            <>
              <Text style={styles.formLabel}>Select Model</Text>
              <View style={styles.inlineSuggestionsCard}>
                {modelsForSelectedItem.length === 0 ? (
                  <View style={[styles.suggestionItem, styles.noBorder]}>
                    <Text style={styles.itemSub}>No models available.</Text>
                  </View>
                ) : null}

                {modelsForSelectedItem.map((product, idx) => (
                  <TouchableOpacity
                    key={product._id}
                    style={[
                      styles.suggestionItem,
                      idx === modelsForSelectedItem.length - 1 &&
                        styles.noBorder,
                    ]}
                    onPress={() => {
                      setDraftProductId(product._id);
                      setShowModelPicker(false);
                    }}
                  >
                    <Text style={styles.suggestionText}>
                      {formatModel(product.model)}
                    </Text>
                    <Text style={styles.amount}>
                      {formatMoney(product.price)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </>
          ) : null}

          <View style={styles.formRow3}>
            <View style={{ flex: 1 }}>
              <Text style={styles.formLabel}>QTY</Text>
              <View style={styles.qtyControlRow}>
                <TouchableOpacity
                  style={styles.qtyBtn}
                  onPress={() => adjustDraftQuantity(-1)}
                >
                  <Text style={styles.qtyBtnText}>−</Text>
                </TouchableOpacity>

                <TextInput
                  keyboardType="number-pad"
                  value={draftQuantity}
                  onChangeText={(value) =>
                    setDraftQuantity(value.replace(/[^0-9]/g, ""))
                  }
                  style={styles.qtyInput}
                />

                <TouchableOpacity
                  style={styles.qtyBtn}
                  onPress={() => adjustDraftQuantity(1)}
                >
                  <Text style={styles.qtyBtnText}>+</Text>
                </TouchableOpacity>
              </View>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.formLabel}>BOX QTY</Text>
              <TextInput
                keyboardType="number-pad"
                value={draftBoxQty}
                onChangeText={(v) => setDraftBoxQty(v.replace(/[^0-9]/g, ""))}
                style={[styles.qtyInput, { flex: 1 }]}
                placeholder="0"
                placeholderTextColor="#9aa3b2"
              />
            </View>
          </View>

          <View style={styles.formRow2}>
            <View style={{ flex: 1 }}>
              <Text style={styles.formLabel}>PRICE</Text>
              <View style={styles.formInputBox}>
                <Text style={styles.formValue}>
                  {formatMoney(draftUnitPrice)}
                </Text>
              </View>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.formLabel}>TOTAL</Text>
              <View style={styles.formInputBox}>
                <Text style={styles.formValue}>
                  {formatMoney(draftLineTotal)}
                </Text>
              </View>
            </View>
          </View>

          <TouchableOpacity
            style={[styles.addItemBtn, { marginHorizontal: 0, marginTop: 14 }]}
            onPress={addLineItem}
          >
            <Text style={styles.seeAll}>+ Add Item</Text>
          </TouchableOpacity>
        </View>
      </Card>

      <View style={{ height: 10 }} />

      <Card>
        {itemRows.length === 0 ? (
          <View style={styles.listItem}>
            <Text style={styles.itemSub}>No line items added yet.</Text>
          </View>
        ) : (
          itemRows.map((row, index) => (
            <View
              key={`${index}-${row.productId}`}
              style={[
                styles.listItem,
                index === itemRows.length - 1 && styles.noBorder,
              ]}
            >
              <View style={styles.itemMain}>
                <Text style={styles.itemTitle}>
                  {row.product
                    ? `${row.product.name} — ${formatModel(row.product.model)}`
                    : "Unknown Product"}
                </Text>
                <Text style={styles.itemSub}>
                  {row.qty} × {formatMoney(row.unitPrice)}
                  {row.boxQty ? ` · ${row.boxQty} boxes` : ""}
                </Text>
              </View>

              <Text style={[styles.amount, { marginRight: 8 }]}>
                {formatMoney(row.lineTotal)}
              </Text>

              <TouchableOpacity
                style={styles.customerIconBtnDanger}
                onPress={() => removeLineItem(index)}
              >
                <Ionicons name="trash-outline" size={14} color="#e8141c" />
              </TouchableOpacity>
            </View>
          ))
        )}
      </Card>

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

        {/* Discount row */}
        <View style={styles.formRow}>
          <View style={styles.itemMain}>
            <Text style={styles.itemSub}>Discount</Text>
          </View>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <TouchableOpacity
              style={[styles.chip, discountMode === "PKR" && styles.chipActive]}
              onPress={() => {
                setDiscountMode("PKR");
                setDiscountInput("");
              }}
            >
              <Text
                style={[
                  styles.chipText,
                  discountMode === "PKR" && styles.chipTextActive,
                ]}
              >
                PKR
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.chip, discountMode === "%" && styles.chipActive]}
              onPress={() => {
                setDiscountMode("%");
                setDiscountInput("");
              }}
            >
              <Text
                style={[
                  styles.chipText,
                  discountMode === "%" && styles.chipTextActive,
                ]}
              >
                %
              </Text>
            </TouchableOpacity>
            <TextInput
              style={[styles.formInput, { width: 80, marginBottom: 0 }]}
              value={discountInput}
              onChangeText={(v) => setDiscountInput(v.replace(/[^0-9.]/g, ""))}
              keyboardType="numeric"
              placeholder={discountMode === "%" ? "0" : "0"}
              placeholderTextColor="#9aa3b2"
            />
          </View>
        </View>

        {discountAmount > 0 ? (
          <View style={styles.formRow}>
            <View style={styles.itemMain}>
              <Text style={styles.itemSub}>Discount Amount</Text>
            </View>
            <Text style={styles.amountDanger}>
              − {formatMoney(discountAmount)}
            </Text>
          </View>
        ) : null}

        <View style={[styles.formRow, styles.noBorder]}>
          <View style={styles.itemMain}>
            <Text style={styles.itemTitle}>Total</Text>
          </View>
          <Text style={styles.amount}>{formatMoney(grandTotal)}</Text>
        </View>
      </Card>

      {screenError ? (
        <Text style={[styles.loginError, { marginHorizontal: 20 }]}>
          {screenError}
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
