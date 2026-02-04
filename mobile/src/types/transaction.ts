export type TransactionType = "BUY" | "SELL";
export type TransactionSource = "MANUAL" | "WALLET" | "EXCHANGE";

export interface Transaction {
  id: string;
  portfolio_id: string;
  asset_symbol: string;

  /** Signed amount: +in / -out */
  amount: number;

  price_per_unit_fiat: number;
  total_fiat: number;

  fiat_currency: string;

  fee_amount: number | null;
  fee_currency: string | null;

  notes: string | null;

  type: TransactionType;
  source: TransactionSource;

  external_id: string | null;

  /** Unix timestamp in ms */
  timestamp: number;
  created_at: number;
  updated_at: number;
}
