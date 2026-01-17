export const TRANSACTIONS_SCHEMA = `
CREATE TABLE IF NOT EXISTS transactions (
  id TEXT PRIMARY KEY NOT NULL,

  asset_symbol TEXT NOT NULL,

  amount REAL NOT NULL,
  price_per_unit_fiat REAL NOT NULL,
  fiat_currency TEXT NOT NULL,

  fee_amount REAL,
  fee_currency TEXT,

  type TEXT NOT NULL CHECK (
    type IN ('BUY', 'SELL')
  ),

  source TEXT NOT NULL CHECK (
    source IN ('MANUAL', 'WALLET', 'EXCHANGE')
  ),

  external_id TEXT,
  notes TEXT,

  timestamp INTEGER NOT NULL,
  total_fiat REAL NOT NULL,

  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_transactions_asset
  ON transactions(asset_symbol);

CREATE INDEX IF NOT EXISTS idx_transactions_timestamp
  ON transactions(timestamp);

CREATE INDEX IF NOT EXISTS idx_transactions_external
  ON transactions(external_id);
`;

export const PRICES_SCHEMA = `
  CREATE TABLE IF NOT EXISTS prices (
    id TEXT PRIMARY KEY NOT NULL,
    asset_symbol TEXT NOT NULL,
    price_fiat REAL NOT NULL,
    fiat_currency TEXT NOT NULL,
    source TEXT NOT NULL CHECK (source IN ('MANUAL', 'API')),
    timestamp INTEGER NOT NULL,
    created_at INTEGER NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_prices_symbol_ts
    ON prices(asset_symbol, timestamp);
  `;

export const COINS_METADATA_SCHEMA = `
  CREATE TABLE IF NOT EXISTS coins_metadata (
    id TEXT PRIMARY KEY NOT NULL,
    symbol TEXT NOT NULL,
    name TEXT NOT NULL,
    image_url TEXT NOT NULL,
    market_cap_rank INTEGER,
    updated_at INTEGER NOT NULL
  );

  CREATE UNIQUE INDEX IF NOT EXISTS idx_coins_symbol
    ON coins_metadata(symbol);
  `;
