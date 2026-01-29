# Crypto Portfolio (Mobile + Backend)

Manual-first crypto portfolio tracker with an offline-first React Native app and an optional Go backend for market data.

## Current Status (v1)

**Mobile (Expo / React Native)**
- Offline-first with SQLite as the source of truth.
- Manual transaction entry (buy/sell) with fee support.
- Portfolio math: average cost, realized/unrealized PnL, totals.
- Portfolio overview + asset detail screens.
- Charts: performance + allocation.
- Fiat currency display (USD/EUR/JPY) with FX conversion.
- Local caching for:
  - Coin metadata (7 days)
  - Latest prices (5 minutes)
  - Historical prices (24 hours)

**Backend (Go)**
- Stateless, cache-heavy utility service.
- Coin metadata and latest prices.
- Historical prices (cached-only to protect rate limits).
- FX rates from ECB converted to USD base.

## Architecture Principles

- **Device is the source of truth.** Transactions and derived portfolio data live locally.
- **Backend is optional.** App remains usable offline.
- **No user accounts or auth** (v1).

## Backend Endpoints

Base URL: `http://localhost:8080`

- `GET /cmc/coins/meta`  
  Coin metadata (cached 7d)
- `GET /cmc/prices/latest`  
  Latest prices (cached 5m)
- `GET /prices/history`  
  Historical prices (cached 24h)
- `GET /prices/history/batch`  
  Batch historical prices (cached 24h)
- `GET /fx`  
  FX rates (ECB, converted to USD base, cached 24h)
- `GET /health`  
  Health check

## Local Caching (Mobile)

- **Latest prices**: fetch at startup and refresh every 5 minutes, with local timestamp gating.
- **Historical prices**: cached in AsyncStorage per asset for 24 hours.
- **FX rates**: cached in AsyncStorage, refreshed every 24 hours.

## Development

### Mobile

```
cd mobile
npx expo run:ios
npx expo start --dev-client
```

### Backend

```
cd backend
go run ./cmd/api
```

## Notes

- All stored fiat values are **USD**. UI converts to selected currency for display.
- Import helpers (CSV / exchange / wallet) are planned but not in v1.
