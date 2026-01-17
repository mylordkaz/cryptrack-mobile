import { View, StyleSheet } from "react-native";
import { t } from "@/src/i18n";
import { ThemeTokens, spacing, radius } from "@/src/theme";
import { formatFiat } from "@/src/utils/format";
import { HeroText, Caption, Body, Label } from "./ui";

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
  const isPositive = totalPnL >= 0;
  const pnlSign = isPositive ? "+" : "";
  const pnlPercentText =
    totalPnLPercentage !== null ? ` (${pnlSign}${totalPnLPercentage.toFixed(2)}%)` : "";

  return (
    <View style={styles.container}>
      <Label>{t("portfolio.totalValue")}</Label>
      <HeroText style={styles.heroValue}>{formatFiat(totalValue)}</HeroText>

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
  heroValue: {
    marginTop: spacing.xs,
    marginBottom: spacing.xl,
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
