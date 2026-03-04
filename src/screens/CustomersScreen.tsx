import { useEffect, useState } from "react";
import { Text, View } from "react-native";
import { listCustomersApi } from "../api/customers";
import { useAuth } from "../auth/AuthContext";
import { BoxIcon, Card, SimpleRow } from "../components/common";
import { useAppTheme } from "../theme/AppThemeContext";
import type { Customer } from "../types/entities";

export function CustomersScreen({ refreshTick = 0 }: { refreshTick?: number }) {
  const { styles } = useAppTheme();
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
        const response = await listCustomersApi(token);
        setItems(response.items);
      } catch {
        setError("Unable to load customers");
      } finally {
        setIsLoading(false);
      }
    };

    void load();
  }, [token, refreshTick]);

  return (
    <>
      <View style={styles.appBar}>
        <Text style={styles.title}>Customers</Text>
        <BoxIcon label="＋" red />
      </View>
      <Card>
        {isLoading ? (
          <View style={styles.listItem}>
            <Text style={styles.itemSub}>Loading customers...</Text>
          </View>
        ) : null}

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
            <SimpleRow
              key={customer._id}
              title={customer.shop_name || customer.name}
              sub={customer.address || customer.phone || "No details"}
              right={customer.phone || "—"}
              noBorder={index === items.length - 1}
            />
          ))}
      </Card>
    </>
  );
}
