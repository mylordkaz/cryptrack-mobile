import { describe, expect, it } from "vitest";
import { resolveActivePortfolioId } from "./resolveActivePortfolioId";
import { Portfolio } from "@/src/types/portfolio";

const portfolios: Portfolio[] = [
  { id: "main", name: "Main", created_at: 1, updated_at: 1 },
  { id: "p-2", name: "Trading", created_at: 2, updated_at: 2 },
];

describe("resolveActivePortfolioId", () => {
  it("returns saved id when it exists in available portfolios", () => {
    expect(resolveActivePortfolioId("p-2", portfolios, "main")).toBe("p-2");
  });

  it("falls back to default when saved id is missing", () => {
    expect(resolveActivePortfolioId("unknown", portfolios, "main")).toBe("main");
  });

  it("falls back to default when saved id is null", () => {
    expect(resolveActivePortfolioId(null, portfolios, "main")).toBe("main");
  });
});
