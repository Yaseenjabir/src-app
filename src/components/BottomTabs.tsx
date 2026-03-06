import { Ionicons } from "@expo/vector-icons";
import {
  Text,
  TouchableOpacity,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import type { Page } from "../types/navigation";
import { useAppTheme } from "../theme/AppThemeContext";

export function BottomTabs({
  current,
  onGo,
}: {
  current: Page;
  onGo: (p: Page) => void;
}) {
  const { mode, styles } = useAppTheme();

  return (
    <View style={styles.tabBar}>
      <Tab
        label="Home"
        icon="home"
        iconOutline="home-outline"
        active={current === "dashboard"}
        onPress={() => onGo("dashboard")}
        style={styles.homeTabAdjust}
      />
      <Tab
        label="Products"
        icon="cube"
        iconOutline="cube-outline"
        active={current === "products"}
        onPress={() => onGo("products")}
      />
      <Tab
        label="Customers"
        icon="people"
        iconOutline="people-outline"
        active={current === "customers"}
        onPress={() => onGo("customers")}
      />
      <View style={styles.centerTabSlot}>
        <TouchableOpacity
          style={styles.centerTab}
          onPress={() => onGo("newInvoice")}
        >
          <Text style={{ color: "white", fontSize: 10, marginTop: -1 }}>
            ＋
          </Text>
        </TouchableOpacity>
      </View>
      <Tab
        label="Invoices"
        icon="document-text"
        iconOutline="document-text-outline"
        active={current === "invoices"}
        onPress={() => onGo("invoices")}
      />
      <Tab
        label="Payments"
        icon="card"
        iconOutline="card-outline"
        active={current === "payments" || current === "payDetail"}
        onPress={() => onGo("payments")}
      />
      <Tab
        label="Ledger"
        icon="book"
        iconOutline="book-outline"
        active={current === "ledger" || current === "ledgerDetail"}
        onPress={() => onGo("ledger")}
      />
    </View>
  );
}

function Tab({
  label,
  icon,
  iconOutline,
  active,
  onPress,
  style,
}: {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  iconOutline: keyof typeof Ionicons.glyphMap;
  active: boolean;
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
}) {
  const { mode, styles } = useAppTheme();

  return (
    <TouchableOpacity style={[styles.tab, style]} onPress={onPress}>
      <Ionicons
        name={active ? icon : iconOutline}
        size={18}
        color={active ? "#e8141c" : mode === "dark" ? "#44445a" : "#7a8499"}
        style={styles.tabIcon}
      />
      <Text style={[styles.tabText, active && styles.tabActive]}>{label}</Text>
    </TouchableOpacity>
  );
}
