import { Transaction } from "@/src/types/transaction";

export interface TransactionDetails {
  costBasis: number | null;
  currentValue: number | null;
}

export function computeTransactionDetails(
  transaction: Transaction,
  currentPrice: number | null,
): TransactionDetails {
  const feeFiat =
    transaction.fee_currency === transaction.fiat_currency &&
    transaction.fee_amount
      ? transaction.fee_amount
      : 0;

  const costBasis =
    transaction.type === "BUY"
      ? Math.abs(transaction.amount) * transaction.price_per_unit_fiat + feeFiat
      : null;

  const currentValue =
    currentPrice !== null
      ? Math.abs(transaction.amount) * currentPrice
      : null;

  return {
    costBasis,
    currentValue,
  };
}
