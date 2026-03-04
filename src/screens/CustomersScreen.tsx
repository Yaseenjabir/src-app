import { Text, View } from "react-native";
import { BoxIcon, Card, SimpleRow } from "../components/common";
import { useAppTheme } from "../theme/AppThemeContext";

export function CustomersScreen() {
  const { styles } = useAppTheme();

  return (
    <>
      <View style={styles.appBar}>
        <Text style={styles.title}>Customers</Text>
        <BoxIcon label="＋" red />
      </View>
      <Card>
        <SimpleRow
          title="Ahmad Electronics"
          sub="Main Bazaar · 14 invoices"
          right="PKR 18,500"
        />
        <SimpleRow
          title="Zahid Traders"
          sub="Saddar · 8 invoices"
          right="PKR 8,200"
        />
        <SimpleRow
          title="Raza Stores"
          sub="Civil Lines · 21 invoices"
          right="PKR 0"
          noBorder
        />
      </Card>
    </>
  );
}
