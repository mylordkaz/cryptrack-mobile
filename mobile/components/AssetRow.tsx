import { View, Pressable, StyleSheet } from "react-native";
import { Image } from "expo-image";
import { AssetWithMetrics } from "@/src/math/types";
import { useTheme, spacing, radius } from "@/src/theme";
import { formatFiat, formatAmount } from "@/src/utils/format";
import { useRouter } from "expo-router";
import { Headline, Caption, BodyMedium } from "./ui";

interface AssetRowProps {
  asset: AssetWithMetrics;
  imageUrl?: string;
  isLast?: boolean;
}

export function AssetRow({ asset, imageUrl, isLast = false }: AssetRowProps) {
  const { theme } = useTheme();
  const router = useRouter();

  const unrealizedPnLPercent =
    asset.metrics.avgBuyPrice && asset.metrics.avgBuyPrice > 0
      ? ((asset.currentPrice - asset.metrics.avgBuyPrice) /
          asset.metrics.avgBuyPrice) *
        100
      : null;

  const isPositive = unrealizedPnLPercent !== null && unrealizedPnLPercent >= 0;
  const pnlColor =
    unrealizedPnLPercent !== null
      ? isPositive
        ? theme.gain
        : theme.loss
      : theme.textSecondary;

  return (
    <Pressable
      onPress={() => router.push(`/asset/${asset.symbol}`)}
      style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}
    >
      <View style={styles.container}>
        <View style={styles.row}>
          {imageUrl ? (
            <Image
              source={{ uri: imageUrl }}
              style={styles.coinImage}
              contentFit="contain"
              cachePolicy="disk"
            />
          ) : (
            <View
              style={[
                styles.iconContainer,
                { backgroundColor: theme.accent + "20" },
              ]}
            >
              <Headline color="accent" style={styles.iconText}>
                {asset.symbol.charAt(0)}
              </Headline>
            </View>
          )}

          <View style={styles.infoContainer}>
            <View style={styles.topRow}>
              <BodyMedium>{asset.symbol}</BodyMedium>
              <BodyMedium>{formatFiat(asset.currentValue)}</BodyMedium>
            </View>

            <View style={styles.bottomRow}>
              <Caption>{formatFiat(asset.currentPrice)}</Caption>
              <View style={styles.rightInfo}>
                <Caption>{formatAmount(asset.metrics.amountHeld, 4)}</Caption>
                <View
                  style={[styles.pnlBadge, { backgroundColor: pnlColor + "15" }]}
                >
                  <Caption style={{ color: pnlColor }}>
                    {unrealizedPnLPercent !== null
                      ? `${isPositive ? "+" : ""}${unrealizedPnLPercent.toFixed(2)}%`
                      : "-"}
                  </Caption>
                </View>
              </View>
            </View>
          </View>
        </View>

        {!isLast && (
          <View style={styles.dividerContainer}>
            <View style={[styles.divider, { backgroundColor: theme.border }]} />
          </View>
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: spacing.md,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
  },
  coinImage: {
    width: 40,
    height: 40,
    borderRadius: radius.full,
    marginRight: spacing.md,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center",
    marginRight: spacing.md,
  },
  iconText: {
    fontSize: 16,
  },
  infoContainer: {
    flex: 1,
  },
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.xs,
  },
  bottomRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  rightInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  pnlBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.sm,
  },
  dividerContainer: {
    marginTop: spacing.md,
    paddingHorizontal: spacing.xl,
    alignItems: "center",
  },
  divider: {
    height: 1,
    width: "100%",
  },
});
