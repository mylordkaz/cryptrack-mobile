import { initDB } from "@/src/db/db";
import { initLocale, t } from "@/src/i18n";
import type { Locale } from "@/src/i18n";
import { LocaleProvider, useLocale } from "@/src/i18n/LocaleProvider";
import { ThemeProvider, useTheme } from "@/src/theme";
import { Stack, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Text, View, Pressable } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { Settings, ChevronLeft } from "lucide-react-native";
import { CurrencyProvider } from "@/src/currency";

function RootNavigator() {
  const { theme } = useTheme();
  const router = useRouter();
  const { t } = useLocale();

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
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="portfolio"
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
                accessibilityLabel={t("common.back")}
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
        options={({ route }) => ({
          headerTitleAlign: "center",
          headerBackVisible: false,
          headerTitle: () => {
            const params = route.params as { symbol?: string };
            const symbol = params?.symbol ?? "";
            return (
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
                  accessibilityLabel={t("common.back")}
                >
                  <ChevronLeft size={28} color={theme.text} />
                </Pressable>
                <Text
                  style={{ color: theme.text, fontSize: 17, fontWeight: "600" }}
                >
                  {symbol}
                </Text>
              </View>
            );
          },
        })}
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
                accessibilityLabel={t("common.back")}
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
  const [localeReady, setLocaleReady] = useState(false);
  const [initialLocale, setInitialLocale] = useState<Locale>("en");

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        await initDB();
        if (!cancelled) {
          setDbReady(true);
        }
      } catch (err) {
        if (!cancelled) {
          setDbError(err as Error);
        }
      }
    })();

    (async () => {
      try {
        const locale = await initLocale();
        if (!cancelled) {
          setInitialLocale(locale);
          setLocaleReady(true);
        }
      } catch {
        if (!cancelled) {
          setLocaleReady(true);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  if (dbError) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <Text>DB init failed: {dbError.message}</Text>
      </View>
    );
  }

  if (!dbReady || !localeReady) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <Text>{localeReady ? t("common.loading") : "Loading..."}</Text>
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider>
        <LocaleProvider initialLocale={initialLocale}>
          <CurrencyProvider>
            <RootNavigator />
          </CurrencyProvider>
        </LocaleProvider>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}
