import AsyncStorage from "@react-native-async-storage/async-storage";

type RatesResponse = {
  base: string;
  rates: Record<string, number>;
  timestamp: number;
  cached: boolean;
};

const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_BASE_URL ?? "http://localhost:8080";
const FX_CACHE_KEY = "fx-rates";
const FX_LAST_FETCH_KEY = "fx-last-fetch-at";
const FX_FETCH_INTERVAL_MS = 24 * 60 * 60 * 1000;

async function fetchFxRates(): Promise<RatesResponse> {
  const response = await fetch(`${API_BASE_URL}/fx`);
  if (!response.ok) {
    const text = await response.text();
    throw new Error(
      `Failed to fetch FX rates (${response.status}): ${
        text || response.statusText
      }`,
    );
  }
  return (await response.json()) as RatesResponse;
}

export async function initFxRates(): Promise<void> {
  const last = await AsyncStorage.getItem(FX_LAST_FETCH_KEY);
  const lastMs = last ? Number(last) : null;
  const isStale =
    !lastMs || Number.isNaN(lastMs) || Date.now() - lastMs >= FX_FETCH_INTERVAL_MS;

  if (!isStale) return;

  const rates = await fetchFxRates();
  await AsyncStorage.multiSet([
    [FX_CACHE_KEY, JSON.stringify(rates)],
    [FX_LAST_FETCH_KEY, String(Date.now())],
  ]);
}

export async function getCachedFxRates(): Promise<RatesResponse | null> {
  const raw = await AsyncStorage.getItem(FX_CACHE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as RatesResponse;
  } catch {
    return null;
  }
}
