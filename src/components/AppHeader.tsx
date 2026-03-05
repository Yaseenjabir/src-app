import { Ionicons } from "@expo/vector-icons";
import type { ReactNode } from "react";
import { Image, Text, TouchableOpacity, View } from "react-native";
import { useAuth } from "../auth/AuthContext";
import { useToast } from "../feedback/ToastContext";
import { useAppTheme } from "../theme/AppThemeContext";

export function AppHeader({ children }: { children?: ReactNode }) {
  const { styles, mode, toggleMode } = useAppTheme();
  const { logout } = useAuth();
  const { showToast } = useToast();

  const handleLogout = async () => {
    await logout();
    showToast("Logged out successfully.", "success");
  };

  return (
    <View style={styles.appBar}>
      <View style={styles.brandWrap}>
        <Image
          source={require("../../assets/logo.png")}
          style={styles.brandLogo}
          resizeMode="contain"
        />
        <View>
          <Text style={styles.title}>SRC</Text>
          <Text style={styles.subTitle}>Switch & Socket</Text>
        </View>
      </View>

      <View style={styles.row}>
        {children}
        <TouchableOpacity style={styles.boxIcon} onPress={toggleMode}>
          <Ionicons
            name={mode === "dark" ? "sunny-outline" : "moon-outline"}
            size={18}
            color={mode === "dark" ? "#ffb020" : "#2535c8"}
          />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.boxIcon, styles.boxIconRed]}
          onPress={() => void handleLogout()}
        >
          <Ionicons name="log-out-outline" size={18} color="#fff" />
        </TouchableOpacity>
      </View>
    </View>
  );
}
