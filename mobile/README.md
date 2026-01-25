Below is a practical, execution-oriented start plan. No theory, no tooling bikeshedding.

Phase 0 — Lock decisions (1–2 hours)
Write this down (README or notes) before coding:
* Manual-first
* Local device = source of truth
* Backend optional
* Transactions are the only stored financial data
* Everything else is derived
If this is not explicit, you will drift later.

Phase 1 — Define the core model (most important step)
1. Transaction schema (finalize before UI)
Do this once, correctly.
transactions
------------
id (uuid)
asset_symbol
amount            -- signed
price_per_unit_fiat
total_fiat        -- signed cash flow
fiat_currency
fee_amount        -- optional
fee_currency      -- optional
type              -- BUY / SELL
source            -- MANUAL / WALLET / EXCHANGE
external_id       -- tx hash / trade id
timestamp         -- unix ms
created_at
updated_at
Rules:
* One row = one economic event
* Never store balances
* Never mutate history (append-only)
* Note: current UI may allow edit/delete; plan to replace with append-correction and soft delete later
Do this before React Native, Go, or UI work.

Phase 2 — Implement the math engine (before UI)
2. Portfolio math package (language-agnostic logic)
Start with:
* Total amount per asset
* Total invested
* Weighted average price
* Realized PnL
* Unrealized PnL
Edge cases to cover early:
* Partial sells
* Fees in asset vs fiat
* Multiple fiat currencies (even if v1 is single-currency)
Write this as:
* A pure function layer
* With table-driven tests
If math is wrong, UI doesn't matter.

Phase 3 — Local-first mobile app skeleton
3. Mobile stack
* React Native + Expo
* SQLite (via expo-sqlite or similar)
Initial screens:
1. Portfolio recap (static fake data)
2. Asset detail view
3. Add transaction form
No charts yet. No backend yet.
Just:
* Insert transaction
* Query transactions
* Run math engine
* Display results

Phase 4 — Backend skeleton (Go)
Only after the app works offline.
4. Go service v0
Start with one endpoint:
GET /coins
Returns top 250 coins by market cap with:
* Coin metadata (id, symbol, name, logo)
* Current market prices
* 24h price change
Uses CoinGecko /coins/markets endpoint.
Add FX rates endpoint:
GET /fx
Returns latest fiat rates based on USD (converted from ECB EUR base).
Cached for 24h to match daily ECB updates.
Backend structure:
cmd/api
internal/prices
internal/handlers
No auth. No database. In-memory cache (2h TTL).
Note: No historical prices needed—users manually enter purchase prices.
This proves:
* API shape
* Client ↔ server contract
* Deployment flow
* Rate limit handling (13 calls/24h free tier)

Phase 5 — Replace fake data with real data
* Plug /coins endpoint into app
* Use current prices for portfolio valuation (unrealized PnL)
* Cache coin list + prices locally in SQLite
* Populate dropdown with real coins ordered by market cap
At this point:
* App is already usable
* Backend adds value, not dependency

From here we should be done. we have the basic features and fetching.
next phase are all extra features that will add value but the app should already be usable. 

before moving on and Implement next features, I want to work on the UI/UX, make it look nice. after the design of the app done we will start on adding value

Phase 6 — Import helpers (only now)
Add in this order:
1. CSV import (easiest)
2. Exchange API (Binance)
3. Wallet import (ETH transfers only)
Each import:
* Produces suggested transactions
* Requires user confirmation
Never auto-save.

Phase 7 — Polish & hardening
* Migrations
* Export (CSV / JSON)
* Error handling
* Backup (optional)
* Charts (last)

What NOT to do early
* ❌ User accounts
* ❌ Cloud sync
* ❌ Real-time prices everywhere
* ❌ Wallet signing
* ❌ Auto-reconciliation
* ❌ Fancy charts
These destroy focus.

---

Development (Mobile)
* Build and run the dev client (Skia/victory-native support): `npx expo run:ios`
* Start Metro for the dev client: `npx expo start --dev-client`
