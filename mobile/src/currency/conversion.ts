export function convertUsd(value: number, rate: number): number {
  if (!Number.isFinite(rate) || rate <= 0) return value;
  return value * rate;
}

export function convertToUsd(value: number, rate: number): number {
  if (!Number.isFinite(rate) || rate <= 0) return value;
  return value / rate;
}
