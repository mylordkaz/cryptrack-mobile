import { beforeEach, describe, expect, it, vi } from "vitest";

const { openDatabaseAsyncMock } = vi.hoisted(() => ({
  openDatabaseAsyncMock: vi.fn(),
}));

vi.mock("expo-sqlite", () => ({
  openDatabaseAsync: openDatabaseAsyncMock,
}));

describe("initDB", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it("creates portfolio-aware schema and runs backfill migration", async () => {
    const execAsync = vi.fn(async () => undefined);
    const runAsync = vi.fn(async () => undefined);
    openDatabaseAsyncMock.mockResolvedValue({
      execAsync,
      runAsync,
    });

    const { initDB } = await import("./db");
    await initDB();

    expect(openDatabaseAsyncMock).toHaveBeenCalledWith("portfolio.db");
    expect(execAsync).toHaveBeenCalledWith(
      expect.stringContaining("CREATE TABLE IF NOT EXISTS portfolios"),
    );
    expect(runAsync).toHaveBeenCalledWith(
      expect.stringContaining("INSERT OR IGNORE INTO portfolios"),
      expect.any(Array),
    );
    expect(runAsync).toHaveBeenCalledWith(
      expect.stringContaining("UPDATE transactions"),
      ["main"],
    );
    expect(execAsync).toHaveBeenCalledWith(
      expect.stringContaining("CREATE INDEX IF NOT EXISTS idx_transactions_portfolio_ts"),
    );
  });

  it("ignores ALTER TABLE failures for existing columns", async () => {
    const execAsync = vi.fn(async (sql: string) => {
      if (
        sql.includes("ALTER TABLE transactions ADD COLUMN notes") ||
        sql.includes("ALTER TABLE transactions ADD COLUMN portfolio_id")
      ) {
        throw new Error("duplicate column");
      }
      return undefined;
    });
    const runAsync = vi.fn(async () => undefined);
    openDatabaseAsyncMock.mockResolvedValue({
      execAsync,
      runAsync,
    });

    const { initDB } = await import("./db");
    await expect(initDB()).resolves.toBeUndefined();
  });
});
