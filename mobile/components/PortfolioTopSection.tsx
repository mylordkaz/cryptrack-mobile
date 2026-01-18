import { View, StyleSheet, Pressable } from "react-native";
import { t } from "@/src/i18n";
import { ThemeTokens, spacing, radius, useTheme } from "@/src/theme";
import { formatFiat } from "@/src/utils/format";
import { HeroText, Caption, Body, Label } from "./ui";
import { Plus } from "lucide-react-native";
import { useRouter } from "expo-router";

interface PortfolioTopSectionProps {
  totalValue: number;
  totalInvested: number;
  totalPnL: number;
  totalPnLPercentage: number | null;
  theme: ThemeTokens;
}

export function PortfolioTopSection({
  totalValue,
  totalInvested,
  totalPnL,
  totalPnLPercentage,
}: PortfolioTopSectionProps) {
  const { theme } = useTheme();
  const router = useRouter();
  const isPositive = totalPnL >= 0;
  const pnlSign = isPositive ? "+" : "";
  const pnlPercentText =
    totalPnLPercentage !== null ? ` (${pnlSign}${totalPnLPercentage.toFixed(2)}%)` : "";

  return (
    <View style={styles.container}>
      <Label>{t("portfolio.totalValue")}</Label>
      <View style={styles.valueRow}>
        <HeroText style={styles.heroValue}>{formatFiat(totalValue)}</HeroText>
        <View style={{ flex: 1 }} />
        <Pressable
          onPress={() => router.push("/add-transaction")}
          style={({ pressed }) => [
            styles.addButton,
            {
              backgroundColor: theme.accent,
              opacity: pressed ? 0.7 : 1,
            },
          ]}
        >
          <Plus size={28} color="#FFFFFF" />
        </Pressable>
      </View>

      <View style={styles.metricsRow}>
        <View style={styles.metricItem}>
          <Caption>{t("portfolio.totalInvested")}</Caption>
          <Body style={styles.metricValue}>{formatFiat(totalInvested)}</Body>
        </View>

        <View style={styles.metricItem}>
          <Caption>{t("portfolio.totalPnL")}</Caption>
          <Body
            color={isPositive ? "gain" : "loss"}
            style={styles.metricValue}
          >
            {pnlSign}{formatFiat(totalPnL)}{pnlPercentText}
          </Body>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: spacing.xxl,
  },
  valueRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    marginTop: spacing.xs,
    marginBottom: spacing.xl,
  },
  heroValue: {
    flex: 0,
  },
  addButton: {
    width: 44,
    height: 44,
    borderRadius: radius.full,
    justifyContent: "center",
    alignItems: "center",
    marginRight: spacing.md,
  },
  metricsRow: {
    flexDirection: "row",
    gap: spacing.xxl,
  },
  metricItem: {
    flex: 1,
  },
  metricValue: {
    marginTop: spacing.xs,
  },
});
