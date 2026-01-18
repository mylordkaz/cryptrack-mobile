import {
  ScrollView,
  View,
  Text,
  Button,
  Pressable,
  Alert,
} from "react-native";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocalSearchParams } from "expo-router";
import { useRouter } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import { useTheme } from "@/src/theme";
import { t } from "@/src/i18n";
import { useAssetDetail } from "@/src/hooks/useAssetDetail";
import { useCoins } from "@/src/hooks/useCoins";
import {
  formatFiat,
  formatAmount,
} from "@/src/utils/format";
import { deleteTransaction } from "@/src/db/transactions";
import { Transaction } from "@/src/types/transaction";
import { TransactionDetailsBottomSheet } from "@/components/TransactionDetailsBottomSheet";
import { computeTransactionDetails } from "@/src/math/transactionMath";

export default function AssetDetailScreen() {
  const { symbol } = useLocalSearchParams<{ symbol: string }>();
  const { theme } = useTheme();
  const router = useRouter();
  const [refreshKey, setRefreshKey] = useState(0);
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);
  const isFirstFocus = useRef(true);

  const { priceMap, loading: pricesLoading } = useCoins();
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

  useEffect(() => {
    if (!loading && data && data.transactionCount === 0) {
      router.back();
    }
  }, [data, loading, router]);

  if (!symbol) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.bg, padding: 16 }}>
        <Text style={{ color: theme.text }}>
          {t("common.error")}: missing symbol
        </Text>
      </View>
    );
  }

  if (loading || pricesLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.bg, padding: 16 }}>
        <Text style={{ color: theme.text }}>{t("common.loading")}</Text>
      </View>
    );
  }

  if (error || !data) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.bg, padding: 16 }}>
        <Text style={{ color: theme.text }}>
          {t("common.error")}: {error?.message ?? "unknown"}
        </Text>
      </View>
    );
  }

  const hasPrice = data.currentPrice !== null;
  const currentValue = hasPrice
    ? data.metrics.amountHeld * (data.currentPrice ?? 0)
    : null;

  const unrealizedPnLPercent =
    hasPrice && data.metrics.avgBuyPrice && data.metrics.avgBuyPrice > 0
      ? ((data.currentPrice ?? 0) - data.metrics.avgBuyPrice) /
          data.metrics.avgBuyPrice *
          100
      : null;

  const transactionDetails = useMemo(() => {
    if (!selectedTx) {
      return { costBasis: null, currentValue: null };
    }
    return computeTransactionDetails(selectedTx, data.currentPrice);
  }, [selectedTx, data.currentPrice]);

  const onDelete = useCallback(() => {
    if (!selectedTx) return;

    Alert.alert(
      t("transaction.deleteTitle"),
      t("transaction.deleteConfirm"),
      [
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
      ],
    );
  }, [selectedTx]);

  return (
    <ScrollView style={{ flex: 1, backgroundColor: theme.bg }}>
      {/* Top Section */}
      <View style={{ padding: 16, alignItems: "center" }}>
        {/* Symbol - Centered */}
        <Text style={{ color: theme.text, fontSize: 28, fontWeight: "600", marginBottom: 8 }}>
          {symbol}
        </Text>

        {/* Current Price - Centered */}
        <Text style={{ color: theme.muted, fontSize: 16, marginBottom: 20 }}>
          {hasPrice ? formatFiat(data.currentPrice ?? 0) : "-"}
        </Text>

        {/* Amount / Value Box - Centered */}
        <View
          style={{
            borderWidth: 1,
            borderColor: theme.muted,
            borderRadius: 8,
            paddingVertical: 12,
            paddingHorizontal: 20,
            marginBottom: 20,
          }}
        >
          <Text style={{ color: theme.text, fontSize: 16, textAlign: "center" }}>
            {formatAmount(data.metrics.amountHeld, 6)} {symbol} / {hasPrice && currentValue !== null ? formatFiat(currentValue) : "-"}
          </Text>
        </View>

        {/* Metrics Row */}
        <View style={{ width: "100%", marginBottom: 16 }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 8 }}>
            <Text style={{ color: theme.muted }}>{t("assetDetail.avgBuyPrice")}</Text>
            <Text style={{ color: theme.text }}>
              {data.metrics.avgBuyPrice !== null ? formatFiat(data.metrics.avgBuyPrice) : "-"}
            </Text>
          </View>

          <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 8 }}>
            <Text style={{ color: theme.muted }}>{t("assetDetail.unrealizedPnL")}</Text>
            <Text
              style={{
                color: hasPrice
                  ? data.metrics.unrealizedPnL >= 0
                    ? theme.gain
                    : theme.loss
                  : theme.text,
              }}
            >
              {hasPrice ? formatFiat(data.metrics.unrealizedPnL) : "-"}
              {hasPrice && unrealizedPnLPercent !== null && ` (${unrealizedPnLPercent.toFixed(2)}%)`}
            </Text>
          </View>

          <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
            <Text style={{ color: theme.muted }}>{t("assetDetail.totalInvested")}</Text>
            <Text style={{ color: theme.text }}>
              {formatFiat(data.metrics.investedFiat)}
            </Text>
          </View>
        </View>

        {/* Add Transaction Button */}
        <View style={{ width: "100%" }}>
          <Button
            title={t("common.addTransaction")}
            onPress={() =>
              router.push({
                pathname: "/add-transaction",
                params: { symbol },
              })
            }
          />
        </View>
      </View>

      {/* Transactions Section */}
      <View style={{ padding: 16 }}>
        <Text style={{ color: theme.text, fontSize: 18, marginBottom: 8 }}>
          {t("assetDetail.transactions")}
        </Text>

        {data.transactions.map((tx) => (
          <Pressable
            key={tx.id}
            onPress={() => setSelectedTx(tx)}
            style={{
              paddingVertical: 12,
              borderBottomWidth: 1,
              borderBottomColor: theme.muted,
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: "row", alignItems: "baseline", marginBottom: 4 }}>
                <Text style={{ color: theme.muted, fontSize: 12 }}>
                  {new Intl.DateTimeFormat("en-US", {
                    year: "numeric",
                    month: "short",
                    day: "2-digit",
                  }).format(new Date(tx.timestamp))}
                </Text>
                <Text style={{ color: theme.muted, fontSize: 10, marginLeft: 4 }}>
                  {new Intl.DateTimeFormat("en-US", {
                    hour: "2-digit",
                    minute: "2-digit",
                  }).format(new Date(tx.timestamp))}
                </Text>
              </View>
              <Text
                style={{
                  color: tx.type === "BUY" ? theme.gain : theme.loss,
                  fontSize: 14,
                  fontWeight: "600",
                }}
              >
                {tx.type}
              </Text>
            </View>

            <View style={{ alignItems: "flex-end" }}>
              <Text style={{ color: theme.text, fontSize: 16, marginBottom: 4 }}>
                {formatAmount(Math.abs(tx.amount), 6)} {symbol}
              </Text>
              <Text style={{ color: theme.muted, fontSize: 14 }}>
                {formatFiat(Math.abs(tx.total_fiat))}
              </Text>
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
