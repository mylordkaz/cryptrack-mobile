import { AssetMetrics, AssetTransaction } from "./types";

interface Lot {
  amount: number; // remaining amount
  price: number; // price per unit
}

export function computeAssetMetrics(
  transactions: AssetTransaction[],
  currentPrice: number,
): AssetMetrics {
  const lots: Lot[] = [];
  let head = 0;

  let amountHeld = 0;
  let realizedPnL = 0;
  let realizedCostBasis = 0;

  for (const tx of transactions) {
    if (tx.type === "BUY") {
      lots.push({
        amount: tx.amount,
        price: tx.price_per_unit_fiat,
      });

      amountHeld += tx.amount;
    }

    if (tx.type === "SELL") {
      let remainingToSell = -tx.amount; // amount is negative

      amountHeld += tx.amount; // reduce holdings

      while (remainingToSell > 0 && head < lots.length) {
        const lot = lots[head];
        const used = Math.min(lot.amount, remainingToSell);

        realizedPnL += used * (tx.price_per_unit_fiat - lot.price);
        realizedCostBasis += used * lot.price;

        lot.amount -= used;
        remainingToSell -= used;

        if (lot.amount === 0) {
          head += 1;
        }
      }
      if (remainingToSell > 0) {
        throw new Error("Invalid transaction history: sold more than owned");
      }
    }
  }

  const remainingLots = lots.slice(head);

  const investedFiat = remainingLots.reduce(
    (sum, lot) => sum + lot.amount * lot.price,
    0,
  );

  const avgBuyPrice = amountHeld > 0 ? investedFiat / amountHeld : null;

  const unrealizedPnL =
    amountHeld > 0 ? amountHeld * (currentPrice - (avgBuyPrice ?? 0)) : 0;

  return {
    amountHeld,
    investedFiat,
    avgBuyPrice,
    realizedPnL,
    realizedCostBasis,
    unrealizedPnL,
  };
}
