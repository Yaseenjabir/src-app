import { Ionicons } from "@expo/vector-icons";
import { useCallback, useEffect, useState } from "react";
import { Alert, Text, TextInput, TouchableOpacity, View } from "react-native";
import {
  createCustomerApi,
  deleteCustomerApi,
  listCustomersApi,
  updateCustomerApi,
} from "../api/customers";
import { useAuth } from "../auth/AuthContext";
import { ApiError } from "../api/http";
import { BoxIcon, Card, Loader } from "../components/common";
import { AppHeader } from "../components/AppHeader";
import { useToast } from "../feedback/ToastContext";
import { useAppTheme } from "../theme/AppThemeContext";
import type { Customer } from "../types/entities";

export function CustomersScreen({ refreshTick = 0 }: { refreshTick?: number }) {
  const { styles } = useAppTheme();
  const { showToast } = useToast();
  const { token } = useAuth();
  const [items, setItems] = useState<Customer[]>([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingCustomerId, setEditingCustomerId] = useState<string | null>(
    null,
  );
  const [name, setName] = useState("");
  const [shopName, setShopName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [notes, setNotes] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [actionCustomerId, setActionCustomerId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const resetForm = () => {
    setEditingCustomerId(null);
    setName("");
    setShopName("");
    setPhone("");
    setAddress("");
    setNotes("");
    setFormError(null);
  };

  const loadCustomers = useCallback(async () => {
    if (!token) return;
    setIsLoading(true);
    setError(null);

    try {
      const response = await listCustomersApi(token);
      setItems(response.items);
    } catch {
      setError("Unable to load customers");
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void loadCustomers();
  }, [refreshTick, loadCustomers]);

  const openCreateForm = () => {
    resetForm();
    setIsFormOpen(true);
  };

  const openEditForm = (customer: Customer) => {
    setEditingCustomerId(customer._id);
    setName(customer.name || "");
    setShopName(customer.shop_name || "");
    setPhone(customer.phone || "");
    setAddress(customer.address || "");
    setNotes(customer.notes || "");
    setFormError(null);
    setIsFormOpen(true);
  };

  const handleSave = async () => {
    if (!token) return;
    setFormError(null);

    const trimmedName = name.trim();
    if (trimmedName.length < 2) {
      setFormError("Name must be at least 2 characters.");
      return;
    }

    const payload = {
      name: trimmedName,
      shop_name: shopName.trim() || undefined,
      phone: phone.trim() || undefined,
      address: address.trim() || undefined,
      notes: notes.trim() || undefined,
    };

    setIsSaving(true);
    try {
      if (editingCustomerId) {
        await updateCustomerApi(token, editingCustomerId, payload);
        showToast("Customer updated successfully.", "success");
      } else {
        await createCustomerApi(token, payload);
        showToast("Customer added successfully.", "success");
      }

      setIsFormOpen(false);
      resetForm();
      await loadCustomers();
    } catch (e) {
      if (e instanceof ApiError) {
        setFormError(e.message);
        showToast(e.message, "error");
      } else {
        setFormError("Unable to save customer.");
        showToast("Unable to save customer.", "error");
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = (customer: Customer) => {
    if (!token) return;

    Alert.alert(
      "Delete customer",
      `Do you want to deactivate ${customer.shop_name || customer.name}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              setActionCustomerId(customer._id);
              await deleteCustomerApi(token, customer._id);
              await loadCustomers();
              showToast("Customer deleted successfully.", "success");
            } catch (e) {
              const message =
                e instanceof ApiError ? e.message : "Unable to delete customer";
              setError(message);
              showToast(message, "error");
            } finally {
              setActionCustomerId(null);
            }
          },
        },
      ],
    );
  };

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
              {editingCustomerId ? "Edit Customer" : "Add Customer"}
            </Text>

            <Text style={styles.formLabel}>Name *</Text>
            <TextInput
              value={name}
              onChangeText={setName}
              style={styles.formInput}
              placeholder="Customer name"
              placeholderTextColor="#9aa3b2"
            />

            <Text style={styles.formLabel}>Shop Name</Text>
            <TextInput
              value={shopName}
              onChangeText={setShopName}
              style={styles.formInput}
              placeholder="Shop name"
              placeholderTextColor="#9aa3b2"
            />

            <Text style={styles.formLabel}>Phone</Text>
            <TextInput
              value={phone}
              onChangeText={setPhone}
              style={styles.formInput}
              placeholder="Phone"
              keyboardType="phone-pad"
              placeholderTextColor="#9aa3b2"
            />

            <Text style={styles.formLabel}>Address</Text>
            <TextInput
              value={address}
              onChangeText={setAddress}
              style={styles.formInput}
              placeholder="Address"
              placeholderTextColor="#9aa3b2"
            />

            <Text style={styles.formLabel}>Notes</Text>
            <TextInput
              value={notes}
              onChangeText={setNotes}
              style={styles.formInput}
              placeholder="Notes"
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
                    : editingCustomerId
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

        {!isLoading && error ? (
          <View style={styles.listItem}>
            <Text style={styles.badgeUnpaid}>{error}</Text>
          </View>
        ) : null}

        {!isLoading && !error && items.length === 0 ? (
          <View style={styles.listItem}>
            <Text style={styles.itemSub}>No customers found.</Text>
          </View>
        ) : null}

        {!isLoading &&
          !error &&
          items.map((customer, index) => (
            <View
              key={customer._id}
              style={[
                styles.listItem,
                index === items.length - 1 && styles.noBorder,
              ]}
            >
              <View style={styles.itemMain}>
                <Text style={styles.itemTitle}>
                  {customer.shop_name || customer.name}
                </Text>
                <Text style={styles.itemSub}>
                  {customer.address || customer.phone || "No details"}
                </Text>
              </View>

              <View style={styles.customerRowActions}>
                <TouchableOpacity
                  style={styles.customerIconBtn}
                  onPress={() => openEditForm(customer)}
                >
                  <Ionicons name="create-outline" size={16} color="#2535c8" />
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.customerIconBtnDanger}
                  onPress={() => handleDelete(customer)}
                  disabled={actionCustomerId === customer._id}
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
