import { useEffect, useState } from "react";
import { getAllTransactionsOrdered } from "@/src/db/transactions";
import { getCoinsBySymbols } from "@/src/db/coins";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  buildHistoryCacheKey,
  buildHistoryFetchKey,
  isHistoryCacheStale,
} from "@/src/hooks/historyCache";
import {
  buildPortfolioHistorySeries,
  HistoryPriceMap,
  toDayStartLocal,
} from "@/src/hooks/portfolioHistoryMath";
import { usePortfolio } from "@/src/portfolio";

type HistoryPoint = {
  timestamp: number;
  price: number;
};

type HistoryResponse = {
  id: string;
  days: string;
  interval?: string;
  prices: HistoryPoint[];
};

const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_BASE_URL ?? "http://localhost:8080";
const HISTORY_DAYS = 365;
const HISTORY_INTERVAL = "daily";

const FETCH_TIMEOUT_MS = 12000;

async function fetchWithTimeout(url: string, timeoutMs: number) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, { signal: controller.signal });
  } finally {
    clearTimeout(timeoutId);
  }
}

export function usePortfolioHistory(
  symbols: string[],
  latestPriceBySymbol: Record<string, number> = {},
) {
  const [data, setData] = useState<Array<{ x: number; y: number }>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const { activePortfolioId, transactionVersion } = usePortfolio();
  const normalizedSymbols = Array.from(
    new Set(symbols.map((s) => s.toUpperCase())),
  );
  const symbolsKey = normalizedSymbols.sort().join(",");
  const latestPriceKey = normalizedSymbols
    .map((symbol) => `${symbol}:${latestPriceBySymbol[symbol] ?? ""}`)
    .join(",");

  useEffect(() => {
    let cancelled = false;

    if (normalizedSymbols.length === 0) {
      setData([]);
      setError(null);
      setLoading(false);
      return () => {
        cancelled = true;
      };
    }

    (async () => {
      try {
        setLoading(true);
        setError(null);

        const transactions = await getAllTransactionsOrdered(activePortfolioId);
        const symbols = normalizedSymbols;

        if (symbols.length === 0) {
          if (!cancelled) {
            setData([]);
            setLoading(false);
          }
          return;
        }

        const metadata = await getCoinsBySymbols(symbols);
        const historyBySymbol: HistoryPriceMap = new Map();
        const symbolToId = new Map<string, string>();

        for (const symbol of symbols) {
          const meta = metadata.get(symbol);
          if (!meta?.id) continue;
          symbolToId.set(symbol, meta.id);
        }

        const uniqueIds = Array.from(new Set(symbolToId.values()));
        const cacheKeys = uniqueIds.map((id) =>
          buildHistoryCacheKey(id, HISTORY_DAYS, HISTORY_INTERVAL),
        );
        const timeKeys = uniqueIds.map((id) =>
          buildHistoryFetchKey(id, HISTORY_DAYS, HISTORY_INTERVAL),
        );

        const cacheEntries = await AsyncStorage.multiGet([
          ...cacheKeys,
          ...timeKeys,
        ]);
        const cacheMap = new Map<string, string>();
        for (const [key, value] of cacheEntries) {
          if (value != null) {
            cacheMap.set(key, value);
          }
        }

        const now = Date.now();
        const historiesById = new Map<string, HistoryResponse>();
        const missingIds: string[] = [];

        for (const id of uniqueIds) {
          const cacheKey = buildHistoryCacheKey(
            id,
            HISTORY_DAYS,
            HISTORY_INTERVAL,
          );
          const timeKey = buildHistoryFetchKey(
            id,
            HISTORY_DAYS,
            HISTORY_INTERVAL,
          );
          const cached = cacheMap.get(cacheKey);
          const fetchedAtRaw = cacheMap.get(timeKey);
          const fetchedAt = fetchedAtRaw ? Number(fetchedAtRaw) : null;
          const isFresh = !isHistoryCacheStale(fetchedAt, now);

          if (cached) {
            try {
              const parsed = JSON.parse(cached) as HistoryResponse;
              historiesById.set(id, parsed);
              if (isFresh) {
                continue;
              }
            } catch {
              // fall through to fetch
            }
          }
          missingIds.push(id);
        }

        if (missingIds.length > 0) {
          const response = await fetchWithTimeout(
            `${API_BASE_URL}/prices/history/batch?cmc_ids=${missingIds.join(",")}&days=${HISTORY_DAYS}&interval=${HISTORY_INTERVAL}`,
            FETCH_TIMEOUT_MS,
          );
          if (response.ok) {
            const payload = (await response.json()) as {
              histories?: Record<string, HistoryResponse>;
            };
            const histories = payload.histories ?? {};
            const nowStr = String(Date.now());
            const sets: Array<[string, string]> = [];

            for (const [id, history] of Object.entries(histories)) {
              historiesById.set(id, history);
              const cacheKey = buildHistoryCacheKey(
                id,
                HISTORY_DAYS,
                HISTORY_INTERVAL,
              );
              const timeKey = buildHistoryFetchKey(
                id,
                HISTORY_DAYS,
                HISTORY_INTERVAL,
              );
              sets.push([cacheKey, JSON.stringify(history)]);
              sets.push([timeKey, nowStr]);
            }

            if (sets.length > 0) {
              await AsyncStorage.multiSet(sets);
            }
          }
        }

        for (const [symbol, id] of symbolToId.entries()) {
          const history = historiesById.get(id);
          if (!history) continue;
          const priceMap = new Map<number, number>();
          for (const point of history.prices ?? []) {
            priceMap.set(toDayStartLocal(point.timestamp), point.price);
          }
          historyBySymbol.set(symbol, priceMap);
        }

        const series = buildPortfolioHistorySeries({
          days: HISTORY_DAYS,
          symbols,
          transactions,
          historyBySymbol,
          latestPriceBySymbol,
        });

        if (!cancelled) {
          setData(series);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err as Error);
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
  }, [symbolsKey, activePortfolioId, transactionVersion, latestPriceKey]);

  return { data, loading, error };
}
