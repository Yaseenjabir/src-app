import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import {
  ActivityIndicator,
  Image,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { ApiError } from "../api/http";
import { useAuth } from "../auth/AuthContext";
import { API_BASE_URL } from "../config/env";
import { useAppTheme } from "../theme/AppThemeContext";

export function LoginScreen() {
  const { styles } = useAppTheme();
  const { login, isLoggingIn, authError } = useAuth();
  const [email, setEmail] = useState("admin@example.com");
  const [password, setPassword] = useState("test12345");
  const [debugLogs, setDebugLogs] = useState<string[]>([
    `API: ${API_BASE_URL}`,
  ]);

  const pushLog = (line: string) => {
    const stamp = new Date().toLocaleTimeString();
    setDebugLogs((prev) => [`[${stamp}] ${line}`, ...prev].slice(0, 8));
  };

  const submit = async () => {
    pushLog(`Login attempt: ${email.trim()}`);

    try {
      await login(email.trim(), password);
      pushLog("Login success");
    } catch (error) {
      if (error instanceof ApiError) {
        pushLog(`Failed ${error.status} ${error.code}: ${error.message}`);
      } else if (error instanceof Error) {
        pushLog(`Failed: ${error.message}`);
      } else {
        pushLog("Failed: unknown error");
      }
    }
  };

  return (
    <View style={styles.loginContainer}>
      <View style={styles.loginHeader}>
        <Image
          source={require("../../assets/logo.png")}
          style={styles.loginLogo}
          resizeMode="contain"
        />
        <Text style={styles.loginTitle}>SRC Admin Login</Text>
        <Text style={styles.loginSubTitle}>Sign in to continue</Text>
      </View>

      <View style={styles.loginCard}>
        <Text style={styles.loginLabel}>Email</Text>
        <TextInput
          autoCapitalize="none"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
          placeholder="Enter email"
          placeholderTextColor="#9aa3b2"
          style={styles.loginInput}
          editable={!isLoggingIn}
        />

        <Text style={styles.loginLabel}>Password</Text>
        <TextInput
          value={password}
          onChangeText={setPassword}
          placeholder="Enter password"
          placeholderTextColor="#9aa3b2"
          secureTextEntry
          style={styles.loginInput}
          editable={!isLoggingIn}
        />

        {authError ? <Text style={styles.loginError}>{authError}</Text> : null}

        <TouchableOpacity
          onPress={submit}
          style={styles.loginButton}
          disabled={isLoggingIn}
        >
          {isLoggingIn ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons name="log-in-outline" size={17} color="#fff" />
              <Text style={styles.loginButtonText}>Login</Text>
            </>
          )}
        </TouchableOpacity>

        <View style={styles.loginDebugBox}>
          <Text style={styles.loginDebugTitle}>Debug Log</Text>
          <ScrollView style={{ maxHeight: 120 }}>
            {debugLogs.map((line, index) => (
              <Text key={`${index}-${line}`} style={styles.loginDebugText}>
                {line}
              </Text>
            ))}
          </ScrollView>
        </View>
      </View>
    </View>
  );
}
