import { describe, expect, it } from "vitest";
import {
  buildDayRange,
  buildPortfolioHistorySeries,
  HistoryPriceMap,
  toDayStartLocal,
} from "./portfolioHistoryMath";
import { Transaction } from "@/src/types/transaction";

function createTransaction(
  overrides: Partial<Transaction>,
): Transaction {
  return {
    id: overrides.id ?? "tx-1",
    portfolio_id: overrides.portfolio_id ?? "main",
    asset_symbol: overrides.asset_symbol ?? "BTC",
    amount: overrides.amount ?? 1,
    price_per_unit_fiat: overrides.price_per_unit_fiat ?? 100,
    total_fiat: overrides.total_fiat ?? -100,
    fiat_currency: overrides.fiat_currency ?? "USD",
    fee_amount: overrides.fee_amount ?? null,
    fee_currency: overrides.fee_currency ?? null,
    notes: overrides.notes ?? null,
    type: overrides.type ?? "BUY",
    source: overrides.source ?? "MANUAL",
    external_id: overrides.external_id ?? null,
    timestamp: overrides.timestamp ?? new Date(2026, 1, 1, 12).getTime(),
    created_at: overrides.created_at ?? 1,
    updated_at: overrides.updated_at ?? 1,
  };
}

describe("portfolioHistoryMath", () => {
  it("applies a backdated transaction to every later chart day", () => {
    const nowMs = new Date(2026, 2, 14, 12).getTime();
    const dayStarts = buildDayRange(3, nowMs);
    const historyBySymbol: HistoryPriceMap = new Map([
      [
        "BTC",
        new Map([
          [dayStarts[0], 100],
          [dayStarts[1], 110],
          [dayStarts[2], 120],
        ]),
      ],
    ]);

    const transactions = [
      createTransaction({
        timestamp: new Date(2026, 2, 13, 9).getTime(),
        amount: 2,
        price_per_unit_fiat: 95,
        total_fiat: -190,
      }),
    ];

    const series = buildPortfolioHistorySeries({
      days: 3,
      symbols: ["BTC"],
      transactions,
      historyBySymbol,
      nowMs,
    });

    expect(series).toEqual([
      { x: dayStarts[0], y: 0 },
      { x: dayStarts[1], y: 220 },
      { x: dayStarts[2], y: 240 },
    ]);
  });

  it("treats a transaction as effective for its selected local calendar day", () => {
    const nowMs = new Date(2026, 1, 2, 12).getTime();
    const dayStarts = buildDayRange(2, nowMs);
    const historyBySymbol: HistoryPriceMap = new Map([
      [
        "BTC",
        new Map([
          [dayStarts[0], 100],
          [dayStarts[1], 120],
        ]),
      ],
    ]);

    const lateEveningTx = createTransaction({
      timestamp: new Date(2026, 1, 1, 23, 30).getTime(),
      amount: 1.5,
      total_fiat: -150,
    });

    expect(toDayStartLocal(lateEveningTx.timestamp)).toBe(dayStarts[0]);

    const series = buildPortfolioHistorySeries({
      days: 2,
      symbols: ["BTC"],
      transactions: [lateEveningTx],
      historyBySymbol,
      nowMs,
    });

    expect(series).toEqual([
      { x: dayStarts[0], y: 150 },
      { x: dayStarts[1], y: 180 },
    ]);
  });

  it("uses the latest live price for the current day when history has not caught up yet", () => {
    const nowMs = new Date(2026, 2, 14, 12).getTime();
    const dayStarts = buildDayRange(3, nowMs);
    const historyBySymbol: HistoryPriceMap = new Map([
      [
        "BTC",
        new Map([
          [dayStarts[0], 100],
          [dayStarts[1], 110],
        ]),
      ],
    ]);

    const series = buildPortfolioHistorySeries({
      days: 3,
      symbols: ["BTC"],
      transactions: [
        createTransaction({
          timestamp: new Date(2026, 2, 12, 10).getTime(),
          amount: 2,
          total_fiat: -200,
        }),
      ],
      historyBySymbol,
      latestPriceBySymbol: { BTC: 125 },
      nowMs,
    });

    expect(series).toEqual([
      { x: dayStarts[0], y: 200 },
      { x: dayStarts[1], y: 220 },
      { x: dayStarts[2], y: 250 },
    ]);
  });

  it("falls back to transaction prices instead of creating a today-only spike when history is missing", () => {
    const nowMs = new Date(2026, 2, 15, 12).getTime();
    const dayStarts = buildDayRange(7, nowMs);

    const series = buildPortfolioHistorySeries({
      days: 7,
      symbols: ["BTC"],
      transactions: [
        createTransaction({
          timestamp: new Date(2025, 11, 9, 10).getTime(),
          amount: 1,
          price_per_unit_fiat: 900,
          total_fiat: -900,
        }),
        createTransaction({
          id: "tx-2",
          timestamp: new Date(2026, 0, 16, 10).getTime(),
          amount: 1,
          price_per_unit_fiat: 1000,
          total_fiat: -1000,
        }),
        createTransaction({
          id: "tx-3",
          timestamp: new Date(2026, 1, 1, 10).getTime(),
          amount: 1,
          price_per_unit_fiat: 1100,
          total_fiat: -1100,
        }),
      ],
      historyBySymbol: new Map(),
      latestPriceBySymbol: { BTC: 2800 },
      nowMs,
    });

    expect(series).toEqual(
      dayStarts.map((dayStart) => ({ x: dayStart, y: 3300 })),
    );
  });
});
