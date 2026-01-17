**Decision Summary – Crypto Portfolio Mobile App Architecture**

---

### Product Direction

* Manual-first crypto portfolio tracker.
* Users explicitly enter transactions; accuracy and control are priorities.
* Wallets and exchanges are **optional, read-only helpers** for importing data.
* App must function offline and without backend dependency.

---

### Source of Truth

* **User device is the source of truth**.
* All transactions, positions, and portfolio state are stored locally.
* Backend never owns or mutates user portfolio data.

---

### Backend Choice

* Backend implemented in **Go**.
* Rationale:

  * Deterministic, strict, and maintainable logic
  * Excellent for sync jobs, decoding, and background workers
  * Simple deployment (single static binary)
  * Good credibility and trust optics for crypto users

---

### Backend Responsibilities (Utility-Only)

1. **Price Data**

   * Live and historical prices
   * Symbol normalization
   * Aggressive caching and rate-limit handling

2. **Wallet Import (Read-Only)**

   * Fetch raw blockchain transactions
   * Decode transfers and swaps
   * Normalize into internal transaction format
   * Propose data only; user must confirm

3. **Exchange Import (Read-Only)**

   * Handle API auth, pagination, retries
   * Import trades, deposits, withdrawals
   * Normalize data for user review

4. **Optional Heavy Calculations**

   * Tax logic (FIFO/LIFO)
   * Capital gains
   * Cross-currency normalization

5. **Optional Encrypted Backup**

   * Store encrypted blobs only
   * Backend never accesses plaintext data

---

### Explicit Non-Responsibilities

* No portfolio balances stored server-side
* No PnL, positions, or allocations persisted
* No private keys, signing, or trading
* No automatic data correction or mutation
* No UI or presentation logic

---

### Architecture Overview

* **Mobile App (React Native)**

  * SQLite local storage
  * Offline-first
  * All portfolio calculations local
* **Backend (Go)**

  * Stateless utility services
  * Optional dependency

---

### Design Principles

* Manual control over automation
* Deterministic calculations
* Privacy-first and trust-focused
* Minimal backend surface area
* Long-term maintainability

---

### Key Rule

If the backend goes offline, **the app still works**.

---

This is a lightweight, durable architecture optimized for correctness, user trust, and long-term stability rather than feature sprawl or centralization.
