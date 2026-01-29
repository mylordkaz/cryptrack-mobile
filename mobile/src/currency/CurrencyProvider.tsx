import AsyncStorage from "@react-native-async-storage/async-storage";
import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { formatFiat } from "@/src/utils/format";
import { getCachedFxRates, initFxRates } from "@/src/services/fx";
import { convertToUsd as convertToUsdValue, convertUsd as convertUsdValue } from "@/src/currency/conversion";

export type Currency = "USD" | "EUR" | "JPY";
export const SUPPORTED_CURRENCIES: Currency[] = ["USD", "EUR", "JPY"];
const DEFAULT_CURRENCY: Currency = "USD";
const CURRENCY_STORAGE_KEY = "app-currency";

type RatesResponse = {
  base: string;
  rates: Record<string, number>;
  timestamp: number;
  cached: boolean;
};

type CurrencyContextValue = {
  currency: Currency;
  setCurrency: (currency: Currency) => Promise<void>;
  convertUsd: (value: number) => number;
  convertToUsd: (value: number) => number;
  formatFiatUsd: (value: number) => string;
  fxRates: RatesResponse | null;
};

const CurrencyContext = createContext<CurrencyContextValue | null>(null);

export function CurrencyProvider({ children }: { children: ReactNode }) {
  const [currency, setCurrencyState] = useState<Currency>(DEFAULT_CURRENCY);
  const [fxRates, setFxRates] = useState<RatesResponse | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const saved = await AsyncStorage.getItem(CURRENCY_STORAGE_KEY);
        if (
          mounted &&
          saved &&
          (saved === "USD" || saved === "EUR" || saved === "JPY")
        ) {
          setCurrencyState(saved);
        }
      } catch {
        // Ignore storage errors
      }

      try {
        await initFxRates();
      } catch {
        // Continue to load cached rates even if fetch fails
      }

      try {
        const cached = await getCachedFxRates();
        if (mounted && cached) {
          setFxRates(cached);
        }
      } catch {
        // Ignore cache errors
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  const setCurrency = async (next: Currency) => {
    setCurrencyState(next);
    await AsyncStorage.setItem(CURRENCY_STORAGE_KEY, next);
  };

  const rate = useMemo(() => {
    if (currency === "USD") return 1;
    const value = fxRates?.rates?.[currency];
    return typeof value === "number" && value > 0 ? value : 1;
  }, [currency, fxRates]);

  const convertUsd = (value: number) => convertUsdValue(value, rate);
  const convertToUsd = (value: number) => convertToUsdValue(value, rate);
  const formatFiatUsd = (value: number) =>
    formatFiat(convertUsd(value), currency);

  const contextValue = useMemo(
    () => ({
      currency,
      setCurrency,
      convertUsd,
      convertToUsd,
      formatFiatUsd,
      fxRates,
    }),
    [currency, rate, fxRates],
  );

  return (
    <CurrencyContext.Provider value={contextValue}>
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency() {
  const ctx = useContext(CurrencyContext);
  if (!ctx) {
    throw new Error("useCurrency must be used within CurrencyProvider");
  }
  return ctx;
}
