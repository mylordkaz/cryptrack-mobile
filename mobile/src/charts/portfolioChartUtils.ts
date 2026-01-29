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

export function generateYAxisTicks(data: Array<{ y: number }>): number[] {
  if (data.length === 0) return [0, 1000, 2000, 3000, 4000];

  const values = data.map((d) => d.y).filter((val) => Number.isFinite(val));
  if (values.length === 0) return [0, 1000, 2000, 3000, 4000];

  const maxY = Math.max(...values);
  if (maxY <= 0) return [0, 250, 500, 750, 1000];

  const targetStep = maxY / 3;
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
  const maxTick = niceStep * 3;

  return [0, niceStep, niceStep * 2, maxTick];
}
