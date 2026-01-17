# Asset Math

This document describes how portfolio metrics are computed for a single asset.

## Inputs

The math engine consumes a list of asset transactions and a current price.
Transactions are expected to be in chronological order (ascending timestamp).
The query layer already orders by timestamp.

Transaction fields used:
- type: BUY, SELL
- amount: signed quantity (+ for in, - for out)
- price_per_unit_fiat: unit price in fiat
- timestamp: unix ms

## FIFO Cost Basis

We keep a FIFO queue of lots. Each BUY creates a new lot.
Each SELL consumes from the oldest lots first.

Realized PnL is computed per lot consumed:

realizedPnL += usedAmount * (sellPrice - lotPrice)

If a SELL attempts to consume more than total remaining lots, the function
throws.

## Metrics

After processing all transactions:
- amountHeld: sum of remaining lots
- investedFiat: sum of remaining lot cost (amount * price)
- avgBuyPrice: investedFiat / amountHeld, or null if amountHeld == 0
- unrealizedPnL: amountHeld * (currentPrice - avgBuyPrice), or 0 if no holdings

## Signed Cash Flow

Transaction totals are stored as signed cash flow:
- BUY: negative (cash out)
- SELL: positive (cash in)

This document describes cost basis and PnL math only. Display formatting
can present absolute values while keeping signed values in storage.

## Fees

Fees are optional and currently not included in the math. They may be applied
later once fee handling rules are finalized.

## Notes and Limits

- Transfers are treated as lot movements in FIFO, which can realize PnL if a
  transfer out uses a different price. This matches the current implementation.
- The function assumes valid input types and signed amounts.
