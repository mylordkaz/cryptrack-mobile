export function formatFiat(value: number, currency = "USD"): string {
  if (typeof Intl !== "undefined" && typeof Intl.NumberFormat === "function") {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
    }).format(value);
  }

  const sign = value < 0 ? "-" : "";
  return `${sign}$${Math.abs(value).toFixed(2)}`;
}

export function formatDateTime(timestamp: number): string {
  if (typeof Intl !== "undefined" && typeof Intl.DateTimeFormat === "function") {
    const date = new Date(timestamp);
    const datePart = new Intl.DateTimeFormat("en-US", {
      year: "numeric",
      month: "short",
      day: "2-digit",
    }).format(date);
    const timePart = new Intl.DateTimeFormat("en-US", {
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
