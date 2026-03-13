import { useEffect, useMemo, useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import { Alert, Text, TextInput, TouchableOpacity, View } from "react-native";
import {
  appendInvoiceItemsApi,
  deleteInvoiceApi,
  getInvoiceByIdApi,
  updateInvoiceApi,
  type InvoiceDetail,
} from "../api/invoices";
import { listProductsApi } from "../api/products";
import { ApiError } from "../api/http";
import { useAuth } from "../auth/AuthContext";
import { BoxIcon, Card, Loader } from "../components/common";
import { AppHeader } from "../components/AppHeader";
import { useToast } from "../feedback/ToastContext";
import { useAppTheme } from "../theme/AppThemeContext";
import type { Product } from "../types/entities";
import { customerNameFromRef, formatMoney, formatModel, statusLabel } from "../utils/format";
import { exportInvoicePdf } from "../utils/generateInvoicePdf";

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

  // Products for add-items picker
  const [products, setProducts] = useState<Product[]>([]);
  const [isAddItemsOpen, setIsAddItemsOpen] = useState(false);
  const [addItemQuery, setAddItemQuery] = useState("");
  const [showAddItemSuggestions, setShowAddItemSuggestions] = useState(false);
  const [addSelectedItemName, setAddSelectedItemName] = useState("");
  const [showAddModelPicker, setShowAddModelPicker] = useState(false);
  const [addDraftProductId, setAddDraftProductId] = useState("");
  const [addDraftQuantity, setAddDraftQuantity] = useState("1");
  const [addDraftBoxQty, setAddDraftBoxQty] = useState("");
  const [addLineItems, setAddLineItems] = useState<
    Array<{ productId: string; quantity: string; boxQty?: string }>
  >([]);
  const [isAppending, setIsAppending] = useState(false);

  const [isExporting, setIsExporting] = useState(false);

  // Discount editing
  const [isEditingDiscount, setIsEditingDiscount] = useState(false);
  const [discountInput, setDiscountInput] = useState("");
  const [discountMode, setDiscountMode] = useState<"PKR" | "%">("PKR");
  const [isSavingDiscount, setIsSavingDiscount] = useState(false);

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

  useEffect(() => {
    if (!token) return;
    void listProductsApi(token).then((res) =>
      setProducts(res.items.filter((p) => p.is_active)),
    );
  }, [token]);

  const addItemNameSuggestions = useMemo(() => {
    if (!showAddItemSuggestions) return [];
    const q = addItemQuery.trim().toLowerCase();
    const names = [...new Set(products.map((p) => p.name))];
    return names.filter((n) => n.toLowerCase().includes(q)).slice(0, 20);
  }, [products, addItemQuery, showAddItemSuggestions]);

  const modelsForAddItem = useMemo(
    () => products.filter((p) => p.name === addSelectedItemName),
    [products, addSelectedItemName],
  );

  const addDraftProduct = products.find((p) => p._id === addDraftProductId);
  const addDraftQty = Math.max(parseInt(addDraftQuantity || "0", 10) || 0, 0);
  const addDraftTotal = (addDraftProduct?.price ?? 0) * addDraftQty;

  const addItemRows = useMemo(
    () =>
      addLineItems.map((row) => {
        const product = products.find((p) => p._id === row.productId);
        const qty = Math.max(parseInt(row.quantity || "0", 10) || 0, 0);
        return { ...row, product, qty, boxQty: row.boxQty, lineTotal: (product?.price ?? 0) * qty };
      }),
    [addLineItems, products],
  );

  const addSubtotal = addItemRows.reduce((s, r) => s + r.lineTotal, 0);

  function pushAddLineItem() {
    if (!addDraftProductId || addDraftQty <= 0) return;
    setAddLineItems((prev) => [
      ...prev,
      { productId: addDraftProductId, quantity: String(addDraftQty), boxQty: addDraftBoxQty.trim() || undefined },
    ]);
    setAddDraftProductId("");
    setAddItemQuery("");
    setAddDraftQuantity("1");
    setAddDraftBoxQty("");
    setAddSelectedItemName("");
    setShowAddItemSuggestions(false);
    setShowAddModelPicker(false);
  }

  async function handleAppendItems() {
    if (!token || !invoiceId || addItemRows.length === 0) return;
    setIsAppending(true);
    try {
      await appendInvoiceItemsApi(
        token,
        invoiceId,
        addItemRows.map((r) => ({
          productId: r.product!._id,
          quantity: r.qty,
          unitPriceSnapshot: r.product!.price,
          boxQty: r.boxQty ? parseInt(r.boxQty, 10) : undefined,
        })),
      );
      setIsAddItemsOpen(false);
      setAddLineItems([]);
      await load();
      showToast("Items added to invoice.", "success");
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : "Failed to add items.";
      showToast(msg, "error");
    } finally {
      setIsAppending(false);
    }
  }

  async function handleExportPdf() {
    if (!invoice) return;
    setIsExporting(true);
    try {
      await exportInvoicePdf(invoice);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      showToast(msg, "error");
    } finally {
      setIsExporting(false);
    }
  }

  const subtotalForDiscount = invoice?.subtotal ?? invoice?.total_amount ?? 0;
  const editDiscountAmount =
    discountMode === "%"
      ? Math.round(subtotalForDiscount * (parseFloat(discountInput) || 0) / 100)
      : parseInt(discountInput || "0", 10) || 0;

  async function handleSaveDiscount() {
    if (!token || !invoiceId) return;
    if (editDiscountAmount < 0 || editDiscountAmount > subtotalForDiscount) {
      showToast("Discount cannot exceed subtotal.", "error");
      return;
    }
    setIsSavingDiscount(true);
    try {
      const updated = await updateInvoiceApi(token, invoiceId, { discount: editDiscountAmount });
      setInvoice(updated);
      setIsEditingDiscount(false);
      showToast("Discount updated.", "success");
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : "Failed to update discount.";
      showToast(msg, "error");
    } finally {
      setIsSavingDiscount(false);
    }
  }

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
            {/* Top row: invoice no + status + delete */}
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
              <View>
                <Text style={[styles.itemSub, { letterSpacing: 0.6 }]}>INVOICE</Text>
                <Text style={[styles.amount, { fontSize: 22, fontWeight: "800", marginTop: 2 }]}>
                  #{invoice.invoice_no}
                </Text>
              </View>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <Text style={badgeStyle(statusLabel(invoice.status))}>
                  {statusLabel(invoice.status)}
                </Text>
                <TouchableOpacity
                  style={styles.customerIconBtnDanger}
                  onPress={handleDeleteInvoice}
                >
                  <Ionicons name="trash-outline" size={16} color="#e8141c" />
                </TouchableOpacity>
              </View>
            </View>

            {/* Customer + date */}
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 14 }}>
              <Text style={styles.itemTitle}>{customerNameFromRef(invoice.customer_id)}</Text>
              <Text style={styles.itemSub}>{invoiceDateText}</Text>
            </View>

            {/* Divider */}
            <View style={{ height: 1, backgroundColor: "rgba(128,128,128,0.18)", marginVertical: 14 }} />

            {/* Financial breakdown */}
            {(invoice.discount ?? 0) > 0 || isEditingDiscount ? (
              <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 6 }}>
                <Text style={styles.itemSub}>Subtotal</Text>
                <Text style={styles.itemSub}>{formatMoney(invoice.subtotal ?? invoice.total_amount)}</Text>
              </View>
            ) : null}

            {/* Discount row / editor */}
            {isEditingDiscount ? (
              <>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 }}>
                  {/* PKR / % chips */}
                  <TouchableOpacity
                    style={[styles.chip, discountMode === "PKR" && styles.chipActive]}
                    onPress={() => setDiscountMode("PKR")}
                  >
                    <Text style={[styles.chipText, discountMode === "PKR" && styles.chipTextActive]}>PKR</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.chip, discountMode === "%" && styles.chipActive]}
                    onPress={() => setDiscountMode("%")}
                  >
                    <Text style={[styles.chipText, discountMode === "%" && styles.chipTextActive]}>%</Text>
                  </TouchableOpacity>
                  <TextInput
                    style={[styles.formInput, { flex: 1, paddingVertical: 8, fontSize: 14 }]}
                    keyboardType="numeric"
                    value={discountInput}
                    onChangeText={(v) => {
                      const cleaned = v.replace(/[^0-9.]/g, "");
                      if (discountMode === "%") {
                        const num = parseFloat(cleaned) || 0;
                        setDiscountInput(num > 100 ? "100" : cleaned);
                      } else {
                        const num = parseInt(cleaned || "0", 10) || 0;
                        setDiscountInput(num > subtotalForDiscount ? String(subtotalForDiscount) : cleaned);
                      }
                    }}
                    placeholder={discountMode === "%" ? "0 – 100" : "e.g. 500"}
                    placeholderTextColor="#9aa3b2"
                  />
                  {editDiscountAmount > 0 ? (
                    <Text style={[styles.itemSub, { color: "#e8141c" }]}>
                      − {formatMoney(editDiscountAmount)}
                    </Text>
                  ) : null}
                </View>
                <View style={{ flexDirection: "row", justifyContent: "flex-end", gap: 8, marginBottom: 10 }}>
                  <TouchableOpacity
                    style={styles.customerSecondaryBtn}
                    onPress={() => { setIsEditingDiscount(false); setDiscountInput(""); }}
                    disabled={isSavingDiscount}
                  >
                    <Text style={styles.itemSub}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.customerPrimaryBtn}
                    onPress={() => void handleSaveDiscount()}
                    disabled={isSavingDiscount}
                  >
                    <Text style={styles.customerPrimaryBtnText}>
                      {isSavingDiscount ? "Saving..." : "Save"}
                    </Text>
                  </TouchableOpacity>
                </View>
              </>
            ) : (invoice.discount ?? 0) > 0 ? (
              <TouchableOpacity
                style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}
                onPress={() => {
                  setDiscountInput(String(invoice.discount ?? 0));
                  setDiscountMode("PKR");
                  setIsEditingDiscount(true);
                }}
              >
                <Text style={[styles.itemSub, { color: "#e8141c" }]}>Discount</Text>
                <Text style={[styles.itemSub, { color: "#e8141c" }]}>− {formatMoney(invoice.discount ?? 0)}</Text>
              </TouchableOpacity>
            ) : null}

            {(invoice.discount ?? 0) > 0 && !isEditingDiscount ? (
              <View style={{ height: 1, backgroundColor: "rgba(128,128,128,0.18)", marginBottom: 10 }} />
            ) : null}

            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
              <Text style={styles.amount}>Total</Text>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                <Text style={styles.amount}>{formatMoney(invoice.total_amount)}</Text>
                {!isEditingDiscount && (invoice.discount ?? 0) === 0 ? (
                  <TouchableOpacity
                    style={[styles.chip, { paddingVertical: 4, paddingHorizontal: 10 }]}
                    onPress={() => { setDiscountInput(""); setDiscountMode("PKR"); setIsEditingDiscount(true); }}
                  >
                    <Text style={styles.chipText}>+ Discount</Text>
                  </TouchableOpacity>
                ) : null}
              </View>
            </View>

            {/* Paid / Remaining rows (only when there's a payment) */}
            {(invoice.paid_amount ?? 0) > 0 ? (
              <>
                <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 8 }}>
                  <Text style={styles.itemSub}>Paid</Text>
                  <Text style={styles.amountSuccess}>{formatMoney(invoice.paid_amount ?? 0)}</Text>
                </View>
                <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 4 }}>
                  <Text style={styles.itemSub}>Remaining</Text>
                  <Text style={invoice.remaining_amount > 0 ? styles.amountDanger : styles.amountSuccess}>
                    {formatMoney(invoice.remaining_amount)}
                  </Text>
                </View>
              </>
            ) : null}

            {/* Export PDF */}
            <View style={{ height: 1, backgroundColor: "rgba(128,128,128,0.18)", marginTop: 14, marginBottom: 10 }} />
            <TouchableOpacity
              style={{ flexDirection: "row", alignItems: "center", gap: 6, alignSelf: "flex-start" }}
              onPress={() => void handleExportPdf()}
              disabled={isExporting}
            >
              <Ionicons name="document-text-outline" size={14} color="#9090aa" />
              <Text style={styles.itemSub}>{isExporting ? "Generating..." : "Export PDF"}</Text>
            </TouchableOpacity>
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
                      {item.quantity} × {formatMoney(item.unit_price_snapshot)}{item.box_qty != null ? ` · ${item.box_qty} boxes` : ""}
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

          <Text style={styles.sec}>ADD ITEMS</Text>
          <Card>
            {!isAddItemsOpen ? (
              <View style={[styles.listItem, styles.noBorder]}>
                <TouchableOpacity
                  style={styles.customerSecondaryBtn}
                  onPress={() => setIsAddItemsOpen(true)}
                >
                  <Text style={[styles.itemTitle, { fontSize: 12 }]}>
                    + Add More Items
                  </Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.formRow}>
                {/* Step 1: item name */}
                <TextInput
                  value={addItemQuery}
                  onFocus={() => setShowAddItemSuggestions(true)}
                  onChangeText={(v) => {
                    setAddItemQuery(v);
                    setAddDraftProductId("");
                    setAddSelectedItemName("");
                    setShowAddModelPicker(false);
                    setShowAddItemSuggestions(true);
                  }}
                  style={styles.formInput}
                  placeholder="Search item"
                  placeholderTextColor="#9aa3b2"
                />
                {showAddItemSuggestions ? (
                  <View style={styles.inlineSuggestionsCard}>
                    {addItemNameSuggestions.length === 0 ? (
                      <View style={[styles.suggestionItem, styles.noBorder]}>
                        <Text style={styles.itemSub}>No items found.</Text>
                      </View>
                    ) : null}
                    {addItemNameSuggestions.map((name, idx) => (
                      <TouchableOpacity
                        key={name}
                        style={[
                          styles.suggestionItem,
                          idx === addItemNameSuggestions.length - 1 &&
                            styles.noBorder,
                        ]}
                        onPress={() => {
                          setAddSelectedItemName(name);
                          setAddItemQuery(name);
                          setShowAddItemSuggestions(false);
                          setShowAddModelPicker(true);
                        }}
                      >
                        <Text style={styles.suggestionText}>{name}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                ) : null}

                {/* Step 2: model picker */}
                {showAddModelPicker ? (
                  <>
                    <Text style={styles.formLabel}>Select Model</Text>
                    <View style={styles.inlineSuggestionsCard}>
                      {modelsForAddItem.map((p, idx) => (
                        <TouchableOpacity
                          key={p._id}
                          style={[
                            styles.suggestionItem,
                            idx === modelsForAddItem.length - 1 &&
                              styles.noBorder,
                          ]}
                          onPress={() => {
                            setAddDraftProductId(p._id);
                            setShowAddModelPicker(false);
                          }}
                        >
                          <Text style={styles.suggestionText}>
                            {formatModel(p.model)}
                          </Text>
                          <Text style={styles.amount}>
                            {formatMoney(p.price)}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </>
                ) : null}

                {/* Quantity + add button */}
                <View style={styles.formRow3}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.formLabel}>QTY</Text>
                    <View style={styles.qtyControlRow}>
                      <TouchableOpacity
                        style={styles.qtyBtn}
                        onPress={() => {
                          const n = Math.max(addDraftQty - 1, 1);
                          setAddDraftQuantity(String(n));
                        }}
                      >
                        <Text style={styles.qtyBtnText}>−</Text>
                      </TouchableOpacity>
                      <TextInput
                        keyboardType="number-pad"
                        value={addDraftQuantity}
                        onChangeText={(v) =>
                          setAddDraftQuantity(v.replace(/[^0-9]/g, ""))
                        }
                        style={styles.qtyInput}
                      />
                      <TouchableOpacity
                        style={styles.qtyBtn}
                        onPress={() =>
                          setAddDraftQuantity(String(addDraftQty + 1))
                        }
                      >
                        <Text style={styles.qtyBtnText}>+</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.formLabel}>BOX QTY</Text>
                    <TextInput
                      keyboardType="number-pad"
                      value={addDraftBoxQty}
                      onChangeText={(v) => setAddDraftBoxQty(v.replace(/[^0-9]/g, ""))}
                      style={[styles.qtyInput, { flex: 1 }]}
                      placeholder="0"
                      placeholderTextColor="#9aa3b2"
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.formLabel}>TOTAL</Text>
                    <View style={styles.formInputBox}>
                      <Text style={styles.formValue}>
                        {formatMoney(addDraftTotal)}
                      </Text>
                    </View>
                  </View>
                </View>

                <TouchableOpacity
                  style={[
                    styles.addItemBtn,
                    { marginHorizontal: 0, marginTop: 10 },
                  ]}
                  onPress={pushAddLineItem}
                >
                  <Text style={styles.seeAll}>+ Add to List</Text>
                </TouchableOpacity>

                {/* Staged new items */}
                {addItemRows.map((row, idx) => (
                  <View
                    key={`new-${idx}`}
                    style={[styles.listItem, { paddingVertical: 8 }]}
                  >
                    <View style={styles.itemMain}>
                      <Text style={styles.itemTitle}>
                        {row.product
                          ? `${row.product.name} — ${formatModel(row.product.model)}`
                          : "Unknown"}
                      </Text>
                      <Text style={styles.itemSub}>
                        {row.qty} × {formatMoney(row.product?.price ?? 0)}{row.boxQty ? ` · ${row.boxQty} boxes` : ""}
                      </Text>
                    </View>
                    <Text style={[styles.amount, { marginRight: 8 }]}>
                      {formatMoney(row.lineTotal)}
                    </Text>
                    <TouchableOpacity
                      style={styles.customerIconBtnDanger}
                      onPress={() =>
                        setAddLineItems((prev) =>
                          prev.filter((_, i) => i !== idx),
                        )
                      }
                    >
                      <Ionicons
                        name="trash-outline"
                        size={14}
                        color="#e8141c"
                      />
                    </TouchableOpacity>
                  </View>
                ))}

                {addItemRows.length > 0 ? (
                  <View style={styles.listItem}>
                    <View style={styles.itemMain}>
                      <Text style={styles.itemSub}>
                        New items subtotal
                      </Text>
                    </View>
                    <Text style={styles.amount}>{formatMoney(addSubtotal)}</Text>
                  </View>
                ) : null}

                <View
                  style={[
                    styles.customerFormActions,
                    { paddingHorizontal: 16, paddingBottom: 14, marginTop: 8 },
                  ]}
                >
                  <TouchableOpacity
                    style={styles.customerSecondaryBtn}
                    onPress={() => {
                      setIsAddItemsOpen(false);
                      setAddLineItems([]);
                      setAddItemQuery("");
                      setAddDraftProductId("");
                      setAddDraftQuantity("1");
                      setAddDraftBoxQty("");
                      setAddSelectedItemName("");
                      setShowAddItemSuggestions(false);
                      setShowAddModelPicker(false);
                    }}
                    disabled={isAppending}
                  >
                    <Text style={styles.itemSub}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.customerPrimaryBtn,
                      addItemRows.length === 0 && styles.ctaDisabled,
                    ]}
                    onPress={() => void handleAppendItems()}
                    disabled={isAppending || addItemRows.length === 0}
                  >
                    <Text style={styles.customerPrimaryBtnText}>
                      {isAppending ? "Saving..." : "Save Items"}
                    </Text>
                  </TouchableOpacity>
                </View>
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
