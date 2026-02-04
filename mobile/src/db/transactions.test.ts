import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  mockDb,
  mockOpenDB,
  mockUuid,
  mockDefaultPortfolio,
} = vi.hoisted(() => {
  const db = {
    runAsync: vi.fn(),
    getAllAsync: vi.fn(),
    getFirstAsync: vi.fn(),
  };

  return {
    mockDb: db,
    mockOpenDB: vi.fn(async () => db),
    mockUuid: vi.fn(async () => "tx-1"),
    mockDefaultPortfolio: vi.fn(async () => "main"),
  };
});

vi.mock("./db", () => ({
  openDB: mockOpenDB,
}));

vi.mock("../utils/uuid", () => ({
  uuid: mockUuid,
}));

vi.mock("./portfolios", () => ({
  getOrCreateDefaultPortfolioId: mockDefaultPortfolio,
}));

import {
  getAllTransactionsOrdered,
  getTransactionById,
  insertTransaction,
  updateTransaction,
} from "./transactions";

describe("transactions portfolio scoping", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDb.runAsync.mockResolvedValue(undefined);
    mockDb.getAllAsync.mockResolvedValue([]);
    mockDb.getFirstAsync.mockResolvedValue(null);
  });

  it("uses default portfolio id on insert when none is provided", async () => {
    await insertTransaction({
      asset_symbol: "BTC",
      amount: 1,
      price_per_unit_fiat: 100_000,
      fiat_currency: "USD",
      fee_amount: null,
      fee_currency: null,
      notes: null,
      type: "BUY",
      source: "MANUAL",
      external_id: null,
      timestamp: 1_700_000_000_000,
    });

    expect(mockDefaultPortfolio).toHaveBeenCalledTimes(1);
    const insertArgs = mockDb.runAsync.mock.calls[0][1] as unknown[];
    expect(insertArgs[1]).toBe("main");
  });

  it("scopes getAllTransactionsOrdered with the active/default portfolio", async () => {
    await getAllTransactionsOrdered("p-2");
    expect(mockDb.getAllAsync).toHaveBeenCalledWith(expect.any(String), ["p-2"]);

    await getAllTransactionsOrdered();
    expect(mockDefaultPortfolio).toHaveBeenCalledTimes(1);
    expect(mockDb.getAllAsync).toHaveBeenLastCalledWith(expect.any(String), [
      "main",
    ]);
  });

  it("scopes getTransactionById by id and portfolio", async () => {
    await getTransactionById("tx-42", "p-1");
    expect(mockDb.getFirstAsync).toHaveBeenCalledWith(expect.any(String), [
      "tx-42",
      "p-1",
    ]);
  });

  it("updates portfolio_id column when updating a transaction", async () => {
    await updateTransaction("tx-1", {
      portfolio_id: "p-9",
      asset_symbol: "ETH",
      amount: -2,
      price_per_unit_fiat: 2_200,
      fiat_currency: "USD",
      fee_amount: null,
      fee_currency: null,
      notes: null,
      type: "SELL",
      source: "MANUAL",
      external_id: null,
      timestamp: 1_700_000_000_000,
    });

    const updateArgs = mockDb.runAsync.mock.calls[0][1] as unknown[];
    expect(updateArgs[0]).toBe("p-9");
  });
});
