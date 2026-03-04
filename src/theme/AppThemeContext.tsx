import type { ReactNode } from "react";
import { createContext, useContext, useEffect, useMemo, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { StyleProp, TextStyle } from "react-native";
import {
  type AppStyles,
  createAppStyles,
  getBadgeStyle,
  type ThemeMode,
} from "../styles/appStyles";

type AppThemeContextValue = {
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
  toggleMode: () => void;
  styles: AppStyles;
  badgeStyle: (status: string) => StyleProp<TextStyle>;
};

const AppThemeContext = createContext<AppThemeContextValue | null>(null);
const THEME_STORAGE_KEY = "src_mobile_theme_mode";

export function AppThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>("dark");

  useEffect(() => {
    const loadStoredMode = async () => {
      try {
        const stored = await AsyncStorage.getItem(THEME_STORAGE_KEY);
        if (stored === "dark" || stored === "light") {
          setModeState(stored);
        }
      } catch {
        // ignore storage read errors and fallback to default mode
      }
    };

    void loadStoredMode();
  }, []);

  const setMode = (nextMode: ThemeMode) => {
    setModeState(nextMode);
    void AsyncStorage.setItem(THEME_STORAGE_KEY, nextMode);
  };

  const toggleMode = () => {
    const nextMode: ThemeMode = mode === "dark" ? "light" : "dark";
    setMode(nextMode);
  };

  const styles = useMemo(() => createAppStyles(mode), [mode]);

  const value = useMemo<AppThemeContextValue>(
    () => ({
      mode,
      setMode,
      toggleMode,
      styles,
      badgeStyle: (status: string) => getBadgeStyle(styles, status),
    }),
    [mode, styles],
  );

  return (
    <AppThemeContext.Provider value={value}>
      {children}
    </AppThemeContext.Provider>
  );
}

export function useAppTheme() {
  const context = useContext(AppThemeContext);
  if (!context) {
    throw new Error("useAppTheme must be used inside AppThemeProvider");
  }

  return context;
}
