import { useEffect, useMemo, useState } from "react";
import { Platform } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
  getTransactionById,
  insertTransaction,
  updateTransaction,
} from "@/src/db/transactions";
import { useCoins } from "@/src/hooks/useCoins";
import { useCurrency } from "@/src/currency";
import { useLocale } from "@/src/i18n/LocaleProvider";
import { usePortfolio } from "@/src/portfolio";
import { buildTransactionPayload } from "./buildTransactionPayload";

export type TxType = "BUY" | "SELL";

type SearchParams = {
  symbol?: string;
  id?: string;
};

type UseAddTransactionForm = {
  type: TxType;
  setType: (type: TxType) => void;
  assetSymbol: string;
  setAssetSymbol: (symbol: string) => void;
  amount: string;
  setAmount: (value: string) => void;
  pricePerUnit: string;
  setPricePerUnit: (value: string) => void;
  feeAmount: string;
  setFeeAmount: (value: string) => void;
  notes: string;
  setNotes: (value: string) => void;
  date: Date;
  setDate: (value: Date) => void;
  showDatePicker: boolean;
  setShowDatePicker: (value: boolean) => void;
  searchQuery: string;
  setSearchQuery: (value: string) => void;
  showAssetList: boolean;
  setShowAssetList: (value: boolean) => void;
  showOptionalFields: boolean;
  setShowOptionalFields: (value: boolean) => void;
  totalFiat: string;
  setTotalFiat: (value: string) => void;
  totalFiatDirty: boolean;
  setTotalFiatDirty: (value: boolean) => void;
  error: string | null;
  setError: (value: string | null) => void;
  currencySymbol: string;
  computedTotalFiatAbs: string;
  onDateChange: (selected?: Date) => void;
  onSubmit: () => Promise<void>;
  isEditing: boolean;
  coinsLoading: boolean;
  coins: ReturnType<typeof useCoins>["coins"];
  selectedCoin: ReturnType<typeof useCoins>["coins"][number] | undefined;
};

export function useAddTransactionForm(): UseAddTransactionForm {
  const { t } = useLocale();
  const { currency, convertUsd, convertToUsd } = useCurrency();
  const { activePortfolioId } = usePortfolio();
  const { symbol, id } = useLocalSearchParams<SearchParams>();
  const router = useRouter();
  const { coins, loading: coinsLoading } = useCoins();
  const isEditing = Boolean(id);

  const [type, setType] = useState<TxType>("BUY");
  const [assetSymbol, setAssetSymbol] = useState(symbol ?? "");
  const [amount, setAmount] = useState("");
  const [pricePerUnit, setPricePerUnit] = useState("");
  const [feeAmount, setFeeAmount] = useState("");
  const [notes, setNotes] = useState("");
  const [date, setDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showAssetList, setShowAssetList] = useState(false);
  const [showOptionalFields, setShowOptionalFields] = useState(false);
  const [totalFiat, setTotalFiat] = useState("");
  const [totalFiatDirty, setTotalFiatDirty] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const currencySymbol =
    currency === "USD" ? "$" : currency === "EUR" ? "€" : "¥";

  useEffect(() => {
    let cancelled = false;

    (async () => {
      if (!id) return;

      const tx = await getTransactionById(id, activePortfolioId);
      if (!tx || cancelled) return;

      setType(tx.type);
      setAssetSymbol(tx.asset_symbol);
      setAmount(Math.abs(tx.amount).toString());
      setPricePerUnit(convertUsd(tx.price_per_unit_fiat).toString());
      setFeeAmount(tx.fee_amount ? convertUsd(tx.fee_amount).toString() : "");
      setNotes(tx.notes ?? "");
      setDate(new Date(tx.timestamp));
      setTotalFiat(convertUsd(Math.abs(tx.total_fiat)).toString());
      if (tx.fee_amount || tx.notes) {
        setShowOptionalFields(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [id, convertUsd, activePortfolioId]);

  useEffect(() => {
    if (symbol) return;
    if (!assetSymbol && coins.length > 0) {
      setAssetSymbol(coins[0].symbol);
    }
  }, [assetSymbol, coins, symbol]);

  const selectedCoin = coins.find((coin) => coin.symbol === assetSymbol);

  const computedTotalFiatAbs = useMemo(() => {
    if (!amount.trim() || !pricePerUnit.trim()) return "0";
    const amountNum = Number(amount);
    const priceNum = Number(pricePerUnit);
    const feeNum = Number(feeAmount) || 0;
    if (!Number.isFinite(amountNum) || !Number.isFinite(priceNum)) return "0";
    const unsignedAmount = Math.abs(amountNum);
    const value = unsignedAmount * priceNum + feeNum;
    return Number.isFinite(value) ? value.toFixed(2) : "0";
  }, [amount, pricePerUnit, feeAmount]);

  useEffect(() => {
    if (!totalFiatDirty && totalFiat !== computedTotalFiatAbs) {
      setTotalFiat(computedTotalFiatAbs);
    }
  }, [computedTotalFiatAbs, totalFiat, totalFiatDirty]);

  const onDateChange = (selected?: Date) => {
    if (Platform.OS === "android") {
      setShowDatePicker(false);
    }
    if (selected) {
      setDate(selected);
    }
  };

  const onSubmit = async () => {
    setError(null);

    const amountNum = Math.abs(Number(amount));
    const priceNum = Number(pricePerUnit);
    const feeNum = feeAmount ? Number(feeAmount) : null;
    if (!assetSymbol.trim()) {
      setError(t("transaction.invalidSymbol"));
      return;
    }
    if (!Number.isFinite(amountNum) || amountNum <= 0) {
      setError(t("transaction.invalidAmount"));
      return;
    }
    if (!Number.isFinite(priceNum) || priceNum <= 0) {
      setError(t("transaction.invalidPrice"));
      return;
    }

    const totalFiatNumAbs = Number(totalFiat);
    const payload = buildTransactionPayload({
      activePortfolioId,
      assetSymbol,
      type,
      amountNum,
      priceNum,
      feeNum,
      notes,
      timestamp: date.getTime(),
      totalFiatAbs: totalFiatNumAbs,
      computedTotalFiatAbs,
      convertToUsd,
    });

    if (isEditing && id) {
      await updateTransaction(id, payload);
      router.back();
      return;
    }

    await insertTransaction(payload);

    router.back();
  };

  return {
    type,
    setType,
    assetSymbol,
    setAssetSymbol,
    amount,
    setAmount,
    pricePerUnit,
    setPricePerUnit,
    feeAmount,
    setFeeAmount,
    notes,
    setNotes,
    date,
    setDate,
    showDatePicker,
    setShowDatePicker,
    searchQuery,
    setSearchQuery,
    showAssetList,
    setShowAssetList,
    showOptionalFields,
    setShowOptionalFields,
    totalFiat,
    setTotalFiat,
    totalFiatDirty,
    setTotalFiatDirty,
    error,
    setError,
    currencySymbol,
    computedTotalFiatAbs,
    onDateChange,
    onSubmit,
    isEditing,
    coinsLoading,
    coins,
    selectedCoin,
  };
}
