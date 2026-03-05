import { Ionicons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import { Text, TouchableOpacity, View } from "react-native";
import { listCustomersApi } from "../api/customers";
import { useAuth } from "../auth/AuthContext";
import { AppHeader } from "../components/AppHeader";
import { Card, Loader } from "../components/common";
import { useToast } from "../feedback/ToastContext";
import { useAppTheme } from "../theme/AppThemeContext";
import type { Customer } from "../types/entities";

export function LedgerScreen({
  refreshTick = 0,
  onOpenCustomer,
}: {
  refreshTick?: number;
  onOpenCustomer: (customer: Customer) => void;
}) {
  const { styles } = useAppTheme();
  const { showToast } = useToast();
  const { token } = useAuth();

  const [items, setItems] = useState<Customer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      if (!token) return;
      setIsLoading(true);
      setError(null);

      try {
        const response = await listCustomersApi(token, {
          isActive: true,
          page: 1,
          limit: 100,
        });
        setItems(response.items);
      } catch {
        setError("Unable to load ledger customers");
        showToast("Unable to load ledger customers.", "error");
      } finally {
        setIsLoading(false);
      }
    };

    void load();
  }, [token, refreshTick, showToast]);

  return (
    <>
      <AppHeader />

      <Text style={styles.sec}>LEDGER</Text>
      <Card>
        <View style={styles.listItem}>
          <Text style={[styles.itemSub, { flex: 0.35, fontWeight: "700" }]}>
            S.No
          </Text>
          <Text style={[styles.itemSub, { flex: 1.5, fontWeight: "700" }]}>
            Customer
          </Text>
          <Text
            style={[
              styles.itemSub,
              { flex: 0.5, textAlign: "right", fontWeight: "700" },
            ]}
          >
            View
          </Text>
        </View>

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
          items.map((customer, idx) => (
            <View
              key={customer._id}
              style={[
                styles.listItem,
                idx === items.length - 1 && styles.noBorder,
              ]}
            >
              <Text style={[styles.itemTitle, { flex: 0.35 }]}>{idx + 1}</Text>
              <Text style={[styles.itemTitle, { flex: 1.5 }]} numberOfLines={1}>
                {customer.shop_name || customer.name}
              </Text>

              <TouchableOpacity
                style={styles.customerIconBtn}
                onPress={() => onOpenCustomer(customer)}
              >
                <Ionicons name="eye-outline" size={16} color="#2535c8" />
              </TouchableOpacity>
            </View>
          ))}
      </Card>
    </>
  );
}
