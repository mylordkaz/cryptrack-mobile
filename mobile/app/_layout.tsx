import { initDB } from "@/src/db/db";
import { ThemeProvider, useTheme } from "@/src/theme";
import { Stack, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Text, View, Pressable } from "react-native";
import { t } from "@/src/i18n";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { Settings, ChevronLeft } from "lucide-react-native";

function RootNavigator() {
  const { theme } = useTheme();
  const router = useRouter();

  return (
    <Stack
      screenOptions={{
        headerStyle: {
          backgroundColor: theme.bg,
        },
        headerTintColor: theme.text,
        headerShadowVisible: false,
      }}
    >
      <Stack.Screen
        name="index"
        options={{
          headerTitleAlign: "center",
          headerTitle: () => (
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                width: "100%",
              }}
            >
              <Text
                style={{ color: theme.text, fontSize: 17, fontWeight: "600" }}
              >
                {t("portfolio.title")}
              </Text>
              <Pressable
                onPress={() => router.push("/settings")}
                hitSlop={8}
                style={{ position: "absolute", right: 0 }}
                accessibilityRole="button"
                accessibilityLabel={t("settings.title")}
              >
                <Settings size={24} color={theme.text} />
              </Pressable>
            </View>
          ),
        }}
      />
      <Stack.Screen
        name="add-transaction"
        options={{
          headerTitleAlign: "center",
          headerBackVisible: false,
          headerTitle: () => (
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                width: "100%",
              }}
            >
              <Pressable
                onPress={() => router.back()}
                hitSlop={8}
                style={{ position: "absolute", left: 0 }}
                accessibilityRole="button"
                accessibilityLabel="Go back"
              >
                <ChevronLeft size={28} color={theme.text} />
              </Pressable>
              <Text
                style={{ color: theme.text, fontSize: 17, fontWeight: "600" }}
              >
                {t("transaction.addTitle")}
              </Text>
            </View>
          ),
        }}
      />
      <Stack.Screen
        name="asset/[symbol]"
        options={{
          headerTitleAlign: "center",
          headerBackVisible: false,
          headerTitle: () => (
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                width: "100%",
              }}
            >
              <Pressable
                onPress={() => router.back()}
                hitSlop={8}
                style={{ position: "absolute", left: 0 }}
                accessibilityRole="button"
                accessibilityLabel="Go back"
              >
                <ChevronLeft size={28} color={theme.text} />
              </Pressable>
              <Text
                style={{ color: theme.text, fontSize: 17, fontWeight: "600" }}
              >
                {t("assetDetail.title")}
              </Text>
            </View>
          ),
        }}
      />
      <Stack.Screen
        name="settings"
        options={{
          headerTitleAlign: "center",
          headerBackVisible: false,
          headerTitle: () => (
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                width: "100%",
              }}
            >
              <Pressable
                onPress={() => router.back()}
                hitSlop={8}
                style={{ position: "absolute", left: 0 }}
                accessibilityRole="button"
                accessibilityLabel="Go back"
              >
                <ChevronLeft size={28} color={theme.text} />
              </Pressable>
              <Text
                style={{ color: theme.text, fontSize: 17, fontWeight: "600" }}
              >
                {t("settings.title")}
              </Text>
            </View>
          ),
        }}
      />
    </Stack>
  );
}

export default function RootLayout() {
  const [dbReady, setDbReady] = useState(false);
  const [dbError, setDbError] = useState<Error | null>(null);

  useEffect(() => {
    (async () => {
      try {
        await initDB();
        setDbReady(true);
      } catch (err) {
        setDbError(err as Error);
      }
    })();
  }, []);

  if (dbError) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <Text>DB init failed: {dbError.message}</Text>
      </View>
    );
  }

  if (!dbReady) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <Text>Loading...</Text>
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider>
        <RootNavigator />
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}
