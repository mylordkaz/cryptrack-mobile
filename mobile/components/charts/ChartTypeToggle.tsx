import { View, Pressable, StyleSheet, Platform } from "react-native";
import { BodyMedium } from "@/components/ui";
import { spacing, radius, ThemeTokens } from "@/src/theme";
import type { ChartType } from "@/src/charts/portfolioChartUtils";

type ChartTypeToggleProps = {
  theme: ThemeTokens;
  chartType: ChartType;
  onChange: (value: ChartType) => void;
  t: (key: string) => string;
};

export function ChartTypeToggle({
  theme,
  chartType,
  onChange,
  t,
}: ChartTypeToggleProps) {
  return (
    <View style={styles.chartTypeToggle}>
      <Pressable
        onPress={() => onChange("performance")}
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
        onPress={() => onChange("allocation")}
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
  );
}

const styles = StyleSheet.create({
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
});
