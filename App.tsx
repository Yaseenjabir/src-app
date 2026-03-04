import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";
import { useRef, useState } from "react";
import { Animated, ScrollView, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { BottomTabs } from "./src/components/BottomTabs";
import { CustomersScreen } from "./src/screens/CustomersScreen";
import { DashboardScreen } from "./src/screens/DashboardScreen";
import { InvoiceDetailScreen } from "./src/screens/InvoiceDetailScreen";
import { InvoicesScreen } from "./src/screens/InvoicesScreen";
import { NewInvoiceScreen } from "./src/screens/NewInvoiceScreen";
import { PaymentsScreen } from "./src/screens/PaymentsScreen";
import { ProductsScreen } from "./src/screens/ProductsScreen";
import { AppThemeProvider, useAppTheme } from "./src/theme/AppThemeContext";
import type { Page } from "./src/types/navigation";

export default function App() {
  return (
    <AppThemeProvider>
      <AppContent />
    </AppThemeProvider>
  );
}

function AppContent() {
  const [page, setPage] = useState<Page>("dashboard");
  const transition = useRef(new Animated.Value(1)).current;
  const { mode, styles, toggleMode } = useAppTheme();

  const handlePageChange = (nextPage: Page) => {
    if (nextPage === page) return;

    Animated.timing(transition, {
      toValue: 0,
      duration: 120,
      useNativeDriver: true,
    }).start(() => {
      setPage(nextPage);
      Animated.timing(transition, {
        toValue: 1,
        duration: 180,
        useNativeDriver: true,
      }).start();
    });
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <StatusBar style={mode === "dark" ? "light" : "dark"} />

      <Animated.View
        style={{
          flex: 1,
          opacity: transition,
          transform: [
            {
              translateY: transition.interpolate({
                inputRange: [0, 1],
                outputRange: [8, 0],
              }),
            },
          ],
        }}
      >
        <ScrollView
          style={styles.screen}
          contentContainerStyle={styles.screenContent}
        >
          {page === "dashboard" && <DashboardScreen onGo={handlePageChange} />}
          {page === "invoices" && <InvoicesScreen onGo={handlePageChange} />}
          {page === "invDetail" && (
            <InvoiceDetailScreen onBack={() => handlePageChange("invoices")} />
          )}
          {page === "newInvoice" && (
            <NewInvoiceScreen onBack={() => handlePageChange("dashboard")} />
          )}
          {page === "customers" && <CustomersScreen />}
          {page === "payments" && <PaymentsScreen />}
          {page === "products" && <ProductsScreen />}
        </ScrollView>
      </Animated.View>

      <TouchableOpacity style={styles.themeToggle} onPress={toggleMode}>
        <Ionicons
          name={mode === "dark" ? "sunny-outline" : "moon-outline"}
          size={20}
          color={mode === "dark" ? "#ffb020" : "#2535c8"}
        />
      </TouchableOpacity>

      <BottomTabs current={page} onGo={handlePageChange} />
    </SafeAreaView>
  );
}
