import { useEffect, useState } from "react";
import {
  PortfolioMetrics,
  AssetTransaction,
  AssetWithMetrics,
} from "../math/types";
import { getAllTransactionsOrdered } from "../db/transactions";
import { computeAssetMetrics } from "../math/assetMath";
import { getLatestPrices } from "../db/prices";

export function usePortfolioMetrics(priceMap: Record<string, number>, refreshKey: number = 0) {
  const [portfolio, setPortfolio] = useState<PortfolioMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        setLoading(true);
        setError(null);

        const rows = await getAllTransactionsOrdered();
        const transactionsBySymbol = new Map<string, AssetTransaction[]>();

        for (const tx of rows) {
          const list = transactionsBySymbol.get(tx.asset_symbol) ?? [];
          list.push({
            type: tx.type,
            amount: tx.amount,
            price_per_unit_fiat: tx.price_per_unit_fiat,
            total_fiat: tx.total_fiat,
            timestamp: tx.timestamp,
          });
          transactionsBySymbol.set(tx.asset_symbol, list);
        }

        const symbols = Array.from(transactionsBySymbol.keys());
        const lastKnown = await getLatestPrices(symbols);

        // Compute metrics for each asset
        const allAssets: AssetWithMetrics[] = symbols.map((symbol) => {
          const txs = transactionsBySymbol.get(symbol) ?? [];
          const currentPrice =
            priceMap[symbol] ?? lastKnown[symbol]?.price_fiat ?? 0;
          const metrics = computeAssetMetrics(txs, currentPrice);

          return {
            symbol,
            metrics,
            currentPrice,
            currentValue: metrics.amountHeld * currentPrice,
          };
        });

        const assetsWithMetrics = allAssets
          .filter((asset) => asset.metrics.amountHeld > 0)
          .sort((a, b) => b.currentValue - a.currentValue);

        // Compute portfolio totals
        const totalValue = assetsWithMetrics.reduce(
          (sum, asset) => sum + asset.currentValue,
          0,
        );

        const totalInvested = assetsWithMetrics.reduce(
          (sum, asset) => sum + asset.metrics.investedFiat,
          0,
        );

        const totalUnrealizedPnL = assetsWithMetrics.reduce(
          (sum, asset) => sum + asset.metrics.unrealizedPnL,
          0,
        );

        const totalRealizedPnL = allAssets.reduce(
          (sum, asset) => sum + asset.metrics.realizedPnL,
          0,
        );

        const totalRealizedCostBasis = allAssets.reduce(
          (sum, asset) => sum + asset.metrics.realizedCostBasis,
          0,
        );

        // totalPnL includes both unrealized (holdings) and realized (sold assets)
        const totalPnL = totalUnrealizedPnL + totalRealizedPnL;
        const totalCostBasis = totalInvested + totalRealizedCostBasis;
        const totalPnLPercentage =
          totalCostBasis > 0 ? (totalPnL / totalCostBasis) * 100 : null;

        if (!cancelled) {
          setPortfolio({
            assets: assetsWithMetrics,
            totalValue,
            totalInvested,
            totalUnrealizedPnL,
            totalRealizedPnL,
            totalRealizedCostBasis,
            totalPnL,
            totalPnLPercentage,
          });
        }
      } catch (e) {
        if (!cancelled) {
          setError(e as Error);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [priceMap, refreshKey]);

  return { portfolio, loading, error };
}
