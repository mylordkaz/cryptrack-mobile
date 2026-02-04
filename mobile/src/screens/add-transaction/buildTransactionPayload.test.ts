import { describe, expect, it } from "vitest";
import { buildTransactionPayload } from "./buildTransactionPayload";

describe("buildTransactionPayload", () => {
  it("includes active portfolio id and converts values to USD", () => {
    const payload = buildTransactionPayload({
      activePortfolioId: "p-1",
      assetSymbol: " btc ",
      type: "BUY",
      amountNum: 2,
      priceNum: 100,
      feeNum: 3,
      notes: "  test  ",
      timestamp: 1_700_000_000_000,
      totalFiatAbs: 203,
      computedTotalFiatAbs: "203",
      convertToUsd: (value) => value / 2,
    });

    expect(payload.portfolio_id).toBe("p-1");
    expect(payload.asset_symbol).toBe("BTC");
    expect(payload.price_per_unit_fiat).toBe(50);
    expect(payload.fee_amount).toBe(1.5);
    expect(payload.total_fiat).toBe(-101.5);
    expect(payload.fee_currency).toBe("USD");
    expect(payload.notes).toBe("test");
  });

  it("creates SELL payload with positive total_fiat and null fee currency", () => {
    const payload = buildTransactionPayload({
      activePortfolioId: "main",
      assetSymbol: "ETH",
      type: "SELL",
      amountNum: 1,
      priceNum: 2000,
      feeNum: null,
      notes: " ",
      timestamp: 1_700_000_000_000,
      totalFiatAbs: Number.NaN,
      computedTotalFiatAbs: "2000",
      convertToUsd: (value) => value,
    });

    expect(payload.amount).toBe(-1);
    expect(payload.total_fiat).toBe(2000);
    expect(payload.fee_currency).toBeNull();
    expect(payload.notes).toBeNull();
  });
});
