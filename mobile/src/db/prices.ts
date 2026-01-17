import { uuid } from "../utils/uuid";
import { openDB } from "./db";

export type PriceRow = {
  asset_symbol: string;
  price_fiat: number;
  fiat_currency: string;
  source: "MANUAL" | "API";
  timestamp: number;
};

export async function insertPrices(row: PriceRow) {
  const db = await openDB();
  const now = Date.now();

  await db.runAsync(
    `
      INSERT INTO prices (
        id, asset_symbol, price_fiat, fiat_currency, source, timestamp, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `,
    [
      await uuid(),
      row.asset_symbol,
      row.price_fiat,
      row.fiat_currency,
      row.source,
      row.timestamp,
      now,
    ],
  );
}

export async function insertPricesBatch(rows: PriceRow[]) {
  if (rows.length === 0) return;

  const db = await openDB();
  const now = Date.now();

  await db.withTransactionAsync(async () => {
    for (const row of rows) {
      await db.runAsync(
        `
          INSERT INTO prices (
            id, asset_symbol, price_fiat, fiat_currency, source, timestamp, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?)
          `,
        [
          await uuid(),
          row.asset_symbol,
          row.price_fiat,
          row.fiat_currency,
          row.source,
          row.timestamp,
          now,
        ],
      );
    }
  });
}

export async function getLatestPrices(
  symbols: string[],
): Promise<Record<string, PriceRow>> {
  if (symbols.length === 0) return {};

  const db = await openDB();
  const placeholders = symbols.map(() => "?").join(", ");

  const rows = await db.getAllAsync<PriceRow>(
    `
      SELECT p1.asset_symbol, p1.price_fiat, p1.fiat_currency, p1.source, p1.timestamp
      FROM prices p1
      JOIN (
        SELECT asset_symbol, MAX(timestamp) AS ts
        FROM prices
        WHERE asset_symbol IN (${placeholders})
        GROUP BY asset_symbol
      ) p2
      ON p1.asset_symbol = p2.asset_symbol AND p1.timestamp = p2.ts
      `,
    symbols,
  );

  const map: Record<string, PriceRow> = {};
  for (const row of rows) map[row.asset_symbol] = row;
  return map;
}

export async function getAllPriceSymbols(): Promise<string[]> {
  const db = await openDB();

  const rows = await db.getAllAsync<{ asset_symbol: string }>(
    `
      SELECT DISTINCT asset_symbol
      FROM prices
      ORDER BY asset_symbol ASC
      `,
  );

  return rows.map((row) => row.asset_symbol);
}
