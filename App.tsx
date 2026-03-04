import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";
import { useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  RefreshControl,
  ScrollView,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { AuthProvider, useAuth } from "./src/auth/AuthContext";
import { BottomTabs } from "./src/components/BottomTabs";
import { CustomersScreen } from "./src/screens/CustomersScreen";
import { DashboardScreen } from "./src/screens/DashboardScreen";
import { InvoiceDetailScreen } from "./src/screens/InvoiceDetailScreen";
import { InvoicesScreen } from "./src/screens/InvoicesScreen";
import { LoginScreen } from "./src/screens/LoginScreen";
import { NewInvoiceScreen } from "./src/screens/NewInvoiceScreen";
import { PaymentsScreen } from "./src/screens/PaymentsScreen";
import { ProductsScreen } from "./src/screens/ProductsScreen";
import { AppThemeProvider, useAppTheme } from "./src/theme/AppThemeContext";
import type { Page } from "./src/types/navigation";

export default function App() {
  return (
    <AppThemeProvider>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </AppThemeProvider>
  );
}

function AppContent() {
  const [page, setPage] = useState<Page>("dashboard");
  const transition = useRef(new Animated.Value(1)).current;
  const { mode, styles, toggleMode } = useAppTheme();
  const { isBootstrapping, token, user } = useAuth();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshTick, setRefreshTick] = useState(0);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    setRefreshTick((prev) => prev + 1);

    // keep spinner visible briefly for smooth pull-to-refresh feedback
    await new Promise((resolve) => setTimeout(resolve, 700));
    setIsRefreshing(false);
  };

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

      {isBootstrapping ? (
        <View
          style={{
            flex: 1,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <ActivityIndicator size="large" color="#e8141c" />
        </View>
      ) : null}

      {!isBootstrapping && (!token || !user) ? <LoginScreen /> : null}

      {!isBootstrapping && token && user ? (
        <>
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
              refreshControl={
                <RefreshControl
                  refreshing={isRefreshing}
                  onRefresh={handleRefresh}
                />
              }
            >
              {page === "dashboard" && (
                <DashboardScreen onGo={handlePageChange} />
              )}
              {page === "invDetail" && (
                <InvoiceDetailScreen
                  onBack={() => handlePageChange("invoices")}
                />
              )}
              {page === "newInvoice" && (
                <NewInvoiceScreen
                  onBack={() => handlePageChange("dashboard")}
                  onCreated={() => {
                    setRefreshTick((prev) => prev + 1);
                    handlePageChange("invoices");
                  }}
                />
              )}
              {page === "invoices" && (
                <InvoicesScreen
                  onGo={handlePageChange}
                  refreshTick={refreshTick}
                />
              )}
              {page === "customers" && (
                <CustomersScreen refreshTick={refreshTick} />
              )}
              {page === "payments" && <PaymentsScreen />}
              {page === "products" && (
                <ProductsScreen refreshTick={refreshTick} />
              )}
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
        </>
      ) : null}
    </SafeAreaView>
  );
}
