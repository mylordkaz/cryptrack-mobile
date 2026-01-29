export const PRICE_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

export function isPriceCacheStale(
  lastFetchMs: number | null,
  nowMs: number = Date.now(),
): boolean {
  if (lastFetchMs === null || Number.isNaN(lastFetchMs)) return true;
  return nowMs - lastFetchMs >= PRICE_CACHE_TTL_MS;
}
