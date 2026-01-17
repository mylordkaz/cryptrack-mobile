import { AssetMetrics } from "@/src/math/types";
import { View, Text } from "react-native";

interface Props {
  symbol: string;
  metrics: AssetMetrics;
}

export function AssetMetricsView({ symbol, metrics }: Props) {
  return (
    <View style={{ padding: 16 }}>
      <Text>{symbol} Metrics</Text>

      <Text>Amount held: {metrics.amountHeld}</Text>
      <Text>Total invested: {metrics.investedFiat}</Text>
      <Text>Avg buy price: {metrics.avgBuyPrice ?? "-"}</Text>
      <Text>Realized PnL: {metrics.realizedPnL}</Text>
      <Text>Unrealized PnL: {metrics.unrealizedPnL}</Text>
    </View>
  );
}
