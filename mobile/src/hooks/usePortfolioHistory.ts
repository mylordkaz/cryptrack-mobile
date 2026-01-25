import { useEffect, useState } from "react";
import { getAllTransactionsOrdered } from "@/src/db/transactions";
import { getCoinsBySymbols } from "@/src/db/coins";
import { Transaction } from "@/src/types/transaction";

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
const MS_PER_DAY = 24 * 60 * 60 * 1000;

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

        await Promise.all(
          symbols.map(async (symbol) => {
            const meta = metadata.get(symbol);
            if (!meta) return;

            const response = await fetchWithTimeout(
              `${API_BASE_URL}/prices/history?cmc_id=${meta.id}&days=${HISTORY_DAYS}&interval=daily`,
              FETCH_TIMEOUT_MS,
            );
            if (!response.ok) return;

            const payload = (await response.json()) as HistoryResponse;
            const priceMap = new Map<number, number>();

            for (const point of payload.prices ?? []) {
              priceMap.set(toDayStartUTC(point.timestamp), point.price);
            }

            historyBySymbol.set(symbol, priceMap);
          }),
        );

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
