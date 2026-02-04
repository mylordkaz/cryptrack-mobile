import { openDB } from "./db";
import { Portfolio } from "@/src/types/portfolio";
import { DEFAULT_PORTFOLIO_ID, DEFAULT_PORTFOLIO_NAME } from "./constants";

export { DEFAULT_PORTFOLIO_ID, DEFAULT_PORTFOLIO_NAME } from "./constants";

export async function ensureDefaultPortfolio(): Promise<void> {
  const db = await openDB();
  const now = Date.now();

  await db.runAsync(
    `
    INSERT OR IGNORE INTO portfolios (
      id,
      name,
      created_at,
      updated_at
    ) VALUES (?, ?, ?, ?)
    `,
    [DEFAULT_PORTFOLIO_ID, DEFAULT_PORTFOLIO_NAME, now, now],
  );
}

export async function getOrCreateDefaultPortfolioId(): Promise<string> {
  await ensureDefaultPortfolio();
  return DEFAULT_PORTFOLIO_ID;
}

export async function getAllPortfolios(): Promise<Portfolio[]> {
  const db = await openDB();
  const rows = await db.getAllAsync<Portfolio>(
    `
    SELECT
      id,
      name,
      created_at,
      updated_at
    FROM portfolios
    ORDER BY created_at ASC
    `,
  );

  return rows;
}
