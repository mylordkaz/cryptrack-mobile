import { describe, it, expect } from "vitest";
import { formatFiat } from "./format";

describe("formatFiat", () => {
  it("formats positive USD values with two decimals", () => {
    expect(formatFiat(1234.56)).toBe("$1,234.56");
  });

  it("formats negative USD values correctly", () => {
    expect(formatFiat(-1234.56)).toBe("-$1,234.56");
  });

  it("rounds to two decimal places", () => {
    expect(formatFiat(1234.567)).toBe("$1,234.57");
    expect(formatFiat(1234.564)).toBe("$1,234.56");
  });

  it("formats zero correctly", () => {
    expect(formatFiat(0)).toBe("$0.00");
  });

  it("formats large numbers with proper separators", () => {
    expect(formatFiat(1000000)).toBe("$1,000,000.00");
  });

  it("formats small numbers correctly", () => {
    expect(formatFiat(0.01)).toBe("$0.01");
    expect(formatFiat(0.001)).toBe("$0.00");
  });

  it("formats different currencies when Intl is available", () => {
    // EUR uses different formatting
    const eurResult = formatFiat(1234.56, "EUR");
    // Just check it contains the value, exact format may vary by locale
    expect(eurResult).toContain("1,234.56");
  });

  it("falls back to simple format when Intl is unavailable", () => {
    // Mock Intl as undefined
    const originalIntl = global.Intl;
    // @ts-ignore
    global.Intl = undefined;

    expect(formatFiat(1234.56)).toBe("$1234.56");
    expect(formatFiat(-1234.56)).toBe("-$1234.56");

    // Restore
    global.Intl = originalIntl;
  });

  it("handles very large numbers", () => {
    expect(formatFiat(1000000000)).toBe("$1,000,000,000.00");
  });
});
