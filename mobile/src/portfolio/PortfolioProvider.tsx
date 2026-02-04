import AsyncStorage from "@react-native-async-storage/async-storage";
import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import {
  DEFAULT_PORTFOLIO_ID,
  ensureDefaultPortfolio,
  getAllPortfolios,
  getOrCreateDefaultPortfolioId,
} from "@/src/db/portfolios";
import { Portfolio } from "@/src/types/portfolio";
import { resolveActivePortfolioId } from "./resolveActivePortfolioId";

const ACTIVE_PORTFOLIO_STORAGE_KEY = "active-portfolio-id";

type PortfolioContextValue = {
  activePortfolioId: string;
  setActivePortfolioId: (id: string) => Promise<void>;
  portfolios: Portfolio[];
  refreshPortfolios: () => Promise<void>;
};

const PortfolioContext = createContext<PortfolioContextValue | null>(null);

export function PortfolioProvider({ children }: { children: ReactNode }) {
  const [activePortfolioId, setActivePortfolioIdState] = useState(
    DEFAULT_PORTFOLIO_ID,
  );
  const [portfolios, setPortfolios] = useState<Portfolio[]>([]);

  const refreshPortfolios = async () => {
    await ensureDefaultPortfolio();
    const rows = await getAllPortfolios();
    setPortfolios(rows);
  };

  useEffect(() => {
    let mounted = true;

    (async () => {
      const defaultId = await getOrCreateDefaultPortfolioId();
      const rows = await getAllPortfolios();
      if (!mounted) return;

      setPortfolios(rows);

      const savedId = await AsyncStorage.getItem(ACTIVE_PORTFOLIO_STORAGE_KEY);
      const nextId = resolveActivePortfolioId(savedId, rows, defaultId);
      if (!mounted) return;
      setActivePortfolioIdState(nextId);
    })().catch(() => {
      // Keep default id if storage or db load fails.
    });

    return () => {
      mounted = false;
    };
  }, []);

  const setActivePortfolioId = async (id: string) => {
    setActivePortfolioIdState(id);
    await AsyncStorage.setItem(ACTIVE_PORTFOLIO_STORAGE_KEY, id);
  };

  const value = useMemo(
    () => ({
      activePortfolioId,
      setActivePortfolioId,
      portfolios,
      refreshPortfolios,
    }),
    [activePortfolioId, portfolios],
  );

  return (
    <PortfolioContext.Provider value={value}>
      {children}
    </PortfolioContext.Provider>
  );
}

export function usePortfolio() {
  const ctx = useContext(PortfolioContext);
  if (!ctx) {
    throw new Error("usePortfolio must be used within PortfolioProvider");
  }
  return ctx;
}
