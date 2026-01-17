export interface AssetMetrics {
  amountHeld: number;
  investedFiat: number;
  avgBuyPrice: number | null;
  realizedPnL: number;
  realizedCostBasis: number;
  unrealizedPnL: number;
}

export type AssetTransaction = {
  type: "BUY" | "SELL";
  amount: number;
  price_per_unit_fiat: number;
  total_fiat: number;
  timestamp: number;
};

export interface AssetWithMetrics {
  symbol: string;
  metrics: AssetMetrics;
  currentPrice: number;
  currentValue: number; // amountHeld * currentPrice
}

export interface PortfolioMetrics {
  assets: AssetWithMetrics[];
  totalValue: number;
  totalInvested: number;
  totalUnrealizedPnL: number;
  totalRealizedPnL: number;
  totalRealizedCostBasis: number;
  totalPnL: number;
  totalPnLPercentage: number | null;
}
