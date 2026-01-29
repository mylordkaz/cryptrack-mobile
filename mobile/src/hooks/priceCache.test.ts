import { describe, it, expect } from "vitest";
import { isPriceCacheStale, PRICE_CACHE_TTL_MS } from "./priceCache";

describe("isPriceCacheStale", () => {
  it("returns true when last fetch is missing", () => {
    expect(isPriceCacheStale(null, 1000)).toBe(true);
  });

  it("returns true when last fetch is NaN", () => {
    expect(isPriceCacheStale(Number.NaN, 1000)).toBe(true);
  });

  it("returns false when cache is within TTL", () => {
    const now = 10_000;
    const last = now - PRICE_CACHE_TTL_MS + 1;
    expect(isPriceCacheStale(last, now)).toBe(false);
  });

  it("returns true when cache age equals TTL", () => {
    const now = 10_000;
    const last = now - PRICE_CACHE_TTL_MS;
    expect(isPriceCacheStale(last, now)).toBe(true);
  });

  it("returns true when cache is older than TTL", () => {
    const now = 10_000;
    const last = now - PRICE_CACHE_TTL_MS - 1;
    expect(isPriceCacheStale(last, now)).toBe(true);
  });
});
