import { useEffect, useState } from "react";
import { getAllTransactionsOrdered } from "@/src/db/transactions";
import { getCoinsBySymbols } from "@/src/db/coins";
import { Transaction } from "@/src/types/transaction";
import AsyncStorage from "@react-native-async-storage/async-storage";

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
const MS_PER_DAY = 24 * 60 * 60 * 1000;
const HISTORY_CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const HISTORY_CACHE_PREFIX = "history-cache:";
const HISTORY_FETCH_PREFIX = "history-fetched-at:";

const toDayStartUTC = (timestamp: number) => {
  const date = new Date(timestamp);
  return Date.UTC(
    date.getUTCFullYear(),
    date.getUTCMonth(),
    date.getUTCDate(),
  );
};

const buildDayRange = (days: number) => {
  const end = toDayStartUTC(Date.now());
  const start = end - (days - 1) * MS_PER_DAY;
  const range: number[] = [];
  for (let i = 0; i < days; i += 1) {
    range.push(start + i * MS_PER_DAY);
  }
  return range;
};

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

export function usePortfolioHistory(symbols: string[]) {
  const [data, setData] = useState<Array<{ x: number; y: number }>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const normalizedSymbols = Array.from(
    new Set(symbols.map((s) => s.toUpperCase())),
  );
  const symbolsKey = normalizedSymbols.sort().join(",");

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

        const transactions = await getAllTransactionsOrdered();
        const symbols = normalizedSymbols;

        if (symbols.length === 0) {
          if (!cancelled) {
            setData([]);
            setLoading(false);
          }
          return;
        }

        const metadata = await getCoinsBySymbols(symbols);
        const historyBySymbol = new Map<string, Map<number, number>>();
        const symbolToId = new Map<string, string>();

        for (const symbol of symbols) {
          const meta = metadata.get(symbol);
          if (!meta?.id) continue;
          symbolToId.set(symbol, meta.id);
        }

        const uniqueIds = Array.from(new Set(symbolToId.values()));
        const cacheKeys = uniqueIds.map(
          (id) => `${HISTORY_CACHE_PREFIX}${id}:${HISTORY_DAYS}:${HISTORY_INTERVAL}`,
        );
        const timeKeys = uniqueIds.map(
          (id) => `${HISTORY_FETCH_PREFIX}${id}:${HISTORY_DAYS}:${HISTORY_INTERVAL}`,
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
          const cacheKey = `${HISTORY_CACHE_PREFIX}${id}:${HISTORY_DAYS}:${HISTORY_INTERVAL}`;
          const timeKey = `${HISTORY_FETCH_PREFIX}${id}:${HISTORY_DAYS}:${HISTORY_INTERVAL}`;
          const cached = cacheMap.get(cacheKey);
          const fetchedAtRaw = cacheMap.get(timeKey);
          const fetchedAt = fetchedAtRaw ? Number(fetchedAtRaw) : null;
          const isFresh =
            fetchedAt !== null &&
            !Number.isNaN(fetchedAt) &&
            now - fetchedAt < HISTORY_CACHE_TTL_MS;

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
              const cacheKey = `${HISTORY_CACHE_PREFIX}${id}:${HISTORY_DAYS}:${HISTORY_INTERVAL}`;
              const timeKey = `${HISTORY_FETCH_PREFIX}${id}:${HISTORY_DAYS}:${HISTORY_INTERVAL}`;
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
            priceMap.set(toDayStartUTC(point.timestamp), point.price);
          }
          historyBySymbol.set(symbol, priceMap);
        }

        const symbolSet = new Set(symbols);
        const txBySymbol = new Map<string, Transaction[]>();
        for (const tx of transactions) {
          const symbol = tx.asset_symbol.toUpperCase();
          if (!symbolSet.has(symbol)) continue;
          const list = txBySymbol.get(symbol) ?? [];
          list.push(tx);
          txBySymbol.set(symbol, list);
        }

        const dayStarts = buildDayRange(HISTORY_DAYS);
        const symbolsList = symbols;
        const txIndices = new Map<string, number>();
        const holdings = new Map<string, number>();
        const lastPrices = new Map<string, number>();

        for (const symbol of symbolsList) {
          txIndices.set(symbol, 0);
          holdings.set(symbol, 0);
        }

        const series = dayStarts.map((dayStart) => {
          const dayEnd = dayStart + MS_PER_DAY - 1;
          let total = 0;

          for (const symbol of symbolsList) {
            const txs = txBySymbol.get(symbol) ?? [];
            let index = txIndices.get(symbol) ?? 0;
            let holding = holdings.get(symbol) ?? 0;

            while (index < txs.length && txs[index].timestamp <= dayEnd) {
              holding += txs[index].amount;
              index += 1;
            }

            txIndices.set(symbol, index);
            holdings.set(symbol, holding);

            const priceMap = historyBySymbol.get(symbol);
            const dayPrice = priceMap?.get(dayStart);
            if (dayPrice !== undefined) {
              lastPrices.set(symbol, dayPrice);
            }

            const price = dayPrice ?? lastPrices.get(symbol) ?? 0;
            total += holding * price;
          }

          return { x: dayStart, y: Math.max(0, total) };
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
  }, [symbolsKey]);

  return { data, loading, error };
}
