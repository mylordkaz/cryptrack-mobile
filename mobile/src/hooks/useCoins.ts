import { useEffect, useState } from "react";
import { insertPricesBatch } from "@/src/db/prices";
import {
  saveCoinsBatch,
  getAllCoins,
  isCoinsCacheStale,
  getCoinsCount,
  CoinMetadata,
} from "@/src/db/coins";

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

type CoinsResponse = {
  coins: Coin[];
  timestamp: number;
  cached: boolean;
};

const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_BASE_URL ?? "http://localhost:8080";

export function useCoins() {
  const [coins, setCoins] = useState<Coin[]>([]);
  const [priceMap, setPriceMap] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        setLoading(true);
        setError(null);

        // Check if we have cached data and if it's still fresh
        const [cachedCount, isStale] = await Promise.all([
          getCoinsCount(),
          isCoinsCacheStale(),
        ]);

        const hasCachedData = cachedCount > 0;
        const needsFetch = !hasCachedData || isStale;

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
          const response = await fetch(`${API_BASE_URL}/coins`);
          if (!response.ok) {
            const text = await response.text();
            throw new Error(
              `Failed to fetch coins (${response.status}): ${text || response.statusText}`
            );
          }

          const data = (await response.json()) as CoinsResponse;
          if (cancelled) return;

          // Build price map and prepare price rows
          const map: Record<string, number> = {};
          const priceRows = data.coins.map((coin) => {
            const symbol = coin.symbol.toUpperCase();
            map[symbol] = coin.current_price;
            return {
              asset_symbol: symbol,
              price_fiat: coin.current_price,
              fiat_currency: "USD",
              source: "API" as const,
              timestamp: data.timestamp,
            };
          });

          // Save to database (prices and metadata)
          await Promise.all([
            insertPricesBatch(priceRows),
            saveCoinsBatch(data.coins),
          ]);

          if (!cancelled) {
            setCoins(data.coins);
            setPriceMap(map);
          }
        } else if (hasCachedData) {
          // Use cached coins but fetch current prices
          try {
            const response = await fetch(`${API_BASE_URL}/coins`);
            if (response.ok) {
              const data = (await response.json()) as CoinsResponse;
              if (!cancelled) {
                const map: Record<string, number> = {};
                data.coins.forEach((coin) => {
                  map[coin.symbol.toUpperCase()] = coin.current_price;
                });
                setPriceMap(map);

                // Update coins with fresh prices
                setCoins(data.coins);

                // Save price updates
                const priceRows = data.coins.map((coin) => ({
                  asset_symbol: coin.symbol.toUpperCase(),
                  price_fiat: coin.current_price,
                  fiat_currency: "USD",
                  source: "API" as const,
                  timestamp: data.timestamp,
                }));
                insertPricesBatch(priceRows);
              }
            }
          } catch {
            // Ignore price fetch errors when using cache
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
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

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
