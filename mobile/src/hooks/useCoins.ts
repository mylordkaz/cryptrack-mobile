import { useEffect, useState } from "react";
import { insertPricesBatch } from "@/src/db/prices";
import { getLatestPrices } from "@/src/db/prices";
import {
  saveCoinsBatch,
  getAllCoins,
  isCoinsCacheStale,
  getCoinsCount,
  CoinMetadata,
} from "@/src/db/coins";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { isPriceCacheStale, PRICE_CACHE_TTL_MS } from "@/src/hooks/priceCache";

export type Coin = {
  id: string;
  symbol: string;
  name: string;
  image: string;
  current_price: number;
  market_cap: number;
  market_cap_rank: number;
  price_change_percentage_24h: number;
};

type CoinMetaResponse = {
  coins: Array<{
    id: string;
    symbol: string;
    name: string;
    image: string;
  }>;
  timestamp: number;
  cached: boolean;
};

type LatestPricesResponse = {
  prices: Record<
    string,
    {
      usd: number;
      last_updated_at?: number;
    }
  >;
  timestamp: number;
  cached: boolean;
};

const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_BASE_URL ?? "http://localhost:8080";
const buildCoinsFromMeta = (coins: CoinMetaResponse["coins"]): Coin[] =>
  coins.map((coin) => ({
    id: coin.id,
    symbol: coin.symbol.toUpperCase(),
    name: coin.name,
    image: coin.image,
    current_price: 0,
    market_cap: 0,
    market_cap_rank: 0,
    price_change_percentage_24h: 0,
  }));

const PRICE_REFRESH_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes
const PRICE_LAST_FETCH_KEY = "prices-last-fetch-at";

export function useCoins(refreshKey: number = 0) {
  const [coins, setCoins] = useState<Coin[]>([]);
  const [priceMap, setPriceMap] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [autoRefreshTrigger, setAutoRefreshTrigger] = useState(0);
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  // Auto-refresh every 5 minutes
  useEffect(() => {
    const intervalId = setInterval(() => {
      setAutoRefreshTrigger((prev) => prev + 1);
    }, PRICE_REFRESH_INTERVAL_MS);

    return () => {
      clearInterval(intervalId);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        if (isInitialLoad) {
          setLoading(true);
        }
        setError(null);

        // Check if we have cached data and if it's still fresh
        const [cachedCount, isStale] = await Promise.all([
          getCoinsCount(),
          isCoinsCacheStale(),
        ]);

        const hasCachedData = cachedCount > 0;
        const needsFetch = !hasCachedData || isStale;
        let resolvedCoins: Coin[] = [];

        // If we have cached data, load it first for instant display
        if (hasCachedData && !cancelled) {
          const cachedCoins = await getAllCoins();
          const cachedCoinsList = cachedCoins.map((c) => ({
            id: c.id,
            symbol: c.symbol,
            name: c.name,
            image: c.image_url,
            current_price: 0,
            market_cap: 0,
            market_cap_rank: c.market_cap_rank ?? 0,
            price_change_percentage_24h: 0,
          }));
          resolvedCoins = cachedCoinsList;

          if (!cancelled) {
            setCoins(cachedCoinsList);
            // Don't set loading false yet if we need to fetch
            if (!needsFetch) {
              setLoading(false);
            }
          }
        }

        // Fetch fresh data if needed
        if (needsFetch) {
          const response = await fetch(`${API_BASE_URL}/cmc/coins/meta`);
          if (!response.ok) {
            const text = await response.text();
            throw new Error(
              `Failed to fetch coin metadata (${response.status}): ${
                text || response.statusText
              }`
            );
          }

          const data = (await response.json()) as CoinMetaResponse;
          if (cancelled) return;

          const metaCoins = buildCoinsFromMeta(data.coins);
          resolvedCoins = metaCoins;

          // Save to database (metadata only)
          await saveCoinsBatch(data.coins);

          if (!cancelled) {
            setCoins(metaCoins);
          }
        }

        if (resolvedCoins.length > 0) {
          const idToSymbol = new Map<string, string>();
          resolvedCoins.forEach((coin) => {
            idToSymbol.set(coin.id, coin.symbol.toUpperCase());
          });

          const priceRows: Array<{
            asset_symbol: string;
            price_fiat: number;
            fiat_currency: "USD";
            source: "API";
            timestamp: number;
          }> = [];

          try {
            const lastFetchRaw = await AsyncStorage.getItem(PRICE_LAST_FETCH_KEY);
            const lastFetch = lastFetchRaw ? Number(lastFetchRaw) : null;
            const isStale = isPriceCacheStale(lastFetch, Date.now());

            if (!isStale) {
              const symbols = resolvedCoins.map((coin) => coin.symbol.toUpperCase());
              const lastKnown = await getLatestPrices(symbols);
              if (Object.keys(lastKnown).length > 0) {
                const map: Record<string, number> = {};
                const updatedCoins = resolvedCoins.map((coin) => {
                  const row = lastKnown[coin.symbol.toUpperCase()];
                  if (row?.price_fiat !== undefined) {
                    map[coin.symbol.toUpperCase()] = row.price_fiat;
                    return { ...coin, current_price: row.price_fiat };
                  }
                  return coin;
                });

                if (!cancelled) {
                  setPriceMap(map);
                  setCoins(updatedCoins);
                }
                return;
              }
            }

            const prices: LatestPricesResponse["prices"] = {};
            const timestamp = Date.now();
            const response = await fetch(`${API_BASE_URL}/cmc/prices/latest`);
            if (!response.ok) {
              const text = await response.text();
              throw new Error(
                `Failed to fetch prices (${response.status}): ${
                  text || response.statusText
                }`
              );
            }

            const data = (await response.json()) as LatestPricesResponse;
            Object.assign(prices, data.prices);

            const map: Record<string, number> = {};
            const updatedCoins = resolvedCoins.map((coin) => {
              const price = prices[coin.id]?.usd;
              if (price !== undefined) {
                const symbol = idToSymbol.get(coin.id);
                if (symbol) {
                  map[symbol] = price;
                  priceRows.push({
                    asset_symbol: symbol,
                    price_fiat: price,
                    fiat_currency: "USD",
                    source: "API",
                    timestamp,
                  });
                }
                return { ...coin, current_price: price };
              }
              return coin;
            });

            if (!cancelled) {
              setPriceMap(map);
              setCoins(updatedCoins);
            }

            if (priceRows.length > 0) {
              await insertPricesBatch(priceRows);
            }
            await AsyncStorage.setItem(PRICE_LAST_FETCH_KEY, String(timestamp));
          } catch {
            // Ignore price fetch errors when using metadata cache
          }
        }
      } catch (err) {
        if (!cancelled) {
          // If we have cached data, show it despite the error
          const cachedCoins = await getAllCoins();
          if (cachedCoins.length > 0) {
            setCoins(
              cachedCoins.map((c) => ({
                id: c.id,
                symbol: c.symbol,
                name: c.name,
                image: c.image_url,
                current_price: 0,
                market_cap: 0,
                market_cap_rank: c.market_cap_rank ?? 0,
                price_change_percentage_24h: 0,
              }))
            );
          } else {
            setError(err as Error);
          }
        }
      } finally {
        if (!cancelled) {
          if (isInitialLoad) {
            setLoading(false);
            setIsInitialLoad(false);
          }
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [refreshKey, autoRefreshTrigger]);

  return { coins, priceMap, loading, error };
}

// Hook to get coin metadata for specific symbols (for AssetRow)
export function useCoinMetadata(symbols: string[]) {
  const [metadata, setMetadata] = useState<Map<string, CoinMetadata>>(new Map());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const { getCoinsBySymbols } = await import("@/src/db/coins");
        const data = await getCoinsBySymbols(symbols);
        if (!cancelled) {
          setMetadata(data);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [symbols.join(",")]);

  return { metadata, loading };
}
