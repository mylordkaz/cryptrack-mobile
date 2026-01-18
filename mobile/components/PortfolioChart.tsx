import { View, Text, StyleSheet, Pressable, Platform } from "react-native";
import { useTheme, spacing, radius } from "@/src/theme";
import { Card, Caption, BodyMedium } from "./ui";
import { LineChart, PieChart, yAxisSides } from "react-native-gifted-charts";
import { useMemo, useState } from "react";
import { t } from "@/src/i18n";
import { AssetWithMetrics } from "@/src/math/types";

const demoPerformanceData = [
  { value: 420, label: "Jan" },
  { value: 1040, label: "" },
  { value: 1090, label: "Mar" },
  { value: 1680, label: "" },
  { value: 1530, label: "May" },
  { value: 1525, label: "" },
  { value: 1260, label: "Jul" },
  { value: 1960, label: "" },
  { value: 1490, label: "Sep" },
  { value: 2140, label: "" },
  { value: 2080, label: "Nov" },
  { value: 2220, label: "" },
];

type ChartType = "performance" | "allocation";
type TimePeriod = "24h" | "7D" | "30D" | "90D" | "all";

const TIME_PERIODS: TimePeriod[] = ["24h", "7D", "30D", "90D", "all"];

interface PortfolioChartProps {
  assets: AssetWithMetrics[];
}

export function PortfolioChart({ assets }: PortfolioChartProps) {
  const { theme } = useTheme();
  const [chartType, setChartType] = useState<ChartType>("performance");
  const [selectedPeriod, setSelectedPeriod] = useState<TimePeriod>("30D");

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
              <LineChart
                data={demoPerformanceData}
                curved
                height={160}
                thickness={2}
                color={theme.accent}
                hideDataPoints
                hideRules
                noOfSections={3}
                maxValue={2400}
                yAxisSide={yAxisSides.RIGHT}
                yAxisLabelPrefix="$"
                yAxisLabelWidth={52}
                yAxisTextStyle={{ color: theme.textSecondary, fontSize: 11 }}
                yAxisColor="transparent"
                xAxisColor="transparent"
                xAxisLabelTextStyle={{
                  color: theme.textSecondary,
                  fontSize: 11,
                }}
                backgroundColor=""
                initialSpacing={10}
                spacing={24}
                endSpacing={18}
                isAnimated
                pointerConfig={{
                  pointerStripUptoDataPoint: true,
                  pointerStripColor: theme.muted,
                  pointerStripWidth: 2,
                  pointerColor: theme.accent,
                  radius: 4,
                  activatePointersOnLongPress: true,
                  autoAdjustPointerLabelPosition: false,
                  pointerLabelComponent: (items) => (
                    <View
                      style={{
                        justifyContent: "center",
                        height: 20,
                        width: 60,
                        marginTop: -30,
                        marginLeft: -40,
                        borderRadius: 6,
                        borderWidth: 1,
                        borderColor: theme.border,
                      }}
                    >
                      <View
                        style={{
                          borderRadius: 16,
                          backgroundColor: "white",
                        }}
                      >
                        <Text
                          style={{
                            color: theme.text,
                            fontSize: 11,
                            textAlign: "center",
                          }}
                        >
                          ${items[0].value}
                        </Text>
                      </View>
                    </View>
                  ),
                }}
              />
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
                          ? theme.accent + "20"
                          : "transparent",
                        opacity: pressed ? 0.7 : 1,
                      },
                    ]}
                  >
                    <Caption
                      style={{
                        color: isSelected ? theme.accent : theme.textSecondary,
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
    paddingTop: spacing.xl,
    paddingHorizontal: spacing.lg,
  },
  periodButtonsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: spacing.lg,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
    gap: spacing.xs,
  },
  periodButton: {
    flex: 1,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.sm,
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
