import { formatShortDate } from "@/src/utils/format";

export type ChartType = "performance" | "allocation";
export type TimePeriod = "7D" | "30D" | "90D" | "1Y";

export const TIME_PERIODS: TimePeriod[] = ["7D", "30D", "90D", "1Y"];

export const PERIOD_CONFIG: Record<
  TimePeriod,
  { days: number; pointInterval: number; labelInterval: number }
> = {
  "7D": { days: 7, pointInterval: 1, labelInterval: 1 },
  "30D": { days: 30, pointInterval: 1, labelInterval: 6 },
  "90D": { days: 90, pointInterval: 3, labelInterval: 5 },
  "1Y": { days: 365, pointInterval: 15, labelInterval: 4 },
};

export function generateXLabels(
  data: Array<{ date: number }>,
  labelInterval: number,
): Array<{ label: string; index: number }> {
  const labels: Array<{ label: string; index: number }> = [];

  for (let i = 0; i < data.length; i += labelInterval) {
    const label = formatShortDate(data[i].date);
    labels.push({ label, index: i });
  }

  return labels;
}

export function generateYAxisTicks(
  data: Array<{ y: number }>,
): { ticks: number[]; domainMin: number; domainMax: number } {
  const fallback = { ticks: [0, 1000, 2000, 3000, 4000], domainMin: 0, domainMax: 4000 };
  if (data.length === 0) return fallback;

  const values = data.map((d) => d.y).filter((val) => Number.isFinite(val));
  if (values.length === 0) return fallback;

  const minY = Math.min(...values);
  const maxY = Math.max(...values);

  if (maxY <= 0) return { ticks: [0, 250, 500, 750, 1000], domainMin: 0, domainMax: 1000 };

  const spread = maxY - minY;

  // If all values are the same or very close, add padding around the value
  if (spread < maxY * 0.01) {
    const padding = maxY * 0.1 || 100;
    const low = Math.max(0, maxY - padding);
    const high = maxY + padding;
    const step = (high - low) / 3;
    return {
      ticks: [low, low + step, low + step * 2, high],
      domainMin: low,
      domainMax: high,
    };
  }

  // Compute a nice step size for the range
  const targetStep = spread / 3;
  const stepMagnitude = Math.pow(10, Math.floor(Math.log10(targetStep)));
  const normalizedStep = targetStep / stepMagnitude;

  let niceStepMultiplier: number;
  if (normalizedStep <= 1) niceStepMultiplier = 1;
  else if (normalizedStep <= 1.4) niceStepMultiplier = 1.4;
  else if (normalizedStep <= 2) niceStepMultiplier = 2;
  else if (normalizedStep <= 2.5) niceStepMultiplier = 2.5;
  else if (normalizedStep <= 3) niceStepMultiplier = 3;
  else if (normalizedStep <= 4) niceStepMultiplier = 4;
  else if (normalizedStep <= 5) niceStepMultiplier = 5;
  else if (normalizedStep <= 7) niceStepMultiplier = 7;
  else niceStepMultiplier = 10;

  const niceStep = niceStepMultiplier * stepMagnitude;

  // Round min down and max up to nice step boundaries
  const niceMin = Math.max(0, Math.floor(minY / niceStep) * niceStep - niceStep);
  const niceMax = Math.ceil(maxY / niceStep) * niceStep;

  const ticks: number[] = [];
  for (let v = niceMin; v <= niceMax; v += niceStep) {
    ticks.push(Math.round(v * 100) / 100);
  }

  // Ensure we have at least 3 ticks
  if (ticks.length < 3) {
    const halfStep = niceStep / 2;
    ticks.splice(1, 0, Math.round((niceMin + halfStep) * 100) / 100);
  }

  return { ticks, domainMin: niceMin, domainMax: niceMax };
}
