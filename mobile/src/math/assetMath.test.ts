import { describe, it, expect } from "vitest";
import { computeAssetMetrics } from "./assetMath";
import { AssetTransaction } from "./types";

describe("computeAssetMetrics (FIFO)", () => {
  it("handles partial sells correctly", () => {
    const txs: AssetTransaction[] = [
      {
        type: "BUY",
        amount: 1,
        price_per_unit_fiat: 90_000,
        total_fiat: 90_000,
        timestamp: 1,
      },
      {
        type: "BUY",
        amount: 1,
        price_per_unit_fiat: 100_000,
        total_fiat: 100_000,
        timestamp: 2,
      },
      {
        type: "SELL",
        amount: -1.5,
        price_per_unit_fiat: 110_000,
        total_fiat: -165_000,
        timestamp: 3,
      },
    ];

    const result = computeAssetMetrics(txs, 120_000);

    expect(result.amountHeld).toBe(0.5);
    expect(result.realizedPnL).toBe(
      1 * (110_000 - 90_000) + 0.5 * (110_000 - 100_000),
    );
    expect(result.realizedCostBasis).toBe(1 * 90_000 + 0.5 * 100_000);
    expect(result.avgBuyPrice).toBe(100_000);
    expect(result.unrealizedPnL).toBe(0.5 * (120_000 - 100_000));
  });

  it("throws when selling more than owned", () => {
    const txs: AssetTransaction[] = [
      {
        type: "BUY",
        amount: 1,
        price_per_unit_fiat: 100_000,
        total_fiat: 100_000,
        timestamp: 1,
      },
      {
        type: "SELL",
        amount: -2,
        price_per_unit_fiat: 110_000,
        total_fiat: -220_000,
        timestamp: 2,
      },
    ];

    expect(() => computeAssetMetrics(txs, 120_000)).toThrow(
      "Invalid transaction history: sold more than owned",
    );
  });

  it("returns null avgBuyPrice and zero unrealizedPnL when fully sold", () => {
    const txs: AssetTransaction[] = [
      {
        type: "BUY",
        amount: 1,
        price_per_unit_fiat: 80_000,
        total_fiat: 80_000,
        timestamp: 1,
      },
      {
        type: "SELL",
        amount: -1,
        price_per_unit_fiat: 100_000,
        total_fiat: -100_000,
        timestamp: 2,
      },
    ];

    const result = computeAssetMetrics(txs, 90_000);

    expect(result.amountHeld).toBe(0);
    expect(result.avgBuyPrice).toBeNull();
    expect(result.unrealizedPnL).toBe(0);
  });

  it("sorts out-of-order timestamps before computing", () => {
    const txs: AssetTransaction[] = [
      {
        type: "SELL",
        amount: -1,
        price_per_unit_fiat: 120_000,
        total_fiat: -120_000,
        timestamp: 3,
      },
      {
        type: "BUY",
        amount: 2,
        price_per_unit_fiat: 100_000,
        total_fiat: 200_000,
        timestamp: 1,
      },
      {
        type: "BUY",
        amount: 1,
        price_per_unit_fiat: 110_000,
        total_fiat: 110_000,
        timestamp: 2,
      },
    ];

    const sorted = [...txs].sort((a, b) => a.timestamp - b.timestamp);
    const result = computeAssetMetrics(sorted, 130_000);

    expect(result.amountHeld).toBe(2);
    expect(result.realizedPnL).toBe(1 * (120_000 - 100_000));
    expect(result.avgBuyPrice).toBe(105_000);
  });

  it("computes investedFiat from remaining lots", () => {
    const txs: AssetTransaction[] = [
      {
        type: "BUY",
        amount: 2,
        price_per_unit_fiat: 10_000,
        total_fiat: 20_000,
        timestamp: 1,
      },
      {
        type: "BUY",
        amount: 1,
        price_per_unit_fiat: 12_000,
        total_fiat: 12_000,
        timestamp: 2,
      },
      {
        type: "SELL",
        amount: -2.5,
        price_per_unit_fiat: 11_000,
        total_fiat: -27_500,
        timestamp: 3,
      },
    ];

    const result = computeAssetMetrics(txs, 9_000);

    expect(result.amountHeld).toBe(0.5);
    expect(result.investedFiat).toBe(6_000);
  });
});
