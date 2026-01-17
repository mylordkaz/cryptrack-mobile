import { initDB } from "@/src/db/db";
import { ThemeProvider } from "@/src/theme";
import { Stack } from "expo-router";
import { useEffect, useState } from "react";
import { Text, View } from "react-native";
import { t } from "@/src/i18n";
import { GestureHandlerRootView } from "react-native-gesture-handler";

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
        <Stack screenOptions={{ headerBackTitleVisible: false }}>
          <Stack.Screen name="index" options={{ title: t("portfolio.title") }} />
          <Stack.Screen
            name="add-transaction"
            options={{ title: t("transaction.addTitle") }}
          />
          <Stack.Screen
            name="asset/[symbol]"
            options={{ title: t("assetDetail.title") }}
          />
        </Stack>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}
