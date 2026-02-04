import * as SQLite from "expo-sqlite";
import {
  PORTFOLIOS_SCHEMA,
  TRANSACTIONS_SCHEMA,
  PRICES_SCHEMA,
  COINS_METADATA_SCHEMA,
} from "./schema";
import { DEFAULT_PORTFOLIO_ID, DEFAULT_PORTFOLIO_NAME } from "./constants";

let db: SQLite.SQLiteDatabase | null = null;

export async function openDB(): Promise<SQLite.SQLiteDatabase> {
  if (db) return db;

  db = await SQLite.openDatabaseAsync("portfolio.db");
  return db;
}

export async function initDB(): Promise<void> {
  const database = await openDB();
  await database.execAsync(
    PORTFOLIOS_SCHEMA + TRANSACTIONS_SCHEMA + PRICES_SCHEMA + COINS_METADATA_SCHEMA,
  );

  await database.runAsync(
    `
    INSERT OR IGNORE INTO portfolios (
      id,
      name,
      created_at,
      updated_at
    ) VALUES (?, ?, ?, ?)
    `,
    [DEFAULT_PORTFOLIO_ID, DEFAULT_PORTFOLIO_NAME, Date.now(), Date.now()],
  );

  try {
    await database.execAsync(`ALTER TABLE transactions ADD COLUMN notes TEXT;`);
  } catch (error) {
    // Column already exists or table is fresh; ignore.
  }

  try {
    await database.execAsync(
      `ALTER TABLE transactions ADD COLUMN portfolio_id TEXT DEFAULT '${DEFAULT_PORTFOLIO_ID}'`,
    );
  } catch (error) {
    // Column already exists or table is fresh; ignore.
  }

  await database.runAsync(
    `
    UPDATE transactions
    SET portfolio_id = ?
    WHERE portfolio_id IS NULL OR portfolio_id = ''
    `,
    [DEFAULT_PORTFOLIO_ID],
  );

  await database.execAsync(`
    CREATE INDEX IF NOT EXISTS idx_transactions_portfolio_ts
    ON transactions(portfolio_id, timestamp);
  `);
}
