import { View, Text, StyleSheet, Pressable, Platform, ActivityIndicator } from "react-native";
import { useTheme, spacing, radius } from "@/src/theme";
import { Card, Caption, BodyMedium } from "./ui";
import { PieChart } from "react-native-gifted-charts";
import { CartesianChart, Line } from "victory-native";
import { useFont } from "@shopify/react-native-skia";
import { useMemo, useState } from "react";
import { t } from "@/src/i18n";
import { AssetWithMetrics } from "@/src/math/types";

const robotoFont = require("@/assets/fonts/Roboto-Regular.ttf");

const demoHistoryData = [
  { x: new Date("2024-01-18").getTime(), y: 420 },
  { x: new Date("2024-01-19").getTime(), y: 480 },
  { x: new Date("2024-01-20").getTime(), y: 510 },
  { x: new Date("2024-01-21").getTime(), y: 2100 },
  { x: new Date("2024-01-22").getTime(), y: 2850 },
  { x: new Date("2024-01-23").getTime(), y: 3200 },
  { x: new Date("2024-01-24").getTime(), y: 3841 },
];

const xLabels = ["01/18", "01/19", "01/20", "01/21", "01/22", "01/23", "01/24"];
const yLabels = ["$0", "$1280", "$2560", "$3841"];

type ChartType = "performance" | "allocation";
type TimePeriod = "7D" | "30D" | "90D" | "1Y";

const TIME_PERIODS: TimePeriod[] = ["7D", "30D", "90D", "1Y"];

interface PortfolioChartProps {
  assets: AssetWithMetrics[];
}

export function PortfolioChart({ assets }: PortfolioChartProps) {
  const { theme } = useTheme();
  const [chartType, setChartType] = useState<ChartType>("performance");
  const [selectedPeriod, setSelectedPeriod] = useState<TimePeriod>("7D");
  const font = useFont(robotoFont, 11);

  const allocationData = useMemo(() => {
    const totalValue = assets.reduce((sum, asset) => sum + asset.currentValue, 0);
    if (totalValue <= 0) return [];

    const palette = [
      theme.accent,
      theme.accentSecondary,
      theme.gain,
      theme.loss,
      theme.textSecondary,
    ];

    return assets.map((asset, index) => {
      const percent = (asset.currentValue / totalValue) * 100;
      return {
        value: Number(percent.toFixed(1)),
        color: palette[index % palette.length],
        text: asset.symbol,
      };
    });
  }, [assets, theme]);

  return (
    <View style={styles.chartContainer}>
      <View style={styles.chartTypeToggle}>
        <Pressable
          onPress={() => setChartType("performance")}
          style={({ pressed }) => [
            styles.chartTypeButton,
            {
              backgroundColor:
                chartType === "performance" ? theme.surface : "transparent",
              borderColor:
                chartType === "performance" ? theme.accent : theme.border,
              borderWidth: 1,
              opacity: pressed ? 0.7 : 1,
            },
          ]}
        >
          <BodyMedium
            style={{
              color: chartType === "performance" ? theme.accent : theme.text,
              fontWeight: chartType === "performance" ? "600" : "400",
            }}
          >
            {t("portfolio.performance")}
          </BodyMedium>
        </Pressable>

        <Pressable
          onPress={() => setChartType("allocation")}
          style={({ pressed }) => [
            styles.chartTypeButton,
            {
              backgroundColor:
                chartType === "allocation" ? theme.surface : "transparent",
              borderColor:
                chartType === "allocation" ? theme.accent : theme.border,
              borderWidth: 1,
              opacity: pressed ? 0.7 : 1,
            },
          ]}
        >
          <BodyMedium
            style={{
              color: chartType === "allocation" ? theme.accent : theme.text,
              fontWeight: chartType === "allocation" ? "600" : "400",
            }}
          >
            {t("portfolio.allocation")}
          </BodyMedium>
        </Pressable>
      </View>

      <Card padding="none">
        {chartType === "performance" ? (
          <>
            <View style={styles.chartWrapper}>
              {/* Chart area */}
              <View style={styles.chartArea}>
                {font ? (
                  <CartesianChart
                    data={demoHistoryData}
                    xKey="x"
                    yKeys={["y"]}
                    domainPadding={{ top: 10, bottom: 10, left: 5, right: 5 }}
                    axisOptions={{ font }}
                  >
                    {({ points }) => (
                      <Line
                        points={points.y}
                        color={theme.accent}
                        strokeWidth={2}
                        curveType="natural"
                      />
                    )}
                  </CartesianChart>
                ) : (
                  <View style={styles.loadingContainer}>
                    <ActivityIndicator color={theme.accent} />
                  </View>
                )}

                {/* X-axis labels */}
                <View style={styles.xAxisLabels}>
                  {xLabels.map((label, index) => (
                    <Text
                      key={index}
                      style={[styles.axisLabel, { color: theme.textSecondary }]}
                    >
                      {label}
                    </Text>
                  ))}
                </View>
              </View>

              {/* Y-axis labels (right side) */}
              <View style={styles.yAxisLabels}>
                {yLabels.slice().reverse().map((label, index) => (
                  <Text
                    key={index}
                    style={[styles.axisLabel, { color: theme.textSecondary }]}
                  >
                    {label}
                  </Text>
                ))}
              </View>
            </View>

            <View style={styles.periodButtonsContainer}>
              {TIME_PERIODS.map((period) => {
                const isSelected = period === selectedPeriod;
                return (
                  <Pressable
                    key={period}
                    onPress={() => setSelectedPeriod(period)}
                    style={({ pressed }) => [
                      styles.periodButton,
                      {
                        backgroundColor: isSelected
                          ? theme.accent
                          : "transparent",
                        opacity: pressed ? 0.7 : 1,
                      },
                    ]}
                  >
                    <Caption
                      style={{
                        color: isSelected ? theme.bg : theme.textSecondary,
                        fontWeight: isSelected ? "600" : "400",
                      }}
                    >
                      {period}
                    </Caption>
                  </Pressable>
                );
              })}
            </View>
          </>
        ) : (
          <View style={styles.pieChartContainer}>
            <PieChart
              data={allocationData}
              donut
              radius={80}
              innerRadius={45}
              innerCircleColor={theme.bg}
            />
            <View style={styles.legendContainer}>
              {allocationData.map((item, index) => (
                <View key={index} style={styles.legendItem}>
                  <View
                    style={[
                      styles.legendColorBox,
                      { backgroundColor: item.color },
                    ]}
                  />
                  <Caption style={{ color: theme.text }}>{item.text}</Caption>
                  <Caption
                    style={{ color: theme.textSecondary, marginLeft: "auto" }}
                  >
                    {item.value.toFixed(1)}%
                  </Caption>
                </View>
              ))}
            </View>
          </View>
        )}
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  chartContainer: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
  },
  chartTypeToggle: {
    flexDirection: "row",
    gap: spacing.sm,
    marginBottom: spacing.md,
    justifyContent: "flex-start",
  },
  chartTypeButton: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    alignItems: "center",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  chartWrapper: {
    height: 220,
    paddingTop: spacing.md,
    paddingHorizontal: spacing.sm,
    flexDirection: "row",
  },
  yAxisLabels: {
    width: 50,
    justifyContent: "space-between",
    alignItems: "flex-start",
    paddingLeft: spacing.xs,
    paddingBottom: 20,
  },
  chartArea: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  xAxisLabels: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingTop: spacing.xs,
    height: 20,
  },
  axisLabel: {
    fontSize: 11,
  },
  periodButtonsContainer: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
    gap: spacing.sm,
  },
  periodButton: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.full,
    alignItems: "center",
  },
  pieChartContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    padding: spacing.lg,
  },
  legendContainer: {
    flex: 1,
    gap: spacing.md,
    paddingLeft: spacing.lg,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  legendColorBox: {
    width: 12,
    height: 12,
    borderRadius: 2,
  },
});
