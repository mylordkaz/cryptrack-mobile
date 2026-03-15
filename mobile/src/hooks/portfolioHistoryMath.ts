import { Transaction } from "@/src/types/transaction";

export type HistoryPriceMap = Map<string, Map<number, number>>;

export const toDayStartLocal = (timestamp: number) => {
  const date = new Date(timestamp);
  return new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
  ).getTime();
};

export const buildDayRange = (days: number, nowMs: number = Date.now()) => {
  const range: number[] = [];
  const end = new Date(nowMs);
  end.setHours(0, 0, 0, 0);

  for (let i = days - 1; i >= 0; i -= 1) {
    const day = new Date(end);
    day.setDate(end.getDate() - i);
    range.push(day.getTime());
  }

  return range;
};

type BuildPortfolioHistorySeriesParams = {
  days: number;
  symbols: string[];
  transactions: Transaction[];
  historyBySymbol: HistoryPriceMap;
  latestPriceBySymbol?: Record<string, number>;
  nowMs?: number;
};

export function buildPortfolioHistorySeries({
  days,
  symbols,
  transactions,
  historyBySymbol,
  latestPriceBySymbol = {},
  nowMs = Date.now(),
}: BuildPortfolioHistorySeriesParams) {
  const dayStarts = buildDayRange(days, nowMs);
  const lastDayStart = dayStarts[dayStarts.length - 1] ?? toDayStartLocal(nowMs);
  const symbolSet = new Set(symbols);
  const txBySymbol = new Map<string, Transaction[]>();

  for (const tx of transactions) {
    const symbol = tx.asset_symbol.toUpperCase();
    if (!symbolSet.has(symbol)) continue;

    const list = txBySymbol.get(symbol) ?? [];
    list.push(tx);
    txBySymbol.set(symbol, list);
  }

  for (const txs of txBySymbol.values()) {
    txs.sort((a, b) => a.timestamp - b.timestamp);
  }

  const txIndices = new Map<string, number>();
  const holdings = new Map<string, number>();
  const lastTransactionPrices = new Map<string, number>();
  const lastPrices = new Map<string, number>();

  for (const symbol of symbols) {
    txIndices.set(symbol, 0);
    holdings.set(symbol, 0);
  }

  return dayStarts.map((dayStart) => {
    let total = 0;

    for (const symbol of symbols) {
      const txs = txBySymbol.get(symbol) ?? [];
      let index = txIndices.get(symbol) ?? 0;
      let holding = holdings.get(symbol) ?? 0;

      while (
        index < txs.length &&
        toDayStartLocal(txs[index].timestamp) <= dayStart
      ) {
        holding += txs[index].amount;
        if (
          Number.isFinite(txs[index].price_per_unit_fiat) &&
          txs[index].price_per_unit_fiat > 0
        ) {
          lastTransactionPrices.set(symbol, txs[index].price_per_unit_fiat);
        }
        index += 1;
      }

      txIndices.set(symbol, index);
      holdings.set(symbol, holding);

      const priceMap = historyBySymbol.get(symbol);
      const hasHistoricalPrice = Boolean(priceMap && priceMap.size > 0);
      const fallbackLatestPrice =
        dayStart === lastDayStart && hasHistoricalPrice
          ? latestPriceBySymbol[symbol]
          : undefined;
      const dayPrice =
        priceMap?.get(dayStart) ??
        fallbackLatestPrice ??
        lastTransactionPrices.get(symbol);

      if (dayPrice !== undefined && Number.isFinite(dayPrice)) {
        lastPrices.set(symbol, dayPrice);
      }

      const price = lastPrices.get(symbol) ?? 0;
      total += holding * price;
    }

    return { x: dayStart, y: Math.max(0, total) };
  });
}
