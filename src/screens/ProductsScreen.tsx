import { Ionicons } from "@expo/vector-icons";
import { useCallback, useEffect, useState } from "react";
import { Alert, Text, TextInput, TouchableOpacity, View } from "react-native";
import {
  createProductApi,
  deleteProductApi,
  getProductCategoriesApi,
  listProductsApi,
  updateProductApi,
} from "../api/products";
import { ApiError } from "../api/http";
import { useAuth } from "../auth/AuthContext";
import { BoxIcon, Card } from "../components/common";
import { useAppTheme } from "../theme/AppThemeContext";
import type { Product } from "../types/entities";
import { formatMoney } from "../utils/format";

export function ProductsScreen({ refreshTick = 0 }: { refreshTick?: number }) {
  const { styles } = useAppTheme();
  const { token } = useAuth();
  const [items, setItems] = useState<Product[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [price, setPrice] = useState("");
  const [showCategoryOptions, setShowCategoryOptions] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [actionProductId, setActionProductId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const resetForm = () => {
    setEditingProductId(null);
    setName("");
    setCategory(categories[0] ?? "OTHER");
    setPrice("");
    setShowCategoryOptions(false);
    setFormError(null);
  };

  const loadProducts = useCallback(async () => {
    if (!token) return;
    setIsLoading(true);
    setError(null);

    try {
      const response = await listProductsApi(token);
      setItems(response.items);
    } catch {
      setError("Unable to load products");
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  const loadCategories = useCallback(async () => {
    if (!token) return;

    try {
      const response = await getProductCategoriesApi(token);
      setCategories(response.categories);
      if (!category) {
        setCategory(response.categories[0] ?? "OTHER");
      }
    } catch {
      // fall back to minimal option to keep form usable
      if (!category) setCategory("OTHER");
      setCategories((prev) => (prev.length ? prev : ["OTHER"]));
    }
  }, [token, category]);

  useEffect(() => {
    void loadProducts();
    void loadCategories();
  }, [refreshTick, loadProducts, loadCategories]);

  const openCreateForm = () => {
    resetForm();
    setIsFormOpen(true);
  };

  const openEditForm = (product: Product) => {
    setEditingProductId(product._id);
    setName(product.name || "");
    setCategory(product.category || categories[0] || "OTHER");
    setPrice(String(product.price ?? ""));
    setShowCategoryOptions(false);
    setFormError(null);
    setIsFormOpen(true);
  };

  const handleSave = async () => {
    if (!token) return;
    setFormError(null);

    const trimmedName = name.trim();
    const parsedPrice = parseInt(price || "0", 10);

    if (trimmedName.length < 2) {
      setFormError("Name must be at least 2 characters.");
      return;
    }
    if (!category) {
      setFormError("Category is required.");
      return;
    }
    if (!Number.isInteger(parsedPrice) || parsedPrice < 0) {
      setFormError("Price must be a non-negative whole number.");
      return;
    }

    const payload = {
      name: trimmedName,
      category,
      price: parsedPrice,
    };

    setIsSaving(true);
    try {
      if (editingProductId) {
        await updateProductApi(token, editingProductId, payload);
      } else {
        await createProductApi(token, payload);
      }

      setIsFormOpen(false);
      resetForm();
      await loadProducts();
    } catch (e) {
      if (e instanceof ApiError) {
        setFormError(e.message);
      } else {
        setFormError("Unable to save product.");
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = (product: Product) => {
    if (!token) return;

    Alert.alert("Delete product", `Deactivate ${product.name}?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            setActionProductId(product._id);
            await deleteProductApi(token, product._id);
            await loadProducts();
          } catch {
            setError("Unable to delete product");
          } finally {
            setActionProductId(null);
          }
        },
      },
    ]);
  };

  return (
    <>
      <View style={styles.appBar}>
        <Text style={styles.title}>Products</Text>
        <TouchableOpacity onPress={openCreateForm}>
          <BoxIcon label="＋" red />
        </TouchableOpacity>
      </View>

      {isFormOpen ? (
        <Card>
          <View style={styles.formRow}>
            <Text style={styles.itemTitle}>
              {editingProductId ? "Edit Product" : "Add Product"}
            </Text>

            <Text style={styles.formLabel}>Name *</Text>
            <TextInput
              value={name}
              onChangeText={setName}
              style={styles.formInput}
              placeholder="Product name"
              placeholderTextColor="#9aa3b2"
            />

            <Text style={styles.formLabel}>Category *</Text>
            <TouchableOpacity
              style={styles.formInputBox}
              onPress={() => setShowCategoryOptions((prev) => !prev)}
            >
              <Text style={styles.formValue}>
                {category || "Select category"}
              </Text>
            </TouchableOpacity>

            {showCategoryOptions ? (
              <View style={styles.inlineSuggestionsCard}>
                {categories.map((item, index) => (
                  <TouchableOpacity
                    key={item}
                    style={[
                      styles.suggestionItem,
                      index === categories.length - 1 && styles.noBorder,
                    ]}
                    onPress={() => {
                      setCategory(item);
                      setShowCategoryOptions(false);
                    }}
                  >
                    <Text style={styles.suggestionText}>{item}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            ) : null}

            <Text style={styles.formLabel}>Price (PKR) *</Text>
            <TextInput
              value={price}
              onChangeText={(value) => setPrice(value.replace(/[^0-9]/g, ""))}
              style={styles.formInput}
              placeholder="0"
              keyboardType="number-pad"
              placeholderTextColor="#9aa3b2"
            />

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
                    : editingProductId
                      ? "Update"
                      : "Create"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </Card>
      ) : null}

      <Card>
        {isLoading ? (
          <View style={styles.listItem}>
            <Text style={styles.itemSub}>Loading products...</Text>
          </View>
        ) : null}

        {!isLoading && error ? (
          <View style={styles.listItem}>
            <Text style={styles.badgeUnpaid}>{error}</Text>
          </View>
        ) : null}

        {!isLoading && !error && items.length === 0 ? (
          <View style={styles.listItem}>
            <Text style={styles.itemSub}>No products found.</Text>
          </View>
        ) : null}

        {!isLoading &&
          !error &&
          items.map((product, index) => (
            <View
              key={product._id}
              style={[
                styles.listItem,
                index === items.length - 1 && styles.noBorder,
              ]}
            >
              <View style={styles.itemMain}>
                <Text style={styles.itemTitle}>{product.name}</Text>
                <Text
                  style={styles.itemSub}
                >{`${product.sku} · ${product.category}`}</Text>
              </View>
              <Text style={styles.amount}>{formatMoney(product.price)}</Text>
              <View style={styles.customerRowActions}>
                <TouchableOpacity
                  style={styles.customerIconBtn}
                  onPress={() => openEditForm(product)}
                >
                  <Ionicons name="create-outline" size={16} color="#2535c8" />
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.customerIconBtnDanger}
                  onPress={() => handleDelete(product)}
                  disabled={actionProductId === product._id}
                >
                  <Ionicons name="trash-outline" size={16} color="#e8141c" />
                </TouchableOpacity>
              </View>
            </View>
          ))}
      </Card>
    </>
  );
}
