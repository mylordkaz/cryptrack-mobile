export const HISTORY_CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const HISTORY_CACHE_PREFIX = "history-cache:";
const HISTORY_FETCH_PREFIX = "history-fetched-at:";

export function buildHistoryCacheKey(
  id: string,
  days: number | string,
  interval: string,
): string {
  return `${HISTORY_CACHE_PREFIX}${id}:${days}:${interval}`;
}

export function buildHistoryFetchKey(
  id: string,
  days: number | string,
  interval: string,
): string {
  return `${HISTORY_FETCH_PREFIX}${id}:${days}:${interval}`;
}

export function isHistoryCacheStale(
  fetchedAtMs: number | null,
  nowMs: number = Date.now(),
): boolean {
  if (fetchedAtMs === null || Number.isNaN(fetchedAtMs)) return true;
  return nowMs - fetchedAtMs >= HISTORY_CACHE_TTL_MS;
}
