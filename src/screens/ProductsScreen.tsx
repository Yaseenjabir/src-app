import { useEffect, useState } from "react";
import { Text, View } from "react-native";
import { listProductsApi } from "../api/products";
import { useAuth } from "../auth/AuthContext";
import { BoxIcon, Card, SimpleRow } from "../components/common";
import { useAppTheme } from "../theme/AppThemeContext";
import type { Product } from "../types/entities";
import { formatMoney } from "../utils/format";

export function ProductsScreen({ refreshTick = 0 }: { refreshTick?: number }) {
  const { styles } = useAppTheme();
  const { token } = useAuth();
  const [items, setItems] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
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
    };

    void load();
  }, [token, refreshTick]);

  return (
    <>
      <View style={styles.appBar}>
        <Text style={styles.title}>Products</Text>
        <BoxIcon label="＋" red />
      </View>
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
            <SimpleRow
              key={product._id}
              title={product.name}
              sub={`${product.sku} · ${product.category}`}
              right={formatMoney(product.price)}
              noBorder={index === items.length - 1}
            />
          ))}
      </Card>
    </>
  );
}
