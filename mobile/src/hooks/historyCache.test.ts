import { describe, it, expect } from "vitest";
import {
  buildHistoryCacheKey,
  buildHistoryFetchKey,
  isHistoryCacheStale,
  HISTORY_CACHE_TTL_MS,
} from "./historyCache";

describe("history cache helpers", () => {
  it("builds cache keys consistently", () => {
    expect(buildHistoryCacheKey("bitcoin", 365, "daily")).toBe(
      "history-cache:bitcoin:365:daily",
    );
    expect(buildHistoryFetchKey("bitcoin", 365, "daily")).toBe(
      "history-fetched-at:bitcoin:365:daily",
    );
  });

  it("marks cache stale when missing or invalid", () => {
    expect(isHistoryCacheStale(null, 1000)).toBe(true);
    expect(isHistoryCacheStale(Number.NaN, 1000)).toBe(true);
  });

  it("marks cache fresh within TTL and stale at/after TTL", () => {
    const now = 10_000;
    const fresh = now - HISTORY_CACHE_TTL_MS + 1;
    const exact = now - HISTORY_CACHE_TTL_MS;
    const old = now - HISTORY_CACHE_TTL_MS - 1;
    expect(isHistoryCacheStale(fresh, now)).toBe(false);
    expect(isHistoryCacheStale(exact, now)).toBe(true);
    expect(isHistoryCacheStale(old, now)).toBe(true);
  });
});
