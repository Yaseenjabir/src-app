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
import { ApiError } from "../api/http";
import { useAuth } from "../auth/AuthContext";
import { BoxIcon, Card, Loader } from "../components/common";
import { AppHeader } from "../components/AppHeader";
import { useToast } from "../feedback/ToastContext";
import { useAppTheme } from "../theme/AppThemeContext";
import type { Product } from "../types/entities";

const PRODUCT_MODELS = [
  "A_SERIES",
  "K_SERIES",
  "R_SERIES",
  "UNIQUE_SERIES",
] as const;
type ProductModel = (typeof PRODUCT_MODELS)[number];

const MODEL_LABELS: Record<ProductModel, string> = {
  A_SERIES: "A Series",
  K_SERIES: "K Series",
  R_SERIES: "R Series",
  UNIQUE_SERIES: "Unique Series",
};

function formatModel(model: string): string {
  return MODEL_LABELS[model as ProductModel] ?? model;
}

type ItemRow = {
  name: string;
  models: Partial<Record<ProductModel, Product>>;
};

function groupByName(products: Product[]): ItemRow[] {
  const map = new Map<string, Partial<Record<ProductModel, Product>>>();
  for (const p of products) {
    if (!map.has(p.name)) map.set(p.name, {});
    map.get(p.name)![p.model as ProductModel] = p;
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
const COL_ACTIONS = 88;

export function ProductsScreen({ refreshTick = 0 }: { refreshTick?: number }) {
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
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingItemName, setEditingItemName] = useState<string | null>(null);
  const [formName, setFormName] = useState("");
  const [formRows, setFormRows] = useState<ModelFormRow[]>([]);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const loadProducts = useCallback(async () => {
    if (!token) return;
    setIsLoading(true);
    setLoadError(null);
    try {
      const response = await listProductsApi(token, { limit: 100 });
      setItems(response.items);
    } catch {
      setLoadError("Unable to load products");
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void loadProducts();
  }, [refreshTick, loadProducts]);

  const resetForm = () => {
    setEditingItemName(null);
    setFormName("");
    setFormRows([
      {
        localId: newRowId(),
        model: PRODUCT_MODELS[0],
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
    const rows: ModelFormRow[] = PRODUCT_MODELS.filter(
      (m) => itemRow.models[m],
    ).map((m) => ({
      localId: newRowId(),
      productId: itemRow.models[m]!._id,
      model: m,
      price: String(itemRow.models[m]!.price),
      showDropdown: false,
    }));
    setFormRows(
      rows.length > 0
        ? rows
        : [
            {
              localId: newRowId(),
              model: PRODUCT_MODELS[0],
              price: "",
              showDropdown: false,
            },
          ],
    );
    setFormError(null);
    setIsFormOpen(true);
  };

  const addModelRow = () => {
    const usedModels = formRows.map((r) => r.model);
    const nextModel =
      PRODUCT_MODELS.find((m) => !usedModels.includes(m)) ?? PRODUCT_MODELS[0];
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
    if (formRows.length === 0) {
      setFormError("At least one model is required.");
      return false;
    }
    const modelsSeen = new Set<string>();
    for (const row of formRows) {
      if (modelsSeen.has(row.model)) {
        setFormError(`Duplicate model: ${formatModel(row.model)}`);
        return false;
      }
      modelsSeen.add(row.model);
      const parsedPrice = parseInt(row.price || "0", 10);
      if (!Number.isInteger(parsedPrice) || parsedPrice < 0) {
        setFormError(
          `Price for ${formatModel(row.model)} must be a non-negative whole number.`,
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
      if (editingItemName) {
        const originals = items.filter((p) => p.name === editingItemName);
        const formRowIds = new Set(
          formRows.filter((r) => r.productId).map((r) => r.productId!),
        );
        const toDelete = originals.filter((p) => !formRowIds.has(p._id));
        const toUpdate = formRows.filter((r) => r.productId);
        const toCreate = formRows.filter((r) => !r.productId);

        await Promise.all([
          ...toDelete.map((p) => deleteProductApi(token, p._id)),
          ...toUpdate.map((r) =>
            updateProductApi(token, r.productId!, {
              name: trimmedName,
              price: parseInt(r.price || "0", 10),
            }),
          ),
          ...toCreate.map((r) =>
            createProductApi(token, {
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
      await loadProducts();
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
    Alert.alert(
      "Delete item",
      `Remove "${itemRow.name}" and all its models?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              const productIds = (
                Object.values(itemRow.models) as Product[]
              ).map((p) => p._id);
              await Promise.all(
                productIds.map((id) => deleteProductApi(token, id)),
              );
              await loadProducts();
              showToast("Item deleted.", "success");
            } catch {
              showToast("Unable to delete item.", "error");
            }
          },
        },
      ],
    );
  };

  const grouped = groupByName(items);

  return (
    <>
      <AppHeader>
        <TouchableOpacity onPress={openCreateForm}>
          <BoxIcon label="＋" red />
        </TouchableOpacity>
      </AppHeader>

      {isFormOpen ? (
        <Card>
          <View style={styles.formRow}>
            <Text style={styles.itemTitle}>
              {editingItemName ? "Edit Product" : "Add Product"}
            </Text>

            <Text style={styles.formLabel}>Item Name *</Text>
            <TextInput
              value={formName}
              onChangeText={setFormName}
              style={styles.formInput}
              placeholder="e.g. GNG"
              placeholderTextColor="#9aa3b2"
              autoCapitalize="characters"
            />

            <Text style={[styles.formLabel, { marginTop: 16 }]}>Models *</Text>

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
                      {formatModel(row.model)}
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
                    {PRODUCT_MODELS.filter(
                      (m) =>
                        m === row.model ||
                        !usedModelsExcept(row.localId).includes(m),
                    ).map((m, i, arr) => (
                      <TouchableOpacity
                        key={m}
                        style={[
                          styles.suggestionItem,
                          i === arr.length - 1 && styles.noBorder,
                        ]}
                        onPress={() =>
                          updateRow(row.localId, {
                            model: m,
                            showDropdown: false,
                          })
                        }
                      >
                        <Text style={styles.suggestionText}>
                          {formatModel(m)}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                ) : null}
              </View>
            ))}

            {formRows.length < PRODUCT_MODELS.length ? (
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
                    : editingItemName
                      ? "Update"
                      : "Create"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </Card>
      ) : null}

      <Card>
        {isLoading ? <Loader /> : null}

        {!isLoading && loadError ? (
          <View style={styles.listItem}>
            <Text style={styles.badgeUnpaid}>{loadError}</Text>
          </View>
        ) : null}

        {!isLoading && !loadError && grouped.length === 0 ? (
          <View style={styles.listItem}>
            <Text style={styles.itemSub}>No products found.</Text>
          </View>
        ) : null}

        {!isLoading && !loadError && grouped.length > 0 ? (
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
                {PRODUCT_MODELS.map((m) => (
                  <View key={m} style={[localStyles.cell, { width: COL_MODEL }]}>
                    <Text style={[localStyles.headerText, { color: tMuted }]}>
                      {MODEL_LABELS[m]}
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
                  {PRODUCT_MODELS.map((m) => (
                    <View
                      key={m}
                      style={[localStyles.cell, { width: COL_MODEL }]}
                    >
                      {itemRow.models[m] ? (
                        <Text
                          style={[localStyles.priceText, { color: tPrice }]}
                        >
                          {itemRow.models[m]!.price.toLocaleString()}
                        </Text>
                      ) : (
                        <Text style={[localStyles.dashText, { color: tMuted }]}>
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
        ) : null}
      </Card>
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
