import { View, Text, Pressable, ActivityIndicator, StyleSheet } from "react-native";
import { CartesianChart, Line } from "victory-native";
import { Circle, Line as SkiaLine, vec } from "@shopify/react-native-skia";
import type { SkFont } from "@shopify/react-native-skia";
import type { useChartPressState } from "victory-native";
import Animated, { useAnimatedStyle } from "react-native-reanimated";
import { Caption } from "@/components/ui";
import { spacing, radius, ThemeTokens } from "@/src/theme";
import { formatShortDate } from "@/src/utils/format";
import { TIME_PERIODS, TimePeriod } from "@/src/charts/portfolioChartUtils";
import type { SharedValue } from "react-native-reanimated";

const TOOLTIP_WIDTH = 62;
const TOOLTIP_HEIGHT = 24;
const TOOLTIP_OFFSET = 8;

export type PerformanceChartPoint = {
  x: number;
  y: number;
  date: number;
};

type PerformanceChartProps = {
  theme: ThemeTokens;
  t: (key: string) => string;
  chartData: PerformanceChartPoint[];
  historyLoading: boolean;
  xAxisLabels: Array<{ label: string; index: number }>;
  yAxisTickValues: number[];
  currency: string;
  locale: string;
  convertUsd: (value: number) => number;
  axisFont: SkFont | null;
  pressState: ReturnType<typeof useChartPressState>["state"];
  isActive: boolean;
  chartWidth: SharedValue<number>;
  chartHeight: SharedValue<number>;
  tooltipLabel: string;
  selectedPeriod: TimePeriod;
  onSelectPeriod: (period: TimePeriod) => void;
  onChartLayout: (width: number, height: number) => void;
};

export function PerformanceChart({
  theme,
  t,
  chartData,
  historyLoading,
  xAxisLabels,
  yAxisTickValues,
  currency,
  locale,
  convertUsd,
  axisFont,
  pressState,
  isActive,
  chartWidth,
  chartHeight,
  tooltipLabel,
  selectedPeriod,
  onSelectPeriod,
  onChartLayout,
}: PerformanceChartProps) {
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
    <>
      <View style={styles.chartWrapper}>
        <View
          style={styles.chartArea}
          onLayout={(event) => {
            onChartLayout(
              event.nativeEvent.layout.width,
              event.nativeEvent.layout.height,
            );
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
                  return formatShortDate(item.date);
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
                  formatYLabel: (value) => {
                    const converted = convertUsd(value);
                    if (
                      typeof Intl !== "undefined" &&
                      typeof Intl.NumberFormat === "function"
                    ) {
                      return new Intl.NumberFormat(locale, {
                        style: "currency",
                        currency,
                        maximumFractionDigits: 0,
                      }).format(converted);
                    }
                    return `${currency} ${Math.round(converted).toLocaleString()}`;
                  },
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
                const gridLineValues = Array.from(
                  { length: 6 },
                  (_, i) => (yMax / 5) * i,
                );

                return (
                  <>
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
              onPress={() => onSelectPeriod(period)}
              style={({ pressed }) => [
                styles.periodButton,
                {
                  backgroundColor: isSelected ? theme.accent : "transparent",
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
  );
}

const styles = StyleSheet.create({
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
});
