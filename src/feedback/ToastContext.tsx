import { Ionicons } from "@expo/vector-icons";
import type { ReactNode } from "react";
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from "react";
import { Animated, Platform, StatusBar, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAppTheme } from "../theme/AppThemeContext";

type ToastType = "success" | "error" | "info";

type ToastState = {
  type: ToastType;
  message: string;
};

type ToastContextValue = {
  showToast: (message: string, type?: ToastType, durationMs?: number) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const { styles } = useAppTheme();
  const insets = useSafeAreaInsets();
  const [toast, setToast] = useState<ToastState | null>(null);
  const translateY = useRef(new Animated.Value(-16)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const hideToast = useCallback(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 0,
        duration: 180,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: -16,
        duration: 180,
        useNativeDriver: true,
      }),
    ]).start(() => setToast(null));
  }, [opacity, translateY]);

  const showToast = useCallback(
    (message: string, type: ToastType = "info", durationMs = 2200) => {
      if (hideTimerRef.current) {
        clearTimeout(hideTimerRef.current);
      }

      setToast({ message, type });

      opacity.setValue(0);
      translateY.setValue(-16);

      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();

      hideTimerRef.current = setTimeout(() => {
        hideToast();
      }, durationMs);
    },
    [hideToast, opacity, translateY],
  );

  const value = useMemo<ToastContextValue>(() => ({ showToast }), [showToast]);

  const topInset =
    Platform.OS === "android"
      ? Math.max(insets.top, StatusBar.currentHeight ?? 0)
      : insets.top;

  return (
    <ToastContext.Provider value={value}>
      {children}
      {toast ? (
        <View
          pointerEvents="none"
          style={[styles.toastViewport, { top: topInset + 8 }]}
        >
          <Animated.View
            style={[
              styles.toastCard,
              toast.type === "success" && styles.toastCardSuccess,
              toast.type === "error" && styles.toastCardError,
              toast.type === "info" && styles.toastCardInfo,
              { opacity, transform: [{ translateY }] },
            ]}
          >
            <Ionicons
              name={
                toast.type === "success"
                  ? "checkmark-circle"
                  : toast.type === "error"
                    ? "close-circle"
                    : "information-circle"
              }
              size={16}
              color={
                toast.type === "success"
                  ? "#00c97a"
                  : toast.type === "error"
                    ? "#ff4d6a"
                    : "#7f8cff"
              }
            />
            <Text style={styles.toastText}>{toast.message}</Text>
          </Animated.View>
        </View>
      ) : null}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used inside ToastProvider");
  }

  return context;
}
