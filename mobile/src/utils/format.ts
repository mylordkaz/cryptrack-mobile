import { getLocale } from "@/src/i18n";

export function formatFiat(
  value: number,
  currency = "USD",
  locale = getLocale(),
): string {
  if (typeof Intl !== "undefined" && typeof Intl.NumberFormat === "function") {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
    }).format(value);
  }

  const sign = value < 0 ? "-" : "";
  return `${sign}$${Math.abs(value).toFixed(2)}`;
}

export function formatDateTime(
  timestamp: number,
  locale = getLocale(),
): string {
  if (
    typeof Intl !== "undefined" &&
    typeof Intl.DateTimeFormat === "function"
  ) {
    const date = new Date(timestamp);
    const datePart = new Intl.DateTimeFormat(locale, {
      year: "numeric",
      month: "short",
      day: "2-digit",
    }).format(date);
    const timePart = new Intl.DateTimeFormat(locale, {
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
    return `${datePart} - ${timePart}`;
  }

  return new Date(timestamp).toLocaleString();
}

export function formatAmount(value: number, maxDecimals = 6): string {
  const fixed = value.toFixed(maxDecimals);
  return fixed.replace(/\.?0+$/, "");
}

export function formatShortDate(
  timestamp: number,
  locale = getLocale(),
): string {
  if (
    typeof Intl !== "undefined" &&
    typeof Intl.DateTimeFormat === "function"
  ) {
    return new Intl.DateTimeFormat(locale, {
      month: "2-digit",
      day: "2-digit",
    }).format(new Date(timestamp));
  }
  const date = new Date(timestamp);
  return `${String(date.getMonth() + 1).padStart(2, "0")}/${String(
    date.getDate(),
  ).padStart(2, "0")}`;
}

export function formatDateOnly(
  timestamp: number,
  locale = getLocale(),
): string {
  if (
    typeof Intl !== "undefined" &&
    typeof Intl.DateTimeFormat === "function"
  ) {
    return new Intl.DateTimeFormat(locale, {
      year: "numeric",
      month: "short",
      day: "2-digit",
    }).format(new Date(timestamp));
  }
  return new Date(timestamp).toLocaleDateString();
}

export function formatTimeOnly(
  timestamp: number,
  locale = getLocale(),
): string {
  if (
    typeof Intl !== "undefined" &&
    typeof Intl.DateTimeFormat === "function"
  ) {
    return new Intl.DateTimeFormat(locale, {
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(timestamp));
  }
  return new Date(timestamp).toLocaleTimeString();
}
