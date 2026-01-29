import { View, StyleSheet } from "react-native";
import { PieChart } from "react-native-gifted-charts";
import { Caption } from "@/components/ui";
import { spacing, ThemeTokens } from "@/src/theme";

export type AllocationDatum = {
  value: number;
  color: string;
  text: string;
};

type AllocationChartProps = {
  data: AllocationDatum[];
  theme: ThemeTokens;
};

export function AllocationChart({ data, theme }: AllocationChartProps) {
  return (
    <View style={styles.pieChartContainer}>
      <PieChart
        data={data}
        donut
        radius={80}
        innerRadius={45}
        innerCircleColor={theme.bg}
      />
      <View style={styles.legendContainer}>
        {data.map((item, index) => (
          <View key={index} style={styles.legendItem}>
            <View
              style={[styles.legendColorBox, { backgroundColor: item.color }]}
            />
            <Caption style={{ color: theme.text }}>{item.text}</Caption>
            <Caption style={{ color: theme.textSecondary, marginLeft: "auto" }}>
              {item.value.toFixed(1)}%
            </Caption>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
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
