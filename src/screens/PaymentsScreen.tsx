import { Text, View } from "react-native";
import { BoxIcon, Card, SimpleRow } from "../components/common";
import { useAppTheme } from "../theme/AppThemeContext";

export function PaymentsScreen() {
  const { styles } = useAppTheme();

  return (
    <>
      <View style={styles.appBar}>
        <Text style={styles.title}>Payments</Text>
        <BoxIcon label="＋" red />
      </View>
      <Card>
        <SimpleRow
          title="Ahmad Electronics"
          sub="#INV-0040"
          right="+ PKR 8,800"
        />
        <SimpleRow title="Zahid Traders" sub="#INV-0041" right="+ PKR 5,000" />
        <SimpleRow
          title="M. Khan & Sons"
          sub="#INV-0039"
          right="+ PKR 10,200"
          noBorder
        />
      </Card>
    </>
  );
}
