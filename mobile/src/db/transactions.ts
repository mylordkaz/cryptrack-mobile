import { Transaction, TransactionType } from "../types/transaction";
import { uuid } from "../utils/uuid";
import { openDB } from "./db";

function assertAmountSign(type: TransactionType, amount: number) {
  if (type === "BUY" && amount <= 0) {
    throw new Error(`${type} must have a positive amount`);
  }

  if (type === "SELL" && amount >= 0) {
    throw new Error(`${type} must have a negative amount`);
  }
}

export async function insertTransaction(
  tx: Omit<Transaction, "id" | "created_at" | "updated_at" | "total_fiat"> & {
    total_fiat?: number;
  },
): Promise<Transaction> {
  const db = await openDB();

  // Invariants
  assertAmountSign(tx.type, tx.amount);

  if (tx.price_per_unit_fiat <= 0) {
    throw new Error("price_per_unit_fiat must be > 0");
  }

  if (!tx.asset_symbol) {
    throw new Error("asset_symbol is required");
  }

  const now = Date.now();

  // const totalFiat =
  //   tx.amount * tx.price_per_unit_fiat +
  //   (tx.fee_currency === tx.fiat_currency && tx.fee_amount ? tx.fee_amount : 0);
  const feeFiat =
    tx.fee_currency === tx.fiat_currency && tx.fee_amount ? tx.fee_amount : 0;

  const computedTotalFiat = -tx.amount * tx.price_per_unit_fiat - feeFiat;
  const totalFiat = tx.total_fiat ?? computedTotalFiat;

  const fullTx: Transaction = {
    ...tx,
    id: await uuid(),
    total_fiat: totalFiat,
    created_at: now,
    updated_at: now,
  };

  await db.runAsync(
    `
    INSERT INTO transactions (
      id,
      asset_symbol,
      amount,
      price_per_unit_fiat,
      fiat_currency,
      fee_amount,
      fee_currency,
      notes,
      type,
      source,
      external_id,
      timestamp,
      total_fiat,
      created_at,
      updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [
      fullTx.id,
      fullTx.asset_symbol,
      fullTx.amount,
      fullTx.price_per_unit_fiat,
      fullTx.fiat_currency,
      fullTx.fee_amount,
      fullTx.fee_currency,
      fullTx.notes,
      fullTx.type,
      fullTx.source,
      fullTx.external_id,
      fullTx.timestamp,
      fullTx.total_fiat,
      fullTx.created_at,
      fullTx.updated_at,
    ],
  );

  return fullTx;
}

export async function getTransactionsByAsset(
  assetSymbol: string,
): Promise<Transaction[]> {
  const db = await openDB();

  const rows = await db.getAllAsync<Transaction>(
    `
    SELECT
      id,
      asset_symbol,
      amount,
      price_per_unit_fiat,
      fiat_currency,
      fee_amount,
      fee_currency,
      notes,
      type,
      source,
      external_id,
      timestamp,
      total_fiat,
      created_at,
      updated_at
    FROM transactions
    WHERE asset_symbol = ?
    ORDER BY timestamp ASC
    `,
    [assetSymbol],
  );

  return rows;
}

export async function getAllUniqueAssets(): Promise<string[]> {
  const db = await openDB();

  const rows = await db.getAllAsync<{ asset_symbol: string }>(
    `
    SELECT DISTINCT asset_symbol
    FROM transactions
    ORDER BY asset_symbol ASC
    `,
  );

  return rows.map((row) => row.asset_symbol);
}

export async function getAllTransactionsOrdered(): Promise<Transaction[]> {
  const db = await openDB();

  const rows = await db.getAllAsync<Transaction>(
    `
    SELECT
      id,
      asset_symbol,
      amount,
      price_per_unit_fiat,
      fiat_currency,
      fee_amount,
      fee_currency,
      notes,
      type,
      source,
      external_id,
      timestamp,
      total_fiat,
      created_at,
      updated_at
    FROM transactions
    ORDER BY asset_symbol ASC, timestamp ASC
    `,
  );

  return rows;
}

export async function getTransactionById(
  id: string,
): Promise<Transaction | null> {
  const db = await openDB();

  const row = await db.getFirstAsync<Transaction>(
    `
    SELECT
      id,
      asset_symbol,
      amount,
      price_per_unit_fiat,
      fiat_currency,
      fee_amount,
      fee_currency,
      notes,
      type,
      source,
      external_id,
      timestamp,
      total_fiat,
      created_at,
      updated_at
    FROM transactions
    WHERE id = ?
    `,
    [id],
  );

  return row ?? null;
}

export async function updateTransaction(
  id: string,
  tx: Omit<Transaction, "id" | "created_at" | "updated_at" | "total_fiat"> & {
    total_fiat?: number;
  },
): Promise<void> {
  const db = await openDB();

  assertAmountSign(tx.type, tx.amount);

  if (tx.price_per_unit_fiat <= 0) {
    throw new Error("price_per_unit_fiat must be > 0");
  }

  if (!tx.asset_symbol) {
    throw new Error("asset_symbol is required");
  }

  const now = Date.now();

  const feeFiat =
    tx.fee_currency === tx.fiat_currency && tx.fee_amount ? tx.fee_amount : 0;

  const computedTotalFiat = -tx.amount * tx.price_per_unit_fiat - feeFiat;
  const totalFiat = tx.total_fiat ?? computedTotalFiat;

  await db.runAsync(
    `
    UPDATE transactions
    SET
      asset_symbol = ?,
      amount = ?,
      price_per_unit_fiat = ?,
      fiat_currency = ?,
      fee_amount = ?,
      fee_currency = ?,
      notes = ?,
      type = ?,
      source = ?,
      external_id = ?,
      timestamp = ?,
      total_fiat = ?,
      updated_at = ?
    WHERE id = ?
    `,
    [
      tx.asset_symbol,
      tx.amount,
      tx.price_per_unit_fiat,
      tx.fiat_currency,
      tx.fee_amount,
      tx.fee_currency,
      tx.notes,
      tx.type,
      tx.source,
      tx.external_id,
      tx.timestamp,
      totalFiat,
      now,
      id,
    ],
  );
}

export async function deleteTransaction(id: string): Promise<void> {
  const db = await openDB();
  await db.runAsync(
    `
    DELETE FROM transactions
    WHERE id = ?
    `,
    [id],
  );
}
