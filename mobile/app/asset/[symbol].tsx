import {
  ScrollView,
  View,
  Text,
  Pressable,
  Alert,
  StyleSheet,
} from "react-native";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocalSearchParams, useNavigation, useRouter } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import { useTheme, spacing, radius } from "@/src/theme";
import { useLocale } from "@/src/i18n/LocaleProvider";
import { useAssetDetail } from "@/src/hooks/useAssetDetail";
import { useCoins } from "@/src/hooks/useCoins";
import {
  formatFiat,
  formatAmount,
  formatDateOnly,
  formatTimeOnly,
} from "@/src/utils/format";
import { deleteTransaction } from "@/src/db/transactions";
import { Transaction } from "@/src/types/transaction";
import { TransactionDetailsBottomSheet } from "@/components/TransactionDetailsBottomSheet";
import { computeTransactionDetails } from "@/src/math/transactionMath";
import { getCoinBySymbol, CoinMetadata } from "@/src/db/coins";
import { ChevronLeft, Plus } from "lucide-react-native";
import { Image } from "expo-image";
import { Body, Caption, Headline } from "@/components/ui";

export default function AssetDetailScreen() {
  const { symbol } = useLocalSearchParams<{ symbol: string }>();
  const { theme, isDark } = useTheme();
  const { t } = useLocale();
  const router = useRouter();
  const navigation = useNavigation();
  const [refreshKey, setRefreshKey] = useState(0);
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);
  const [coinMetadata, setCoinMetadata] = useState<CoinMetadata | null>(null);
  const isFirstFocus = useRef(true);

  const { priceMap, loading: pricesLoading } = useCoins(refreshKey);
  const { data, loading, error } = useAssetDetail(
    symbol ?? "",
    priceMap,
    refreshKey,
  );

  useFocusEffect(
    useCallback(() => {
      if (isFirstFocus.current) {
        isFirstFocus.current = false;
        return;
      }
      setRefreshKey((prev) => prev + 1);
    }, []),
  );

  // Fetch coin metadata for header and logo
  useEffect(() => {
    if (!symbol) return;

    let isActive = true;

    const setHeaderTitle = (displayName: string) => {
      navigation.setOptions({
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
              {displayName}
            </Text>
          </View>
        ),
      });
    };

    (async () => {
      try {
        const coin = await getCoinBySymbol(symbol);
        if (!isActive) return;
        setCoinMetadata(coin);
        const displayName = coin?.name ?? symbol;
        setHeaderTitle(displayName);
      } catch {
        if (!isActive) return;
        setCoinMetadata(null);
        setHeaderTitle(symbol);
      }
    })();

    return () => {
      isActive = false;
    };
  }, [symbol, theme.text, navigation, router]);

  useEffect(() => {
    if (!loading && data && data.transactionCount === 0) {
      router.back();
    }
  }, [data, loading, router]);

  const currentPriceForDetails = data?.currentPrice ?? null;
  const transactionDetails = useMemo(() => {
    if (!selectedTx) {
      return { costBasis: null, currentValue: null };
    }
    return computeTransactionDetails(selectedTx, currentPriceForDetails);
  }, [selectedTx, currentPriceForDetails]);

  const onDelete = useCallback(() => {
    if (!selectedTx) return;

    Alert.alert(t("transaction.deleteTitle"), t("transaction.deleteConfirm"), [
      { text: t("common.cancel"), style: "cancel" },
      {
        text: t("transaction.delete"),
        style: "destructive",
        onPress: async () => {
          await deleteTransaction(selectedTx.id);
          setSelectedTx(null);
          setRefreshKey((prev) => prev + 1);
        },
      },
    ]);
  }, [selectedTx]);

  if (!symbol) {
    return (
      <View style={[styles.centerContainer, { backgroundColor: theme.bg }]}>
        <Body>{t("common.error")}: missing symbol</Body>
      </View>
    );
  }

  if (loading || pricesLoading) {
    return (
      <View style={[styles.centerContainer, { backgroundColor: theme.bg }]}>
        <Caption>{t("common.loading")}</Caption>
      </View>
    );
  }

  if (error || !data) {
    return (
      <View style={[styles.centerContainer, { backgroundColor: theme.bg }]}>
        <Body>
          {t("common.error")}: {error?.message ?? "unknown"}
        </Body>
      </View>
    );
  }

  const hasPrice = data.currentPrice !== null;
  const currentValue = hasPrice
    ? data.metrics.amountHeld * (data.currentPrice ?? 0)
    : null;

  const unrealizedPnLPercent =
    hasPrice && data.metrics.avgBuyPrice && data.metrics.avgBuyPrice > 0
      ? (((data.currentPrice ?? 0) - data.metrics.avgBuyPrice) /
          data.metrics.avgBuyPrice) *
        100
      : null;

  return (
    <ScrollView style={[styles.scroll, { backgroundColor: theme.bg }]}>
      {/* Top Section */}
      <View style={styles.topSection}>
        {/* Coin Logo - Centered */}
        {coinMetadata?.image_url ? (
          <Image
            source={{ uri: coinMetadata.image_url }}
            style={styles.coinImage}
            contentFit="contain"
            cachePolicy="disk"
          />
        ) : (
          <View
            style={[
              styles.coinImageFallback,
              { backgroundColor: theme.accent + "20" },
            ]}
          >
            <Text style={[styles.coinImageLetter, { color: theme.accent }]}>
              {symbol?.charAt(0)}
            </Text>
          </View>
        )}

        {/* Current Price */}
        <Caption style={styles.priceText}>
          {hasPrice ? formatFiat(data.currentPrice ?? 0) : "-"}
        </Caption>

        {/* Amount / Value Card */}
        <View
          style={[
            styles.amountCard,
            { backgroundColor: theme.surface, borderColor: theme.border },
          ]}
        >
          <View style={styles.amountCardColumn}>
            <Headline color="accent" style={styles.amountCardValue}>
              {formatAmount(data.metrics.amountHeld, 6)}
            </Headline>
            <Caption style={styles.amountCardLabel}>{symbol}</Caption>
          </View>

          <View style={[styles.separator, { backgroundColor: theme.border }]} />

          <View style={styles.amountCardColumn}>
            <Headline style={styles.amountCardValue}>
              {hasPrice && currentValue !== null
                ? formatFiat(currentValue)
                : "-"}
            </Headline>
            <Caption style={styles.amountCardLabel}>
              {t("portfolio.currentValue")}
            </Caption>
          </View>
        </View>

        {/* Metrics Row */}
        <View style={styles.metricsContainer}>
          <View style={styles.metricRow}>
            <Caption>{t("assetDetail.avgBuyPrice")}</Caption>
            <Body>
              {data.metrics.avgBuyPrice !== null
                ? formatFiat(data.metrics.avgBuyPrice)
                : "-"}
            </Body>
          </View>

          <View style={styles.metricRow}>
            <Caption>{t("assetDetail.unrealizedPnL")}</Caption>
            <Body
              color={
                hasPrice
                  ? data.metrics.unrealizedPnL >= 0
                    ? "gain"
                    : "loss"
                  : "primary"
              }
              style={
                isDark && hasPrice
                  ? {
                      textShadowColor:
                        data.metrics.unrealizedPnL >= 0
                          ? theme.gain
                          : theme.loss,
                      textShadowOffset: { width: 0, height: 0 },
                      textShadowRadius: 8,
                    }
                  : undefined
              }
            >
              {hasPrice ? formatFiat(data.metrics.unrealizedPnL) : "-"}
              {hasPrice &&
                unrealizedPnLPercent !== null &&
                ` (${unrealizedPnLPercent.toFixed(2)}%)`}
            </Body>
          </View>

          <View style={styles.metricRow}>
            <Caption>{t("assetDetail.totalInvested")}</Caption>
            <Body>{formatFiat(data.metrics.investedFiat)}</Body>
          </View>
        </View>
      </View>

      {/* Transactions Section */}
      <View style={styles.transactionsSection}>
        <View style={styles.transactionsHeader}>
          <Headline>{t("assetDetail.transactions")}</Headline>
          <Pressable
            onPress={() =>
              router.push({
                pathname: "/add-transaction",
                params: { symbol },
              })
            }
            style={({ pressed }) => [
              styles.addButton,
              {
                backgroundColor: theme.accent,
                opacity: pressed ? 0.7 : 1,
                shadowColor: theme.accent,
              },
            ]}
          >
            <Plus size={20} color={isDark ? "#000000" : "#FFFFFF"} />
          </Pressable>
        </View>

        {data.transactions.map((tx) => (
          <Pressable
            key={tx.id}
            onPress={() => setSelectedTx(tx)}
            style={({ pressed }) => [
              styles.transactionRow,
              { borderBottomColor: theme.border, opacity: pressed ? 0.7 : 1 },
            ]}
          >
            <View style={styles.transactionLeft}>
              <View style={styles.transactionDateRow}>
                <Caption style={styles.transactionDate}>
                  {formatDateOnly(tx.timestamp)}
                </Caption>
                <Caption style={styles.transactionTime}>
                  {formatTimeOnly(tx.timestamp)}
                </Caption>
              </View>
              <Body
                color={tx.type === "BUY" ? "gain" : "loss"}
                style={[
                  styles.transactionType,
                  isDark && {
                    textShadowColor:
                      tx.type === "BUY" ? theme.gain : theme.loss,
                    textShadowOffset: { width: 0, height: 0 },
                    textShadowRadius: 8,
                  },
                ]}
              >
                {tx.type === "BUY"
                  ? t("transaction.buy")
                  : t("transaction.sell")}
              </Body>
            </View>

            <View style={styles.transactionRight}>
              <Body style={styles.transactionAmount}>
                {formatAmount(Math.abs(tx.amount), 6)} {symbol}
              </Body>
              <Caption style={styles.transactionFiat}>
                {formatFiat(Math.abs(tx.total_fiat))}
              </Caption>
            </View>
          </Pressable>
        ))}
      </View>

      <TransactionDetailsBottomSheet
        visible={selectedTx !== null}
        transaction={selectedTx}
        symbol={symbol}
        theme={theme}
        costBasis={transactionDetails.costBasis}
        currentValue={transactionDetails.currentValue}
        onClose={() => setSelectedTx(null)}
        onEdit={() => {
          const txId = selectedTx?.id;
          setSelectedTx(null);
          if (txId) {
            router.push({
              pathname: "/add-transaction",
              params: { id: txId },
            });
          }
        }}
        onDelete={onDelete}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: spacing.xl,
  },
  topSection: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: spacing.xxl,
    alignItems: "center",
  },
  coinImage: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginBottom: spacing.md,
  },
  coinImageFallback: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.md,
  },
  coinImageLetter: {
    fontSize: 24,
    fontWeight: "600",
  },
  priceText: {
    marginBottom: spacing.lg,
  },
  amountCard: {
    flexDirection: "row",
    borderWidth: 1,
    borderRadius: spacing.sm,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.xl,
    alignSelf: "center",
  },
  amountCardColumn: {
    width: 140,
    alignItems: "center",
    paddingHorizontal: spacing.md,
  },
  amountCardValue: {
    marginBottom: spacing.xs,
  },
  amountCardLabel: {
    textAlign: "center",
  },
  separator: {
    width: 1,
    alignSelf: "stretch",
  },
  metricsContainer: {
    width: "100%",
    gap: spacing.md,
    marginBottom: spacing.xl,
  },
  metricRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  transactionsSection: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  transactionsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.lg,
  },
  addButton: {
    width: 32,
    height: 32,
    borderRadius: radius.full,
    justifyContent: "center",
    alignItems: "center",
    shadowOpacity: 0.4,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 0 },
    elevation: 6,
  },
  transactionRow: {
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  transactionLeft: {
    flex: 1,
  },
  transactionDateRow: {
    flexDirection: "row",
    alignItems: "baseline",
    marginBottom: spacing.xs,
  },
  transactionDate: {
    marginRight: spacing.xs,
  },
  transactionTime: {
    fontSize: 10,
  },
  transactionType: {
    fontWeight: "600",
  },
  transactionRight: {
    alignItems: "flex-end",
  },
  transactionAmount: {
    marginBottom: spacing.xs,
  },
  transactionFiat: {},
});
