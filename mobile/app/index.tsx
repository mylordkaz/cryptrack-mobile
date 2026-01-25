import { View, StyleSheet, ActivityIndicator } from "react-native";
import { ScrollView } from "react-native-gesture-handler";
import { usePortfolioMetrics } from "../src/hooks/usePortfolioMetrics";
import { useCoins } from "@/src/hooks/useCoins";
import { useTheme, spacing } from "@/src/theme";
import { t } from "@/src/i18n";
import { PortfolioTopSection } from "@/components/PortfolioTopSection";
import { PortfolioChart } from "@/components/PortfolioChart";
import { AssetList } from "@/components/AssetList";
import { useRouter } from "expo-router";
import { Button, Body, Headline, Caption } from "@/components/ui";
import { AlertCircle, Wallet } from "lucide-react-native";
import { useFocusEffect } from "@react-navigation/native";
import { useCallback, useRef, useState } from "react";

export default function PortfolioRecapScreen() {
  const { theme } = useTheme();
  const [refreshKey, setRefreshKey] = useState(0);
  const [displayedValue, setDisplayedValue] = useState<number | null>(null);
  const isFirstFocus = useRef(true);
  const { priceMap, loading: pricesLoading } = useCoins();
  const { portfolio, loading, error } = usePortfolioMetrics(priceMap, refreshKey);
  const router = useRouter();

  useFocusEffect(
    useCallback(() => {
      if (isFirstFocus.current) {
        isFirstFocus.current = false;
        return;
      }
      setRefreshKey((prev) => prev + 1);
    }, []),
  );

  if (loading || pricesLoading) {
    return (
      <View style={[styles.centerContainer, { backgroundColor: theme.bg }]}>
        <ActivityIndicator size="large" color={theme.accent} />
        <Caption style={styles.loadingText}>{t("common.loading")}</Caption>
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.centerContainer, { backgroundColor: theme.bg }]}>
        <AlertCircle size={48} color={theme.loss} />
        <Body style={styles.errorText}>
          {t("common.error")}: {error.message}
        </Body>
      </View>
    );
  }

  if (!portfolio || portfolio.assets.length === 0) {
    return (
      <View style={[styles.centerContainer, { backgroundColor: theme.bg }]}>
        <View
          style={[
            styles.emptyIconContainer,
            { backgroundColor: theme.accent + "15" },
          ]}
        >
          <Wallet size={48} color={theme.accent} />
        </View>
        <Headline style={styles.emptyTitle}>
          {t("portfolio.emptyState")}
        </Headline>
        <Caption style={styles.emptySubtitle}>
          {t("portfolio.emptyStateSubtitle")}
        </Caption>
        <Button
          title={t("portfolio.addFirstTransaction")}
          onPress={() => router.push("/add-transaction")}
          style={styles.emptyButton}
        />
      </View>
    );
  }

  return (
    <ScrollView
      style={[styles.scroll, { backgroundColor: theme.bg }]}
      contentContainerStyle={styles.scrollContent}
    >
      <PortfolioTopSection
        totalValue={displayedValue ?? portfolio.totalValue}
        totalInvested={portfolio.totalInvested}
        totalPnL={portfolio.totalPnL}
        totalPnLPercentage={portfolio.totalPnLPercentage}
        theme={theme}
      />

      <PortfolioChart
        assets={portfolio.assets}
        onValueChange={setDisplayedValue}
      />

      <AssetList assets={portfolio.assets} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: spacing.xl,
  },
  loadingText: {
    marginTop: spacing.lg,
  },
  errorText: {
    marginTop: spacing.lg,
    textAlign: "center",
  },
  emptyIconContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: spacing.xl,
  },
  emptyTitle: {
    textAlign: "center",
    marginBottom: spacing.sm,
  },
  emptySubtitle: {
    textAlign: "center",
    marginBottom: spacing.xl,
  },
  emptyButton: {
    minWidth: 200,
  },
});
