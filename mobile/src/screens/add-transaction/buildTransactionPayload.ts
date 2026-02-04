import { TransactionType } from "@/src/types/transaction";

type BuildTransactionPayloadParams = {
  activePortfolioId: string;
  assetSymbol: string;
  type: TransactionType;
  amountNum: number;
  priceNum: number;
  feeNum: number | null;
  notes: string;
  timestamp: number;
  totalFiatAbs: number;
  computedTotalFiatAbs: string;
  convertToUsd: (value: number) => number;
};

export function buildTransactionPayload({
  activePortfolioId,
  assetSymbol,
  type,
  amountNum,
  priceNum,
  feeNum,
  notes,
  timestamp,
  totalFiatAbs,
  computedTotalFiatAbs,
  convertToUsd,
}: BuildTransactionPayloadParams) {
  const signedAmount = type === "BUY" ? amountNum : -amountNum;
  const normalizedTotalFiatAbs = Number.isFinite(totalFiatAbs)
    ? totalFiatAbs
    : Number(computedTotalFiatAbs);
  const totalFiatAbsUsd = convertToUsd(normalizedTotalFiatAbs);
  const signedTotalFiat =
    type === "BUY"
      ? -Math.abs(totalFiatAbsUsd)
      : Math.abs(totalFiatAbsUsd);
  const priceUsd = convertToUsd(priceNum);
  const feeUsd = feeNum !== null ? convertToUsd(feeNum) : null;

  return {
    portfolio_id: activePortfolioId,
    asset_symbol: assetSymbol.trim().toUpperCase(),
    amount: signedAmount,
    price_per_unit_fiat: priceUsd,
    fiat_currency: "USD" as const,
    fee_amount: feeUsd,
    fee_currency: feeUsd ? ("USD" as const) : null,
    notes: notes.trim() ? notes.trim() : null,
    type,
    source: "MANUAL" as const,
    external_id: null,
    timestamp,
    total_fiat: Number.isFinite(signedTotalFiat) ? signedTotalFiat : undefined,
  };
}
