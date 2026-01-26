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
import {
  Circle,
  Line as SkiaLine,
  vec,
  useFont,
} from "@shopify/react-native-skia";
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
import interRegular from "@/assets/fonts/Inter-Regular.ttf";

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
  data: Array<{ date: number }>,
  labelInterval: number,
): Array<{ label: string; index: number }> {
  const labels: Array<{ label: string; index: number }> = [];

  for (let i = 0; i < data.length; i += labelInterval) {
    const date = new Date(data[i].date);
    const label = `${String(date.getMonth() + 1).padStart(2, "0")}/${String(date.getDate()).padStart(2, "0")}`;
    labels.push({ label, index: i });
  }

  return labels;
}

// Generate nice tick values for Y-axis (always 4 ticks starting from 0)
function generateYAxisTicks(data: Array<{ y: number }>): number[] {
  if (data.length === 0) return [0, 1000, 2000, 3000, 4000];

  const values = data.map((d) => d.y).filter((val) => Number.isFinite(val));
  if (values.length === 0) return [0, 1000, 2000, 3000, 4000];

  const maxY = Math.max(...values);
  if (maxY <= 0) return [0, 250, 500, 750, 1000];

  // We want 4 ticks (3 intervals), starting from 0
  // Find a nice step that divides evenly into 3 intervals
  const targetStep = maxY / 3;

  // Get order of magnitude for the step
  const stepMagnitude = Math.pow(10, Math.floor(Math.log10(targetStep)));
  const normalizedStep = targetStep / stepMagnitude;

  // Round up to a nice step value
  let niceStepMultiplier: number;
  if (normalizedStep <= 1) niceStepMultiplier = 1;
  else if (normalizedStep <= 1.4) niceStepMultiplier = 1.4;
  else if (normalizedStep <= 2) niceStepMultiplier = 2;
  else if (normalizedStep <= 2.5) niceStepMultiplier = 2.5;
  else if (normalizedStep <= 3) niceStepMultiplier = 3;
  else if (normalizedStep <= 4) niceStepMultiplier = 4;
  else if (normalizedStep <= 5) niceStepMultiplier = 5;
  else if (normalizedStep <= 7) niceStepMultiplier = 7;
  else niceStepMultiplier = 10;

  const niceStep = niceStepMultiplier * stepMagnitude;
  const maxTick = niceStep * 3;

  // Return 4 evenly spaced ticks from 0 to maxTick
  return [0, niceStep, niceStep * 2, maxTick];
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
  const axisFont = useFont(interRegular, 11);
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
    const sampled: Array<{ x: number; y: number; date: number }> = [];

    for (let i = 0; i < sliced.length; i += pointInterval) {
      sampled.push({
        x: sampled.length,
        y: sliced[i].y,
        date: sliced[i].x,
      });
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

  // Generate Y-axis tick values based on data range
  const yAxisTickValues = useMemo(() => {
    return generateYAxisTicks(chartData);
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

  const updateTooltipLabel = useCallback(
    (index: number) => {
      const item = chartData[index];
      if (!item) return;
      const date = new Date(item.date);
      const dateStr = `${String(date.getMonth() + 1).padStart(2, "0")}/${String(
        date.getDate(),
      ).padStart(2, "0")}`;
      setTooltipLabel(dateStr);
    },
    [chartData],
  );

  const handleValueChange = useCallback(
    (value: number) => {
      onValueChange?.(value);
    },
    [onValueChange],
  );

  const handleReset = useCallback(() => {
    onValueChange?.(null);
  }, [onValueChange]);

  useAnimatedReaction(
    () => ({
      index: pressState.matchedIndex.value,
      y: pressState.y.y.value.value,
      active: isActive,
    }),
    (current, prev) => {
      // Only update when actively pressing
      if (
        current.active &&
        current.index >= 0 &&
        (current.index !== prev?.index || current.y !== prev?.y)
      ) {
        runOnJS(updateTooltipLabel)(current.index);
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

    const clampedX = Math.min(
      Math.max(x - TOOLTIP_WIDTH / 2, 0),
      Math.max(0, width - TOOLTIP_WIDTH),
    );
    const clampedY = Math.min(
      Math.max(y - TOOLTIP_HEIGHT - TOOLTIP_OFFSET, 0),
      Math.max(0, height - TOOLTIP_HEIGHT),
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
                    domain={{
                      x: [0, Math.max(0, chartData.length - 1)],
                      y: [0, yAxisTickValues[yAxisTickValues.length - 1]],
                    }}
                    domainPadding={{ top: 10, bottom: 10, left: 0, right: 0 }}
                    padding={{ left: 20, right: 4 }}
                    chartPressState={pressState}
                    chartPressConfig={{
                      pan: {
                        activateAfterLongPress: 0,
                      },
                    }}
                    xAxis={{
                      tickValues: xAxisLabels.map(({ index }) => index),
                      labelColor: theme.textSecondary,
                      font: axisFont ?? undefined,
                      formatXLabel: (value) => {
                        const item = chartData[Math.round(value)];
                        if (!item) return "";
                        const date = new Date(item.date);
                        return `${String(date.getMonth() + 1).padStart(2, "0")}/${String(date.getDate()).padStart(2, "0")}`;
                      },
                      axisSide: "bottom",
                      yAxisSide: "right",
                      labelPosition: "outset",
                      lineColor: "transparent",
                      labelOffset: 8,
                    }}
                    yAxis={[
                      {
                        tickValues: yAxisTickValues,
                        labelColor: theme.textSecondary,
                        font: axisFont ?? undefined,
                        formatYLabel: (value) =>
                          `$${Math.round(value).toLocaleString()}`,
                        axisSide: "right",
                        labelPosition: "outset",
                        lineColor: "transparent",
                        labelOffset: 4,
                      },
                    ]}
                  >
                    {({ points, chartBounds }) => {
                      const yMax = yAxisTickValues[yAxisTickValues.length - 1];
                      const chartHeight = chartBounds.bottom - chartBounds.top;

                      // Create 6 evenly spaced grid lines
                      const gridLineValues = Array.from(
                        { length: 6 },
                        (_, i) => (yMax / 5) * i,
                      );

                      return (
                        <>
                          {/* Horizontal grid lines */}
                          {gridLineValues.map((tick, index) => {
                            const yPos =
                              chartBounds.bottom - (tick / yMax) * chartHeight;
                            return (
                              <SkiaLine
                                key={`grid-${index}`}
                                p1={vec(chartBounds.left, yPos)}
                                p2={vec(chartBounds.right, yPos)}
                                color={theme.border}
                                strokeWidth={1}
                                opacity={0.7}
                              />
                            );
                          })}

                          <Line
                            points={points.y}
                            color={theme.accent}
                            strokeWidth={2}
                            curveType="monotoneX"
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
                      );
                    }}
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
    height: 240,
    paddingTop: spacing.md,
    paddingLeft: 0,
    paddingRight: spacing.md,
    paddingBottom: spacing.sm,
  },
  chartArea: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
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
