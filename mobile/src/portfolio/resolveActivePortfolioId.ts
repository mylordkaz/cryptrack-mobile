import { Portfolio } from "@/src/types/portfolio";

export function resolveActivePortfolioId(
  savedId: string | null,
  portfolios: Portfolio[],
  fallbackId: string,
) {
  const hasSaved = portfolios.some((portfolio) => portfolio.id === savedId);
  return hasSaved && savedId ? savedId : fallbackId;
}
