import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Platform,
  ActivityIndicator,
} from "react-native";
import { useTheme, spacing, radius } from "@/src/theme";
import { Card, Caption, BodyMedium } from "./ui";
import { PieChart } from "react-native-gifted-charts";
import { CartesianChart, Line, useChartPressState } from "victory-native";
import { Circle } from "@shopify/react-native-skia";
import { useMemo, useState, useCallback } from "react";
import Animated, {
  useAnimatedReaction,
  useAnimatedStyle,
  useSharedValue,
  runOnJS,
} from "react-native-reanimated";
import { t } from "@/src/i18n";
import { AssetWithMetrics } from "@/src/math/types";
import { usePortfolioHistory } from "@/src/hooks/usePortfolioHistory";

type ChartType = "performance" | "allocation";
type TimePeriod = "7D" | "30D" | "90D" | "1Y";

// Configuration for each time period
// pointInterval: how many days between data points
// labelInterval: how many data points between X-axis labels
const PERIOD_CONFIG: Record<
  TimePeriod,
  { days: number; pointInterval: number; labelInterval: number }
> = {
  "7D": { days: 7, pointInterval: 1, labelInterval: 1 }, // 7 points, all labeled
  "30D": { days: 30, pointInterval: 1, labelInterval: 6 }, // 30 points, label every 6
  "90D": { days: 90, pointInterval: 3, labelInterval: 5 }, // 30 points, label every 5th point (= 15 days)
  "1Y": { days: 365, pointInterval: 15, labelInterval: 4 }, // ~24 points, label every 4th (~2 months)
};

// Generate X-axis labels based on data and interval
function generateXLabels(
  data: Array<{ x: number }>,
  labelInterval: number,
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
  if (data.length === 0) return ["$0", "$0", "$0", "$0"];
  const maxY = Math.max(...data.map((d) => d.y));
  const step = Math.ceil(maxY / 3 / 100) * 100; // Round to nearest 100
  return ["$0", `$${step}`, `$${step * 2}`, `$${Math.ceil(maxY / 100) * 100}`];
}

const TIME_PERIODS: TimePeriod[] = ["7D", "30D", "90D", "1Y"];
const TOOLTIP_WIDTH = 62;
const TOOLTIP_HEIGHT = 24;
const TOOLTIP_OFFSET = 8;

interface PortfolioChartProps {
  assets: AssetWithMetrics[];
  onValueChange?: (value: number | null) => void;
}

export function PortfolioChart({ assets, onValueChange }: PortfolioChartProps) {
  const { theme } = useTheme();
  const [chartType, setChartType] = useState<ChartType>("performance");
  const [selectedPeriod, setSelectedPeriod] = useState<TimePeriod>("7D");
  const { data: historyData, loading: historyLoading } = usePortfolioHistory(
    assets.map((asset) => asset.symbol),
  );
  const [tooltipLabel, setTooltipLabel] = useState("");
  const chartWidth = useSharedValue(0);
  const chartHeight = useSharedValue(0);
  const { state: pressState, isActive } = useChartPressState({
    x: 0,
    y: { y: 0 },
  });

  // Generate chart data based on selected period
  const chartData = useMemo(() => {
    const { days, pointInterval } = PERIOD_CONFIG[selectedPeriod];
    if (historyData.length === 0) return [];

    const sliced = historyData.slice(-days);
    const sampled: Array<{ x: number; y: number }> = [];

    for (let i = 0; i < sliced.length; i += pointInterval) {
      sampled.push(sliced[i]);
    }

    const currentTotal = assets.reduce(
      (sum, asset) => sum + asset.currentValue,
      0,
    );
    if (sampled.length > 0 && currentTotal > 0) {
      const last = sampled[sampled.length - 1];
      sampled[sampled.length - 1] = { ...last, y: currentTotal };
    }

    return sampled;
  }, [assets, historyData, selectedPeriod]);

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
    const totalValue = assets.reduce(
      (sum, asset) => sum + asset.currentValue,
      0,
    );
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

  const updateTooltipLabel = useCallback((timestamp: number, value: number) => {
    if (!Number.isFinite(timestamp)) return;
    const date = new Date(timestamp);
    const dateStr = `${String(date.getMonth() + 1).padStart(2, "0")}/${String(
      date.getDate(),
    ).padStart(2, "0")}`;
    setTooltipLabel(dateStr);
  }, []);

  const handleValueChange = useCallback((value: number) => {
    onValueChange?.(value);
  }, [onValueChange]);

  const handleReset = useCallback(() => {
    onValueChange?.(null);
  }, [onValueChange]);

  useAnimatedReaction(
    () => ({ x: pressState.x.value.value, y: pressState.y.y.value.value, active: isActive }),
    (current, prev) => {
      // Only update when actively pressing
      if (current.active && (current.x !== prev?.x || current.y !== prev?.y)) {
        runOnJS(updateTooltipLabel)(current.x, current.y);
        runOnJS(handleValueChange)(current.y);
      }
    },
    [updateTooltipLabel, handleValueChange],
  );

  // Reset value when touch ends
  useAnimatedReaction(
    () => isActive,
    (active, prev) => {
      if (prev === true && active === false) {
        runOnJS(handleReset)();
      }
    },
    [handleReset],
  );

  const tooltipStyle = useAnimatedStyle(() => {
    const width = chartWidth.value || 0;
    const height = chartHeight.value || 0;
    const x = pressState.x.position.value;
    const y = pressState.y.y.position.value;

    // Account for x-axis labels (20px from styles.xAxisLabels height)
    const chartOnlyHeight = height - 20;

    const clampedX = Math.min(
      Math.max(x - TOOLTIP_WIDTH / 2, 0),
      Math.max(0, width - TOOLTIP_WIDTH),
    );
    const clampedY = Math.min(
      Math.max(y - TOOLTIP_HEIGHT - TOOLTIP_OFFSET, 0),
      Math.max(0, chartOnlyHeight - TOOLTIP_HEIGHT),
    );
    return {
      transform: [{ translateX: clampedX }, { translateY: clampedY }],
      opacity: isActive ? 1 : 0,
    };
  });

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
              <View
                style={styles.chartArea}
                onLayout={(event) => {
                  chartWidth.value = event.nativeEvent.layout.width;
                  chartHeight.value = event.nativeEvent.layout.height;
                }}
              >
                {chartData.length > 1 ? (
                  <CartesianChart
                    data={chartData}
                    xKey="x"
                    yKeys={["y"]}
                    domainPadding={{ top: 10, bottom: 10, left: 5, right: 5 }}
                    chartPressState={pressState}
                    chartPressConfig={{
                      pan: {
                        activateAfterLongPress: 0,
                      },
                    }}
                    renderOutside={() => null}
                  >
                    {({ points }) => (
                      <>
                        <Line
                          points={points.y}
                          color={theme.accent}
                          strokeWidth={2}
                          curveType="natural"
                        />
                        {isActive && (
                          <>
                            <Circle
                              cx={pressState.x.position}
                              cy={pressState.y.y.position}
                              r={8}
                              color={theme.surface}
                              opacity={1}
                            />
                            <Circle
                              cx={pressState.x.position}
                              cy={pressState.y.y.position}
                              r={5}
                              color={theme.accent}
                              opacity={1}
                            />
                          </>
                        )}
                      </>
                    )}
                  </CartesianChart>
                ) : historyLoading ? (
                  <View style={styles.loadingContainer}>
                    <ActivityIndicator color={theme.accent} />
                  </View>
                ) : (
                  <View style={styles.loadingContainer}>
                    <Caption style={{ color: theme.textSecondary }}>
                      {t("common.noData")}
                    </Caption>
                  </View>
                )}

                <Animated.View
                  pointerEvents="none"
                  style={[
                    styles.tooltip,
                    {
                      backgroundColor: theme.surface,
                      borderColor: theme.border,
                    },
                    tooltipStyle,
                  ]}
                >
                  <Text style={[styles.tooltipText, { color: theme.text }]}>
                    {tooltipLabel}
                  </Text>
                </Animated.View>

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
                {yAxisLabels
                  .slice()
                  .reverse()
                  .map((label, index) => (
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
  tooltip: {
    position: "absolute",
    width: TOOLTIP_WIDTH,
    height: TOOLTIP_HEIGHT,
    borderRadius: radius.full,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  tooltipText: {
    fontSize: 11,
    fontWeight: "600",
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
