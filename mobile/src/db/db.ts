import * as SQLite from "expo-sqlite";
import { TRANSACTIONS_SCHEMA, PRICES_SCHEMA, COINS_METADATA_SCHEMA } from "./schema";

let db: SQLite.SQLiteDatabase | null = null;

export async function openDB(): Promise<SQLite.SQLiteDatabase> {
  if (db) return db;

  db = await SQLite.openDatabaseAsync("portfolio.db");
  return db;
}

export async function initDB(): Promise<void> {
  const database = await openDB();
  await database.execAsync(TRANSACTIONS_SCHEMA + PRICES_SCHEMA + COINS_METADATA_SCHEMA);

  try {
    await database.execAsync(`ALTER TABLE transactions ADD COLUMN notes TEXT;`);
  } catch (error) {
    // Column already exists or table is fresh; ignore.
  }
}
