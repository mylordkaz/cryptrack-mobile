# Mobile App (Expo / React Native)

Offline-first crypto portfolio tracker. All portfolio data is stored locally in SQLite. Backend is optional.

## Current Features (v1)

- Manual transactions (buy/sell) with optional fees.
- Portfolio math: avg cost, realized/unrealized PnL, totals.
- Portfolio overview + asset detail screens.
- Performance and allocation charts.
- Fiat display in USD/EUR/JPY (FX conversion applied at render).
- Local caching:
  - Coin metadata (7 days)
  - Latest prices (5 minutes)
  - Historical prices (24 hours)
  - FX rates (24 hours)

## Data Rules

- Transactions are the source of truth.
- All stored fiat values are **USD**.
- UI converts to selected currency on display.

## Development

```
npx expo run:ios
npx expo start --dev-client
```

## Notes

- Backend endpoints are consumed via `EXPO_PUBLIC_API_BASE_URL`.
- The app remains usable offline; backend adds live prices, metadata, and history.
