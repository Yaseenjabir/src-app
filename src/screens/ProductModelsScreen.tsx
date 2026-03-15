import { Ionicons } from "@expo/vector-icons";
import { useCallback, useEffect, useState } from "react";
import { Alert, Text, TextInput, TouchableOpacity, View } from "react-native";
import {
  createProductModelApi,
  deleteProductModelApi,
  listProductModelsApi,
  updateProductModelApi,
} from "../api/productModels";
import { ApiError } from "../api/http";
import { useAuth } from "../auth/AuthContext";
import { AppHeader } from "../components/AppHeader";
import { BoxIcon, Card, Loader } from "../components/common";
import { useToast } from "../feedback/ToastContext";
import { useAppTheme } from "../theme/AppThemeContext";
import type { ProductModel } from "../types/entities";

export function ProductModelsScreen({ onBack }: { onBack: () => void }) {
  const { styles } = useAppTheme();
  const { showToast } = useToast();
  const { token } = useAuth();

  const [items, setItems] = useState<ProductModel[]>([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formLabel, setFormLabel] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const loadModels = useCallback(async () => {
    if (!token) return;
    setIsLoading(true);
    setLoadError(null);
    try {
      const res = await listProductModelsApi(token);
      setItems(res.items);
    } catch {
      setLoadError("Unable to load models");
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void loadModels();
  }, [loadModels]);

  const resetForm = () => {
    setEditingId(null);
    setFormLabel("");
    setFormError(null);
  };

  const openCreateForm = () => {
    resetForm();
    setIsFormOpen(true);
  };

  const openEditForm = (item: ProductModel) => {
    setEditingId(item._id);
    setFormLabel(item.label);
    setFormError(null);
    setIsFormOpen(true);
  };

  const handleSave = async () => {
    if (!token) return;
    setFormError(null);

    const trimmedLabel = formLabel.trim();
    if (trimmedLabel.length < 1) {
      setFormError("Label is required.");
      return;
    }

    setIsSaving(true);
    try {
      if (editingId) {
        await updateProductModelApi(token, editingId, { label: trimmedLabel });
        showToast("Model updated.", "success");
      } else {
        await createProductModelApi(token, { label: trimmedLabel });
        showToast("Model added.", "success");
      }
      setIsFormOpen(false);
      resetForm();
      await loadModels();
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : "Unable to save model.";
      setFormError(msg);
      showToast(msg, "error");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = (item: ProductModel) => {
    if (!token) return;
    Alert.alert("Delete model", `Remove "${item.label}"?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await deleteProductModelApi(token, item._id);
            await loadModels();
            showToast("Model deleted.", "success");
          } catch {
            showToast("Unable to delete model.", "error");
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
        <TouchableOpacity onPress={openCreateForm}>
          <BoxIcon label="＋" red />
        </TouchableOpacity>
      </AppHeader>

      {isFormOpen ? (
        <Card>
          <View style={styles.formRow}>
            <Text style={styles.itemTitle}>
              {editingId ? "Edit Model" : "Add Model"}
            </Text>

            <Text style={styles.formLabel}>Label *</Text>
            <TextInput
              value={formLabel}
              onChangeText={setFormLabel}
              style={styles.formInput}
              placeholder="e.g. A Series"
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
                onPress={() => void handleSave()}
                disabled={isSaving}
              >
                <Text style={styles.customerPrimaryBtnText}>
                  {isSaving ? "Saving..." : editingId ? "Update" : "Create"}
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
            <Text style={styles.itemSub}>{loadError}</Text>
          </View>
        ) : null}

        {!isLoading && !loadError && items.length === 0 ? (
          <View style={styles.listItem}>
            <Text style={styles.itemSub}>
              No models yet. Tap ＋ to add one.
            </Text>
          </View>
        ) : null}

        {!isLoading &&
          !loadError &&
          items.map((item, index) => (
            <View
              key={item._id}
              style={[
                styles.listItem,
                index === items.length - 1 && styles.noBorder,
              ]}
            >
              <View style={styles.itemMain}>
                <Text style={styles.itemTitle}>{item.label}</Text>
                <Text style={styles.itemSub}>
                  SKU prefix: {item.sku_prefix}
                </Text>
              </View>
              <View style={styles.customerRowActions}>
                <TouchableOpacity
                  style={styles.customerIconBtn}
                  onPress={() => openEditForm(item)}
                >
                  <Ionicons name="create-outline" size={16} color="#2535c8" />
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.customerIconBtnDanger}
                  onPress={() => handleDelete(item)}
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
