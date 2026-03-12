import { StatusBar } from "expo-status-bar";
import { useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  RefreshControl,
  ScrollView,
  View,
} from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { AuthProvider, useAuth } from "./src/auth/AuthContext";
import { BottomTabs } from "./src/components/BottomTabs";
import { CustomersScreen } from "./src/screens/CustomersScreen";
import { DashboardScreen } from "./src/screens/DashboardScreen";
import { InvoiceDetailScreen } from "./src/screens/InvoiceDetailScreen";
import { InvoicesScreen } from "./src/screens/InvoicesScreen";
import { LedgerDetailScreen } from "./src/screens/LedgerDetailScreen";
import { LedgerScreen } from "./src/screens/LedgerScreen";
import { LoginScreen } from "./src/screens/LoginScreen";
import { NewInvoiceScreen } from "./src/screens/NewInvoiceScreen";
import { PaymentsScreen } from "./src/screens/PaymentsScreen";
import { ProductsScreen } from "./src/screens/ProductsScreen";
import { AppThemeProvider, useAppTheme } from "./src/theme/AppThemeContext";
import type { Page } from "./src/types/navigation";
import { ToastProvider } from "./src/feedback/ToastContext";
import type { Customer } from "./src/types/entities";

export default function App() {
  return (
    <SafeAreaProvider>
      <AppThemeProvider>
        <AuthProvider>
          <AppContent />
        </AuthProvider>
      </AppThemeProvider>
    </SafeAreaProvider>
  );
}

function AppContent() {
  const [page, setPage] = useState<Page>("dashboard");
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string | null>(
    null,
  );
  const [selectedLedgerCustomer, setSelectedLedgerCustomer] =
    useState<Customer | null>(null);
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

      <ToastProvider>
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
                  <DashboardScreen
                    onGo={handlePageChange}
                    refreshTick={refreshTick}
                  />
                )}
                {page === "invDetail" && (
                  <InvoiceDetailScreen
                    invoiceId={selectedInvoiceId}
                    onBack={() => handlePageChange("invoices")}
                    onInvoiceDeleted={() => {
                      setRefreshTick((prev) => prev + 1);
                      setSelectedInvoiceId(null);
                      handlePageChange("invoices");
                    }}
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
                    onOpenInvoice={(invoiceId) => {
                      setSelectedInvoiceId(invoiceId);
                      handlePageChange("invDetail");
                    }}
                    refreshTick={refreshTick}
                  />
                )}
                {page === "customers" && (
                  <CustomersScreen refreshTick={refreshTick} />
                )}
                {page === "ledger" && (
                  <LedgerScreen
                    refreshTick={refreshTick}
                    onOpenCustomer={(customer) => {
                      setSelectedLedgerCustomer(customer);
                      handlePageChange("ledgerDetail");
                    }}
                  />
                )}
                {page === "ledgerDetail" && (
                  <LedgerDetailScreen
                    customer={selectedLedgerCustomer}
                    onBack={() => handlePageChange("ledger")}
                    refreshTick={refreshTick}
                  />
                )}
                {page === "payments" && (
                  <PaymentsScreen refreshTick={refreshTick} />
                )}
                {page === "products" && (
                  <ProductsScreen refreshTick={refreshTick} />
                )}
              </ScrollView>
            </Animated.View>

            <BottomTabs current={page} onGo={handlePageChange} />
          </>
        ) : null}
      </ToastProvider>
    </SafeAreaView>
  );
}
