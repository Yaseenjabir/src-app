import { Ionicons } from "@expo/vector-icons";
import { useCallback, useEffect, useState } from "react";
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import {
  createProductApi,
  deleteProductApi,
  listProductsApi,
  updateProductApi,
} from "../api/products";
import { listProductModelsApi } from "../api/productModels";
import { ApiError } from "../api/http";
import { useAuth } from "../auth/AuthContext";
import { BoxIcon, Card, Loader } from "../components/common";
import { AppHeader } from "../components/AppHeader";
import { useToast } from "../feedback/ToastContext";
import { useAppTheme } from "../theme/AppThemeContext";
import type { Product, ProductModel } from "../types/entities";
import { formatModel } from "../utils/format";

type ItemRow = {
  name: string;
  models: Record<string, Product>;
};

function groupByName(products: Product[]): ItemRow[] {
  const map = new Map<string, Record<string, Product>>();
  for (const p of products) {
    if (!map.has(p.name)) map.set(p.name, {});
    const key = p.model?.label ?? "";
    if (key) map.get(p.name)![key] = p;
  }
  return Array.from(map.entries()).map(([name, models]) => ({ name, models }));
}

type ModelFormRow = {
  localId: string;
  productId?: string;
  model: string;
  price: string;
  showDropdown: boolean;
};

let _rowCounter = 0;
function newRowId() {
  return String(++_rowCounter);
}

const COL_SR = 44;
const COL_ITEM = 130;
const COL_MODEL = 94;
const COL_ACTIONS = 112;

export function ProductsScreen({
  refreshTick = 0,
  onManageModels,
}: {
  refreshTick?: number;
  onManageModels: () => void;
}) {
  const { styles, mode } = useAppTheme();
  const { showToast } = useToast();
  const { token } = useAuth();

  const isDark = mode === "dark";
  const tBorder = isDark ? "#2b2b3a" : "#d0d7ea";
  const tHeaderBg = isDark ? "#1a1a24" : "#eef2fb";
  const tMuted = isDark ? "#9090aa" : "#6b7280";
  const tText = isDark ? "#ffffff" : "#111827";
  const tPrice = isDark ? "#00c97a" : "#0f9f5a";

  const [items, setItems] = useState<Product[]>([]);
  const [availableModels, setAvailableModels] = useState<ProductModel[]>([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingItemName, setEditingItemName] = useState<string | null>(null);
  const [formName, setFormName] = useState("");
  const [formRows, setFormRows] = useState<ModelFormRow[]>([]);
  const [formError, setFormError] = useState<string | null>(null);
  const [editingDirectId, setEditingDirectId] = useState<string | null>(null);
  const [formType, setFormType] = useState<"direct" | "model">("model");
  const [formDirectPrice, setFormDirectPrice] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    if (!token) return;
    setIsLoading(true);
    setLoadError(null);
    try {
      const allProducts: Product[] = [];
      let page = 1;
      let totalPages = 1;
      while (page <= totalPages) {
        const res = await listProductsApi(token, { page, limit: 100 });
        allProducts.push(...res.items);
        totalPages = res.pagination?.totalPages ?? 1;
        page += 1;
      }
      const modelsRes = await listProductModelsApi(token);
      setItems(allProducts);
      setAvailableModels(modelsRes.items);
    } catch {
      setLoadError("Unable to load products");
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void loadData();
  }, [refreshTick, loadData]);

  const resetForm = () => {
    setEditingItemName(null);
    setEditingDirectId(null);
    setFormType("model");
    setFormName("");
    setFormDirectPrice("");
    setFormRows([
      {
        localId: newRowId(),
        model: availableModels[0]?._id ?? "",
        price: "",
        showDropdown: false,
      },
    ]);
    setFormError(null);
  };

  const openCreateForm = () => {
    resetForm();
    setIsFormOpen(true);
  };

  const openEditForm = (itemRow: ItemRow) => {
    setEditingItemName(itemRow.name);
    setFormName(itemRow.name);
    const rows: ModelFormRow[] = Object.entries(itemRow.models).map(
      ([label, p]) => ({
        localId: newRowId(),
        productId: p._id,
        model: availableModels.find((m) => m.label === label)?._id ?? label,
        price: String(p.price),
        showDropdown: false,
      }),
    );
    setFormRows(
      rows.length > 0
        ? rows
        : [
            {
              localId: newRowId(),
              model: availableModels[0]?._id ?? "",
              price: "",
              showDropdown: false,
            },
          ],
    );
    setFormError(null);
    setIsFormOpen(true);
  };

  const openEditDirectForm = (product: Product) => {
    setEditingItemName(null);
    setEditingDirectId(product._id);
    setFormType("direct");
    setFormName(product.name);
    setFormDirectPrice(String(product.price));
    setFormRows([]);
    setFormError(null);
    setIsFormOpen(true);
  };

  const addModelRow = () => {
    const usedIds = formRows.map((r) => r.model);
    const nextModel =
      availableModels.find((m) => !usedIds.includes(m._id))?._id ??
      availableModels[0]?._id ?? "";
    setFormRows((prev) => [
      ...prev,
      {
        localId: newRowId(),
        model: nextModel,
        price: "",
        showDropdown: false,
      },
    ]);
  };

  const removeModelRow = (localId: string) => {
    setFormRows((prev) => prev.filter((r) => r.localId !== localId));
  };

  const updateRow = (
    localId: string,
    changes: Partial<Omit<ModelFormRow, "localId">>,
  ) => {
    setFormRows((prev) =>
      prev.map((r) => (r.localId === localId ? { ...r, ...changes } : r)),
    );
  };

  const usedModelsExcept = (localId: string) =>
    formRows.filter((r) => r.localId !== localId).map((r) => r.model);

  const validateForm = (): boolean => {
    const trimmedName = formName.trim();
    if (trimmedName.length < 2) {
      setFormError("Item name must be at least 2 characters.");
      return false;
    }
    if (formType === "direct") {
      const parsedPrice = parseInt(formDirectPrice || "0", 10);
      if (!Number.isInteger(parsedPrice) || parsedPrice < 0) {
        setFormError("Price must be a non-negative whole number.");
        return false;
      }
      return true;
    }
    if (formRows.length === 0) {
      setFormError("At least one model is required.");
      return false;
    }
    const modelsSeen = new Set<string>();
    for (const row of formRows) {
      if (modelsSeen.has(row.model)) {
        setFormError(`Duplicate model: ${availableModels.find((m) => m._id === row.model)?.label ?? row.model}`);
        return false;
      }
      modelsSeen.add(row.model);
      const parsedPrice = parseInt(row.price || "0", 10);
      if (!Number.isInteger(parsedPrice) || parsedPrice < 0) {
        setFormError(
          `Price for ${availableModels.find((m) => m._id === row.model)?.label ?? row.model} must be a non-negative whole number.`,
        );
        return false;
      }
    }
    return true;
  };

  const handleSave = async () => {
    if (!token) return;
    setFormError(null);
    if (!validateForm()) return;

    const trimmedName = formName.trim().toUpperCase();
    setIsSaving(true);
    try {
      if (formType === "direct") {
        const price = parseInt(formDirectPrice || "0", 10);
        if (editingDirectId) {
          await updateProductApi(token, editingDirectId, {
            name: trimmedName,
            price,
          });
          showToast("Product updated.", "success");
        } else {
          await createProductApi(token, {
            type: "direct",
            name: trimmedName,
            price,
          });
          showToast("Product added.", "success");
        }
      } else if (editingItemName) {
        const originals = items.filter((p) => p.name === editingItemName);
        const formRowIds = new Set(
          formRows.filter((r) => r.productId).map((r) => r.productId!),
        );
        const toDelete = originals.filter((p) => !formRowIds.has(p._id));
        const toUpdate = formRows.filter((r) => r.productId);
        const toCreate = formRows.filter((r) => !r.productId);

        await Promise.all(toDelete.map((p) => deleteProductApi(token, p._id)));
        await Promise.all([
          ...toUpdate.map((r) =>
            updateProductApi(token, r.productId!, {
              name: trimmedName,
              price: parseInt(r.price || "0", 10),
            }),
          ),
          ...toCreate.map((r) =>
            createProductApi(token, {
              type: "model",
              name: trimmedName,
              model: r.model,
              price: parseInt(r.price || "0", 10),
            }),
          ),
        ]);
        showToast("Product updated.", "success");
      } else {
        await Promise.all(
          formRows.map((r) =>
            createProductApi(token, {
              type: "model",
              name: trimmedName,
              model: r.model,
              price: parseInt(r.price || "0", 10),
            }),
          ),
        );
        showToast("Product added.", "success");
      }

      setIsFormOpen(false);
      resetForm();
      await loadData();
    } catch (e) {
      if (e instanceof ApiError) {
        setFormError(e.message);
        showToast(e.message, "error");
      } else {
        setFormError("Unable to save product.");
        showToast("Unable to save product.", "error");
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteItem = (itemRow: ItemRow) => {
    if (!token) return;
    Alert.alert("Delete item", `Remove "${itemRow.name}" and all its models?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            const productIds = (Object.values(itemRow.models) as Product[]).map(
              (p) => p._id,
            );
            await Promise.all(
              productIds.map((id) => deleteProductApi(token, id)),
            );
            await loadData();
            showToast("Item deleted.", "success");
          } catch {
            showToast("Unable to delete item.", "error");
          }
        },
      },
    ]);
  };

  const handleDeleteDirect = (product: Product) => {
    if (!token) return;
    Alert.alert("Delete product", `Remove "${product.name}"?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await deleteProductApi(token, product._id);
            await loadData();
            showToast("Product deleted.", "success");
          } catch {
            showToast("Unable to delete product.", "error");
          }
        },
      },
    ]);
  };

  const directProducts = items.filter((p) => p.type === "direct");
  const modelProducts = items.filter((p) => p.type !== "direct");
  const grouped = groupByName(modelProducts);

  return (
    <>
      <AppHeader>
        <TouchableOpacity style={styles.boxIcon} onPress={onManageModels}>
          <Ionicons
            name="layers-outline"
            size={18}
            color={mode === "dark" ? "#a0a8c0" : "#2535c8"}
          />
        </TouchableOpacity>
        <TouchableOpacity onPress={openCreateForm}>
          <BoxIcon label="＋" red />
        </TouchableOpacity>
      </AppHeader>

      {isFormOpen ? (
        <Card>
          <View style={styles.formRow}>
            <Text style={styles.itemTitle}>
              {editingItemName || editingDirectId ? "Edit Product" : "Add Product"}
            </Text>

            {!editingItemName && !editingDirectId ? (
              <View style={{ flexDirection: "row", gap: 8, marginBottom: 8 }}>
                <TouchableOpacity
                  style={[
                    styles.customerSecondaryBtn,
                    formType === "direct" && {
                      borderColor: "#e8141c",
                      backgroundColor: "#ffeaea",
                    },
                  ]}
                  onPress={() => setFormType("direct")}
                >
                  <Text
                    style={[
                      styles.seeAll,
                      formType === "direct" && { color: "#e8141c" },
                    ]}
                  >
                    Direct
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.customerSecondaryBtn,
                    formType === "model" && {
                      borderColor: "#2535c8",
                      backgroundColor: "#eaedff",
                    },
                  ]}
                  onPress={() => setFormType("model")}
                >
                  <Text
                    style={[
                      styles.seeAll,
                      formType === "model" && { color: "#2535c8" },
                    ]}
                  >
                    With Models
                  </Text>
                </TouchableOpacity>
              </View>
            ) : null}

            <Text style={styles.formLabel}>Item Name *</Text>
            <TextInput
              value={formName}
              onChangeText={setFormName}
              style={styles.formInput}
              placeholder="e.g. GNG"
              placeholderTextColor="#9aa3b2"
              autoCapitalize="characters"
            />

            {formType === "direct" ? (
              <>
                <Text style={[styles.formLabel, { marginTop: 16 }]}>
                  Price (PKR) *
                </Text>
                <TextInput
                  value={formDirectPrice}
                  onChangeText={(v) =>
                    setFormDirectPrice(v.replace(/[^0-9]/g, ""))
                  }
                  style={styles.formInput}
                  placeholder="0"
                  placeholderTextColor="#9aa3b2"
                  keyboardType="number-pad"
                />
              </>
            ) : (
              <>
                <Text style={[styles.formLabel, { marginTop: 16 }]}>
                  Models *
                </Text>

            {formRows.map((row) => (
              <View key={row.localId}>
                <View style={localStyles.modelRow}>
                  <TouchableOpacity
                    style={[styles.formInputBox, localStyles.modelDropBtn]}
                    onPress={() =>
                      updateRow(row.localId, {
                        showDropdown: !row.showDropdown,
                      })
                    }
                  >
                    <Text style={styles.formValue}>
                      {availableModels.find((m) => m._id === row.model)?.label ?? row.model}
                    </Text>
                  </TouchableOpacity>

                  <TextInput
                    value={row.price}
                    onChangeText={(v) =>
                      updateRow(row.localId, {
                        price: v.replace(/[^0-9]/g, ""),
                      })
                    }
                    style={[styles.formInput, localStyles.priceInput]}
                    placeholder="Price"
                    placeholderTextColor="#9aa3b2"
                    keyboardType="number-pad"
                  />

                  {formRows.length > 1 ? (
                    <TouchableOpacity
                      style={localStyles.removeBtn}
                      onPress={() => removeModelRow(row.localId)}
                    >
                      <Ionicons name="close-circle" size={22} color="#e8141c" />
                    </TouchableOpacity>
                  ) : null}
                </View>

                {row.showDropdown ? (
                  <View style={styles.inlineSuggestionsCard}>
                    {availableModels
                      .filter(
                        (m) =>
                          m._id === row.model ||
                          !usedModelsExcept(row.localId).includes(m._id),
                      )
                      .map((m, i, arr) => (
                        <TouchableOpacity
                          key={m._id}
                          style={[
                            styles.suggestionItem,
                            i === arr.length - 1 && styles.noBorder,
                          ]}
                          onPress={() =>
                            updateRow(row.localId, {
                              model: m._id,
                              showDropdown: false,
                            })
                          }
                        >
                          <Text style={styles.suggestionText}>
                            {m.label}
                          </Text>
                        </TouchableOpacity>
                      ))}
                  </View>
                ) : null}
              </View>
            ))}

            {formRows.length < availableModels.length ? (
              <TouchableOpacity
                style={[styles.removeItemBtn, localStyles.addModelBtn]}
                onPress={addModelRow}
              >
                <Ionicons name="add" size={14} color="#2535c8" />
                <Text style={[styles.removeItemBtnText, { color: "#2535c8" }]}>
                  Add Model
                </Text>
              </TouchableOpacity>
            ) : null}
              </>
            )}

            {formError ? (
              <Text style={styles.loginError}>{formError}</Text>
            ) : null}

            <View style={styles.customerFormActions}>
              <TouchableOpacity
                style={styles.customerSecondaryBtn}
                onPress={() => {
                  setIsFormOpen(false);
                  resetForm();
                }}
              >
                <Text style={styles.seeAll}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.customerPrimaryBtn}
                onPress={handleSave}
                disabled={isSaving}
              >
                <Text style={styles.customerPrimaryBtnText}>
                  {isSaving
                    ? "Saving..."
                    : editingItemName || editingDirectId
                      ? "Update"
                      : "Create"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </Card>
      ) : null}

      {isLoading ? (
        <Card>
          <Loader />
        </Card>
      ) : null}

      {!isLoading && loadError ? (
        <Card>
          <View style={styles.listItem}>
            <Text style={styles.badgeUnpaid}>{loadError}</Text>
          </View>
        </Card>
      ) : null}

      {!isLoading && !loadError && directProducts.length === 0 && grouped.length === 0 ? (
        <Card>
          <View style={styles.listItem}>
            <Text style={styles.itemSub}>No products found.</Text>
          </View>
        </Card>
      ) : null}

      {!isLoading && !loadError && grouped.length > 0 ? (
        <>
          <Text style={styles.sec}>MODEL-BASED PRODUCTS</Text>
          <Card>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View>
                {/* Header */}
                <View
                  style={[
                    localStyles.tableRow,
                    {
                      backgroundColor: tHeaderBg,
                      borderBottomColor: tBorder,
                      borderBottomWidth: 1,
                    },
                  ]}
                >
                  <View style={[localStyles.cell, { width: COL_SR }]}>
                    <Text style={[localStyles.headerText, { color: tMuted }]}>
                      #
                    </Text>
                  </View>
                  <View style={[localStyles.cell, { width: COL_ITEM }]}>
                    <Text style={[localStyles.headerText, { color: tMuted }]}>
                      Item
                    </Text>
                  </View>
                  {availableModels.map((m) => (
                    <View
                      key={m.label}
                      style={[localStyles.cell, { width: COL_MODEL }]}
                    >
                      <Text style={[localStyles.headerText, { color: tMuted }]}>
                        {m.label}
                      </Text>
                    </View>
                  ))}
                  <View style={[localStyles.cell, { width: COL_ACTIONS }]}>
                    <Text style={[localStyles.headerText, { color: tMuted }]}>
                      Actions
                    </Text>
                  </View>
                </View>

                {/* Data rows */}
                {grouped.map((itemRow, index) => (
                  <View
                    key={itemRow.name}
                    style={[
                      localStyles.tableRow,
                      {
                        borderBottomColor: tBorder,
                        borderBottomWidth: index === grouped.length - 1 ? 0 : 1,
                      },
                    ]}
                  >
                    <View style={[localStyles.cell, { width: COL_SR }]}>
                      <Text style={[localStyles.indexText, { color: tMuted }]}>
                        {index + 1}
                      </Text>
                    </View>
                    <View style={[localStyles.cell, { width: COL_ITEM }]}>
                      <Text
                        style={[localStyles.itemNameText, { color: tText }]}
                        numberOfLines={2}
                      >
                        {itemRow.name}
                      </Text>
                    </View>
                    {availableModels.map((m) => (
                      <View
                        key={m.label}
                        style={[localStyles.cell, { width: COL_MODEL }]}
                      >
                        {itemRow.models[m.label] ? (
                          <Text
                            style={[localStyles.priceText, { color: tPrice }]}
                          >
                            {itemRow.models[m.label]!.price.toLocaleString()}
                          </Text>
                        ) : (
                          <Text
                            style={[localStyles.dashText, { color: tMuted }]}
                          >
                            —
                          </Text>
                        )}
                      </View>
                    ))}
                    <View style={[localStyles.cell, { width: COL_ACTIONS }]}>
                      <View style={styles.customerRowActions}>
                        <TouchableOpacity
                          style={styles.customerIconBtn}
                          onPress={() => openEditForm(itemRow)}
                        >
                          <Ionicons
                            name="create-outline"
                            size={15}
                            color="#2535c8"
                          />
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.customerIconBtnDanger}
                          onPress={() => handleDeleteItem(itemRow)}
                        >
                          <Ionicons
                            name="trash-outline"
                            size={15}
                            color="#e8141c"
                          />
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>
                ))}
              </View>
            </ScrollView>
          </Card>
        </>
      ) : null}

      {!isLoading && !loadError && directProducts.length > 0 ? (
        <>
          <Text style={styles.sec}>DIRECT PRODUCTS</Text>
          <Card>
            {/* Header */}
            <View
              style={[
                localStyles.tableRow,
                {
                  backgroundColor: tHeaderBg,
                  borderBottomColor: tBorder,
                  borderBottomWidth: 1,
                },
              ]}
            >
              <View style={[localStyles.cell, { width: COL_SR }]}>
                <Text style={[localStyles.headerText, { color: tMuted }]}>#</Text>
              </View>
              <View style={[localStyles.cell, { flex: 1 }]}>
                <Text style={[localStyles.headerText, { color: tMuted }]}>Item</Text>
              </View>
              <View style={[localStyles.cell, { width: COL_MODEL }]}>
                <Text style={[localStyles.headerText, { color: tMuted }]}>Price</Text>
              </View>
              <View style={[localStyles.cell, { width: COL_ACTIONS }]}>
                <Text style={[localStyles.headerText, { color: tMuted }]}>Actions</Text>
              </View>
            </View>

            {/* Data rows */}
            {directProducts.map((p, index) => (
              <View
                key={p._id}
                style={[
                  localStyles.tableRow,
                  {
                    borderBottomColor: tBorder,
                    borderBottomWidth: index === directProducts.length - 1 ? 0 : 1,
                  },
                ]}
              >
                <View style={[localStyles.cell, { width: COL_SR }]}>
                  <Text style={[localStyles.indexText, { color: tMuted }]}>
                    {index + 1}
                  </Text>
                </View>
                <View style={[localStyles.cell, { flex: 1 }]}>
                  <Text
                    style={[localStyles.itemNameText, { color: tText }]}
                    numberOfLines={2}
                  >
                    {p.name}
                  </Text>
                </View>
                <View style={[localStyles.cell, { width: COL_MODEL }]}>
                  <Text style={[localStyles.priceText, { color: tPrice }]}>
                    {p.price.toLocaleString()}
                  </Text>
                </View>
                <View style={[localStyles.cell, { width: COL_ACTIONS }]}>
                  <View style={styles.customerRowActions}>
                    <TouchableOpacity
                      style={styles.customerIconBtn}
                      onPress={() => openEditDirectForm(p)}
                    >
                      <Ionicons name="create-outline" size={15} color="#2535c8" />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.customerIconBtnDanger}
                      onPress={() => handleDeleteDirect(p)}
                    >
                      <Ionicons name="trash-outline" size={15} color="#e8141c" />
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            ))}
          </Card>
        </>
      ) : null}
    </>
  );
}

const localStyles = StyleSheet.create({
  modelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 8,
  },
  modelDropBtn: {
    flex: 1,
    minHeight: 46,
    justifyContent: "center",
  },
  priceInput: {
    width: 100,
    minHeight: 46,
  },
  removeBtn: {
    padding: 4,
  },
  addModelBtn: {
    marginTop: 10,
    alignSelf: "flex-start",
    borderColor: "#2535c833",
    backgroundColor: "transparent",
  },
  tableRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  cell: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    justifyContent: "center",
  },
  headerText: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  indexText: {
    fontSize: 12,
    fontWeight: "600",
  },
  itemNameText: {
    fontSize: 13,
    fontWeight: "700",
  },
  priceText: {
    fontSize: 13,
    fontWeight: "700",
  },
  dashText: {
    fontSize: 13,
    fontWeight: "400",
  },
});
