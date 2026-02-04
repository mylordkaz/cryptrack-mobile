import { useEffect, useState } from "react";
import { AssetMetrics, AssetTransaction } from "../math/types";
import { getTransactionsByAsset } from "../db/transactions";
import { computeAssetMetrics } from "../math/assetMath";
import { usePortfolio } from "@/src/portfolio";

export function useAssetMetrics(assetSymbol: string, currentPrice: number) {
  const [metrics, setMetrics] = useState<AssetMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const { activePortfolioId } = usePortfolio();

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        setLoading(true);
        setError(null);

        const rows = await getTransactionsByAsset(assetSymbol, activePortfolioId);

        const txs: AssetTransaction[] = rows.map((tx) => ({
          type: tx.type,
          amount: tx.amount,
          price_per_unit_fiat: tx.price_per_unit_fiat,
          total_fiat: tx.total_fiat,
          timestamp: tx.timestamp,
        }));

        const result = computeAssetMetrics(txs, currentPrice);

        if (!cancelled) {
          setMetrics(result);
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
  }, [assetSymbol, currentPrice, activePortfolioId]);

  return { metrics, loading, error };
}
