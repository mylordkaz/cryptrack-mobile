import { describe, it, expect } from "vitest";
import { convertToUsd, convertUsd } from "./conversion";

describe("currency conversion", () => {
  it("converts USD to target and back using rate", () => {
    const rate = 0.5;
    const usd = 100;
    const converted = convertUsd(usd, rate);
    expect(converted).toBe(50);
    expect(convertToUsd(converted, rate)).toBe(usd);
  });

  it("handles JPY-like rates with decimals", () => {
    const rate = 150.1234;
    const usd = 2;
    const converted = convertUsd(usd, rate);
    expect(converted).toBeCloseTo(300.2468, 6);
    expect(convertToUsd(converted, rate)).toBeCloseTo(usd, 6);
  });

  it("falls back to identity when rate is invalid", () => {
    expect(convertUsd(10, 0)).toBe(10);
    expect(convertUsd(10, -1)).toBe(10);
    expect(convertUsd(10, Number.NaN)).toBe(10);
    expect(convertToUsd(10, 0)).toBe(10);
    expect(convertToUsd(10, -1)).toBe(10);
    expect(convertToUsd(10, Number.NaN)).toBe(10);
  });
});
