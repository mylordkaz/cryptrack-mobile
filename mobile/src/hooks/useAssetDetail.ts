import { useEffect, useState } from "react";
import { computeAssetMetrics } from "../math/assetMath";
import { AssetMetrics, AssetTransaction } from "../math/types";
import { getTransactionsByAsset } from "../db/transactions";
import { getLatestPrices } from "../db/prices";
import { Transaction } from "../types/transaction";

type AssetDetailData = {
  metrics: AssetMetrics;
  currentPrice: number | null;
  transactions: Transaction[];
  transactionCount: number;
  firstTransactionAt: number | null;
};

export function useAssetDetail(
  assetSymbol: string,
  priceMap?: Record<string, number>,
  refreshKey?: number,
) {
  const [data, setData] = useState<AssetDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        if (!assetSymbol) {
          if (!cancelled) {
            setData(null);
            setError(null);
            setLoading(false);
          }
          return;
        }

        setLoading(true);
        setError(null);

        const rows = await getTransactionsByAsset(assetSymbol);
        const txs: AssetTransaction[] = rows.map((tx) => ({
          type: tx.type,
          amount: tx.amount,
          price_per_unit_fiat: tx.price_per_unit_fiat,
          total_fiat: tx.total_fiat,
          timestamp: tx.timestamp,
        }));

        const lastKnown = await getLatestPrices([assetSymbol]);
        const currentPrice =
          priceMap?.[assetSymbol] ?? lastKnown[assetSymbol]?.price_fiat ?? null;

        const metrics = computeAssetMetrics(txs, currentPrice ?? 0);

        if (!cancelled) {
          setData({
            metrics,
            currentPrice,
            transactions: [...rows].reverse(),
            transactionCount: rows.length,
            firstTransactionAt: rows[0]?.timestamp ?? null,
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
  }, [assetSymbol, priceMap, refreshKey]);

  return { data, loading, error };
}
