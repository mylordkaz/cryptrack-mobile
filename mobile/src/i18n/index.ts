import * as Localization from "expo-localization";
import { I18n } from "i18n-js";

const translations = {
  en: {
    common: {
      loading: "Loading...",
      error: "Error",
      noData: "No data",
      addTransaction: "Add transaction",
      cancel: "Cancel",
      done: "Done",
      details: "Details",
    },
    portfolio: {
      title: "Portfolio",
      totalValue: "Total Value",
      totalInvested: "Total Invested",
      totalPnL: "Total PnL",
      emptyState: "No transactions yet",
      emptyStateSubtitle: "Start tracking your crypto portfolio by adding your first transaction",
      addFirstTransaction: "Add first transaction",
      assets: "Assets",
      amountHeld: "Amount",
      currentValue: "Value",
      avgBuyPrice: "Avg Buy",
      unrealizedPnL: "Unrealized PnL",
      performance: "Performance",
      allocation: "Allocation",
      total: "Total",
    },
    assetDetail: {
      title: "Asset Detail",
      currentPrice: "Current Price",
      currentValue: "Current Value",
      avgBuyPrice: "Avg Buy Price",
      unrealizedPnL: "Unrealized PnL",
      totalInvested: "Total Invested",
      realizedPnL: "Realized PnL",
      transactions: "Transactions",
      txCount: "Transactions",
      firstTx: "First Transaction",
      type: "Type",
      amount: "Amount",
      fiatValue: "Fiat Value",
      pricePerUnit: "Price / Unit",
      timestamp: "Timestamp",
    },
    transaction: {
      addTitle: "Add Transaction",
      editTitle: "Edit Transaction",
      type: "Type",
      buy: "Buy",
      sell: "Sell",
      asset: "Asset",
      assetSymbol: "Asset Symbol",
      selectAsset: "Select Crypto",
      searchAsset: "Search cryptocurrency...",
      addOptionalFields: "Add fees & notes",
      optionalFieldsTitle: "Fees & Notes (Optional)",
      amount: "Amount",
      date: "Date",
      timestamp: "Date",
      pricePerUnit: "Price / Unit",
      fiatCurrency: "Fiat Currency",
      totalFiat: "Total Fiat",
      feeAmount: "Fee Amount (optional)",
      fee: "Fee",
      notes: "Notes",
      notesPlaceholder: "Add notes (optional)",
      submit: "Save Transaction",
      saveChanges: "Save Changes",
      detailsTitle: "Transaction Details",
      currentValue: "Current Value",
      priceAtTime: "Price at Time",
      costBasis: "Cost Basis",
      edit: "Edit",
      delete: "Delete",
      deleteTitle: "Delete Transaction",
      deleteConfirm: "This will remove the transaction permanently.",
      invalidAmount: "Amount must be > 0",
      invalidPrice: "Price must be > 0",
      invalidSymbol: "Asset symbol is required",
    },
    settings: {
      title: "Settings",
    },
  },
};

const i18n = new I18n(translations);
i18n.enableFallback = true;
i18n.defaultLocale = "en";
i18n.locale = Localization.getLocales()[0]?.languageTag ?? "en";

export function t(key: string, options?: Record<string, unknown>) {
  return i18n.t(key, options);
}
