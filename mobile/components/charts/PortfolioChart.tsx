import { View, StyleSheet } from "react-native";
import { useTheme, spacing } from "@/src/theme";
import { Card } from "@/components/ui";
import { useMemo, useState, useCallback } from "react";
import { runOnJS, useAnimatedReaction, useSharedValue } from "react-native-reanimated";
import { useLocale } from "@/src/i18n/LocaleProvider";
import { AssetWithMetrics } from "@/src/math/types";
import { usePortfolioHistory } from "@/src/hooks/usePortfolioHistory";
import { useCurrency } from "@/src/currency";
import { formatShortDate } from "@/src/utils/format";
import { useChartPressState } from "victory-native";
import { useFont } from "@shopify/react-native-skia";
import interRegular from "@/assets/fonts/Inter-Regular.ttf";
import {
  ChartType,
  TimePeriod,
  PERIOD_CONFIG,
  generateXLabels,
  generateYAxisTicks,
} from "@/src/charts/portfolioChartUtils";
import { ChartTypeToggle } from "@/components/charts/ChartTypeToggle";
import { AllocationChart } from "@/components/charts/AllocationChart";
import { PerformanceChart } from "@/components/charts/PerformanceChart";

interface PortfolioChartProps {
  assets: AssetWithMetrics[];
  onValueChange?: (value: number | null) => void;
}

export function PortfolioChart({ assets, onValueChange }: PortfolioChartProps) {
  const { theme } = useTheme();
  const { t, locale } = useLocale();
  const { currency, convertUsd } = useCurrency();
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

  const xAxisLabels = useMemo(() => {
    const { labelInterval } = PERIOD_CONFIG[selectedPeriod];
    return generateXLabels(chartData, labelInterval);
  }, [chartData, selectedPeriod, locale]);

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
      setTooltipLabel(item.date ? formatShortDate(item.date, locale) : "");
    },
    [chartData, locale],
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

  useAnimatedReaction(
    () => isActive,
    (active, prev) => {
      if (prev === true && active === false) {
        runOnJS(handleReset)();
      }
    },
    [handleReset],
  );

  return (
    <View style={styles.chartContainer}>
      <ChartTypeToggle
        theme={theme}
        chartType={chartType}
        onChange={setChartType}
        t={t}
      />

      <Card padding="none">
        {chartType === "performance" ? (
          <PerformanceChart
            theme={theme}
            t={t}
            chartData={chartData}
            historyLoading={historyLoading}
            xAxisLabels={xAxisLabels}
            yAxisTickValues={yAxisTickValues}
            currency={currency}
            locale={locale}
            convertUsd={convertUsd}
            axisFont={axisFont}
            pressState={pressState}
            isActive={isActive}
            chartWidth={chartWidth}
            chartHeight={chartHeight}
            tooltipLabel={tooltipLabel}
            selectedPeriod={selectedPeriod}
            onSelectPeriod={setSelectedPeriod}
            onChartLayout={(width, height) => {
              chartWidth.value = width;
              chartHeight.value = height;
            }}
          />
        ) : (
          <AllocationChart data={allocationData} theme={theme} />
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
});
