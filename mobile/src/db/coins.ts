import { openDB } from "./db";

export type CoinMetadata = {
  id: string;
  symbol: string;
  name: string;
  image_url: string;
  market_cap_rank: number | null;
  updated_at: number;
};

const CACHE_MAX_AGE_MS = 24 * 60 * 60 * 1000; // 24 hours

export async function saveCoinsBatch(
  coins: Array<{
    id: string;
    symbol: string;
    name: string;
    image: string;
    market_cap_rank?: number;
  }>
): Promise<void> {
  const db = await openDB();
  const now = Date.now();

  const placeholders = coins.map(() => "(?, ?, ?, ?, ?, ?)").join(", ");
  const values = coins.flatMap((coin) => [
    coin.id,
    coin.symbol.toUpperCase(),
    coin.name,
    coin.image,
    coin.market_cap_rank ?? null,
    now,
  ]);

  await db.runAsync(
    `INSERT OR REPLACE INTO coins_metadata (id, symbol, name, image_url, market_cap_rank, updated_at)
     VALUES ${placeholders}`,
    values
  );
}

export async function getAllCoins(): Promise<CoinMetadata[]> {
  const db = await openDB();
  const rows = await db.getAllAsync<CoinMetadata>(
    `SELECT * FROM coins_metadata ORDER BY market_cap_rank ASC NULLS LAST`
  );
  return rows;
}

export async function getCoinBySymbol(symbol: string): Promise<CoinMetadata | null> {
  const db = await openDB();
  const row = await db.getFirstAsync<CoinMetadata>(
    `SELECT * FROM coins_metadata WHERE symbol = ?`,
    [symbol.toUpperCase()]
  );
  return row ?? null;
}

export async function getCoinsBySymbols(symbols: string[]): Promise<Map<string, CoinMetadata>> {
  if (symbols.length === 0) return new Map();

  const db = await openDB();
  const upperSymbols = symbols.map((s) => s.toUpperCase());
  const placeholders = upperSymbols.map(() => "?").join(", ");

  const rows = await db.getAllAsync<CoinMetadata>(
    `SELECT * FROM coins_metadata WHERE symbol IN (${placeholders})`,
    upperSymbols
  );

  const map = new Map<string, CoinMetadata>();
  for (const row of rows) {
    map.set(row.symbol, row);
  }
  return map;
}

export async function isCoinsCacheStale(): Promise<boolean> {
  const db = await openDB();
  const row = await db.getFirstAsync<{ updated_at: number }>(
    `SELECT updated_at FROM coins_metadata ORDER BY updated_at DESC LIMIT 1`
  );

  if (!row) return true;

  const age = Date.now() - row.updated_at;
  return age > CACHE_MAX_AGE_MS;
}

export async function getCoinsCount(): Promise<number> {
  const db = await openDB();
  const row = await db.getFirstAsync<{ count: number }>(
    `SELECT COUNT(*) as count FROM coins_metadata`
  );
  return row?.count ?? 0;
}
