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

type ChartType = "performance" | "allocation";
type TimePeriod = "7D" | "30D" | "90D" | "1Y";

// Configuration for each time period
// pointInterval: how many days between data points
// labelInterval: how many data points between X-axis labels
const PERIOD_CONFIG: Record<TimePeriod, { days: number; pointInterval: number; labelInterval: number }> = {
  "7D": { days: 7, pointInterval: 1, labelInterval: 1 },     // 7 points, all labeled
  "30D": { days: 30, pointInterval: 1, labelInterval: 6 },   // 30 points, label every 6
  "90D": { days: 90, pointInterval: 3, labelInterval: 5 },   // 30 points, label every 5th point (= 15 days)
  "1Y": { days: 365, pointInterval: 15, labelInterval: 4 },  // ~24 points, label every 4th (~2 months)
};

// Generate demo data points for a given number of days with specified interval
function generateDemoData(days: number, pointInterval: number): Array<{ x: number; y: number }> {
  const endDate = new Date("2024-01-24");
  const data: Array<{ x: number; y: number }> = [];

  // Generate a somewhat realistic price curve
  const baseValue = 400;
  for (let i = days - 1; i >= 0; i -= pointInterval) {
    const date = new Date(endDate);
    date.setDate(date.getDate() - i);

    // Add some randomness but trend upward
    const progress = (days - i) / days;
    const trend = progress * 3400; // Trend from ~400 to ~3800
    const noise = Math.sin(i * 0.5) * 200 + Math.random() * 100;
    const value = Math.max(0, baseValue + trend + noise);

    data.push({ x: date.getTime(), y: Math.round(value) });
  }

  return data;
}

// Generate X-axis labels based on data and interval
function generateXLabels(
  data: Array<{ x: number }>,
  labelInterval: number
): Array<{ label: string; index: number }> {
  const labels: Array<{ label: string; index: number }> = [];

  for (let i = 0; i < data.length; i += labelInterval) {
    const date = new Date(data[i].x);
    const label = `${String(date.getMonth() + 1).padStart(2, "0")}/${String(date.getDate()).padStart(2, "0")}`;
    labels.push({ label, index: i });
  }

  return labels;
}

// Calculate Y-axis labels based on data range
function generateYLabels(data: Array<{ y: number }>): string[] {
  const maxY = Math.max(...data.map((d) => d.y));
  const step = Math.ceil(maxY / 3 / 100) * 100; // Round to nearest 100
  return ["$0", `$${step}`, `$${step * 2}`, `$${Math.ceil(maxY / 100) * 100}`];
}

const TIME_PERIODS: TimePeriod[] = ["7D", "30D", "90D", "1Y"];

interface PortfolioChartProps {
  assets: AssetWithMetrics[];
}

export function PortfolioChart({ assets }: PortfolioChartProps) {
  const { theme } = useTheme();
  const [chartType, setChartType] = useState<ChartType>("performance");
  const [selectedPeriod, setSelectedPeriod] = useState<TimePeriod>("7D");
  const font = useFont(robotoFont, 11);

  // Generate chart data based on selected period
  const chartData = useMemo(() => {
    const { days, pointInterval } = PERIOD_CONFIG[selectedPeriod];
    return generateDemoData(days, pointInterval);
  }, [selectedPeriod]);

  // Generate X-axis labels (only show every Nth label)
  const xAxisLabels = useMemo(() => {
    const { labelInterval } = PERIOD_CONFIG[selectedPeriod];
    return generateXLabels(chartData, labelInterval);
  }, [chartData, selectedPeriod]);

  // Generate Y-axis labels based on data range
  const yAxisLabels = useMemo(() => {
    return generateYLabels(chartData);
  }, [chartData]);

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
                    data={chartData}
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
                  {xAxisLabels.map(({ label, index }) => (
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
                {yAxisLabels.slice().reverse().map((label, index) => (
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
