import { Text, View } from "react-native";
import { BoxIcon, Card, SimpleRow } from "../components/common";
import { useAppTheme } from "../theme/AppThemeContext";

export function ProductsScreen() {
  const { styles } = useAppTheme();

  return (
    <>
      <View style={styles.appBar}>
        <Text style={styles.title}>Products</Text>
        <BoxIcon label="＋" red />
      </View>
      <Card>
        <SimpleRow title="3-Core Copper Wire" sub="SRC-W-001" right="PKR 85" />
        <SimpleRow
          title="MCB 32A Single Pole"
          sub="SRC-B-014"
          right="PKR 420"
        />
        <SimpleRow
          title="LED Bulb 18W"
          sub="SRC-L-007"
          right="PKR 320"
          noBorder
        />
      </Card>
    </>
  );
}
