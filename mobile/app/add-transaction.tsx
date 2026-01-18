import { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  TextInput,
  Button,
  ScrollView,
  Pressable,
} from "react-native";
import { Image } from "expo-image";
import DateTimePicker, {
  DateTimePickerEvent,
} from "@react-native-community/datetimepicker";
import { useTheme } from "@/src/theme";
import { t } from "@/src/i18n";
import { useLocalSearchParams } from "expo-router";
import {
  getTransactionById,
  insertTransaction,
  updateTransaction,
} from "@/src/db/transactions";
import { useRouter } from "expo-router";
import { formatDateTime } from "@/src/utils/format";
import { useCoins } from "@/src/hooks/useCoins";

type TxType = "BUY" | "SELL";

export default function AddTransactionScreen() {
  const { theme } = useTheme();
  const { symbol, id } = useLocalSearchParams<{
    symbol?: string;
    id?: string;
  }>();
  const router = useRouter();
  const isEditing = Boolean(id);
  const { coins, loading: coinsLoading } = useCoins();

  const [type, setType] = useState<TxType>("BUY");
  const [assetSymbol, setAssetSymbol] = useState(symbol ?? "");
  const [amount, setAmount] = useState("");
  const [pricePerUnit, setPricePerUnit] = useState("");
  const [feeAmount, setFeeAmount] = useState("");
  const [notes, setNotes] = useState("");
  const [date, setDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showAssetPicker, setShowAssetPicker] = useState(false);
  const [totalFiat, setTotalFiat] = useState("");
  const [totalFiatDirty, setTotalFiatDirty] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      if (!id) return;

      const tx = await getTransactionById(id);
      if (!tx || cancelled) return;

      setType(tx.type);
      setAssetSymbol(tx.asset_symbol);
      setAmount(Math.abs(tx.amount).toString());
      setPricePerUnit(tx.price_per_unit_fiat.toString());
      setFeeAmount(tx.fee_amount?.toString() ?? "");
      setNotes(tx.notes ?? "");
      setDate(new Date(tx.timestamp));
      setTotalFiat(Math.abs(tx.total_fiat).toString());
    })();

    return () => {
      cancelled = true;
    };
  }, [id]);

  useEffect(() => {
    if (symbol) return;
    if (!assetSymbol && coins.length > 0) {
      setAssetSymbol(coins[0].symbol);
    }
  }, [assetSymbol, coins, symbol]);

  const selectedCoin = coins.find((coin) => coin.symbol === assetSymbol);
  const assetLabel = coinsLoading
    ? t("common.loading")
    : selectedCoin?.name ?? t("transaction.assetSymbol");

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

  const onDateChange = (_event: DateTimePickerEvent, selected?: Date) => {
    setShowDatePicker(false);
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

    const signedAmount = type === "BUY" ? amountNum : -amountNum;
    const totalFiatNumAbs = Number(totalFiat);
    const totalFiatAbs = Number.isFinite(totalFiatNumAbs)
      ? totalFiatNumAbs
      : Number(computedTotalFiatAbs);
    const signedTotalFiat =
      type === "BUY" ? -Math.abs(totalFiatAbs) : Math.abs(totalFiatAbs);

    const payload = {
      asset_symbol: assetSymbol.trim().toUpperCase(),
      amount: signedAmount,
      price_per_unit_fiat: priceNum,
      fiat_currency: "USD",
      fee_amount: feeNum,
      fee_currency: feeNum ? "USD" : null,
      notes: notes.trim() ? notes.trim() : null,
      type,
      source: "MANUAL",
      external_id: null,
      timestamp: date.getTime(),
      total_fiat: Number.isFinite(signedTotalFiat) ? signedTotalFiat : undefined,
    };

    if (isEditing && id) {
      await updateTransaction(id, payload);
      router.back();
      return;
    }

    await insertTransaction(payload);

    router.back();
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: theme.bg }}>
      <View style={{ padding: 16 }}>
        <Text style={{ color: theme.text, fontSize: 20, marginBottom: 12 }}>
          {isEditing ? t("transaction.editTitle") : t("transaction.addTitle")}
        </Text>

        <Text style={{ color: theme.muted, marginBottom: 6 }}>
          {t("transaction.type")}
        </Text>
        <View style={{ flexDirection: "row", marginBottom: 12 }}>
          <Pressable onPress={() => setType("BUY")}>
            <View
              style={{
                paddingVertical: 10,
                paddingHorizontal: 16,
                borderWidth: 1,
                borderColor: theme.muted,
                backgroundColor: type === "BUY" ? theme.gain : "transparent",
              }}
            >
              <Text style={{ color: theme.text }}>{t("transaction.buy")}</Text>
            </View>
          </Pressable>
          <View style={{ width: 12 }} />
          <Pressable onPress={() => setType("SELL")}>
            <View
              style={{
                paddingVertical: 10,
                paddingHorizontal: 16,
                borderWidth: 1,
                borderColor: theme.muted,
                backgroundColor: type === "SELL" ? theme.loss : "transparent",
              }}
            >
              <Text style={{ color: theme.text }}>{t("transaction.sell")}</Text>
            </View>
          </Pressable>
        </View>

        <Text style={{ color: theme.muted, marginBottom: 6 }}>
          {t("transaction.assetSymbol")}
        </Text>
        <View style={{ marginBottom: 12, zIndex: 1000 }}>
          <Pressable
            onPress={() => setShowAssetPicker(!showAssetPicker)}
            disabled={coinsLoading || coins.length === 0}
          >
            <View
              style={{
                borderWidth: 1,
                borderColor: theme.muted,
                padding: 10,
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
                backgroundColor: theme.bg,
                opacity: coinsLoading || coins.length === 0 ? 0.6 : 1,
              }}
            >
              <Text style={{ color: theme.text }}>
                {assetLabel}
              </Text>
              <Text style={{ color: theme.muted }}>⌄</Text>
            </View>
          </Pressable>

          {showAssetPicker && (
            <View
              style={{
                position: "absolute",
                top: "100%",
                left: 0,
                right: 0,
                backgroundColor: theme.bg,
                borderWidth: 1,
                borderColor: theme.muted,
                maxHeight: 250,
                zIndex: 1000,
              }}
            >
              <ScrollView nestedScrollEnabled={true}>
                {coins.map((coin) => (
                  <Pressable
                    key={coin.id}
                    onPress={() => {
                      setAssetSymbol(coin.symbol);
                      setShowAssetPicker(false);
                    }}
                    style={{
                      padding: 12,
                      borderBottomWidth: 1,
                      borderBottomColor: theme.muted,
                      backgroundColor:
                        assetSymbol === coin.symbol
                          ? theme.muted + "20"
                          : "transparent",
                    }}
                  >
                    <View style={{ flexDirection: "row", alignItems: "center" }}>
                      <Image
                        source={{ uri: coin.image }}
                        style={{ width: 24, height: 24, marginRight: 8, borderRadius: 12 }}
                        contentFit="contain"
                        cachePolicy="disk"
                      />
                      <Text style={{ color: theme.text, fontSize: 16 }}>
                        {coin.name}
                      </Text>
                    </View>
                  </Pressable>
                ))}
              </ScrollView>
            </View>
          )}
        </View>

        <Text style={{ color: theme.muted, marginBottom: 6 }}>
          {t("transaction.amount")}
        </Text>
        <TextInput
          value={amount}
          onChangeText={setAmount}
          keyboardType="numeric"
          placeholder="0.0"
          placeholderTextColor={theme.muted}
          style={{
            borderWidth: 1,
            borderColor: theme.muted,
            color: theme.text,
            padding: 10,
            marginBottom: 12,
          }}
        />

        <Text style={{ color: theme.muted, marginBottom: 6 }}>
          {t("transaction.pricePerUnit")}
        </Text>
        <TextInput
          value={pricePerUnit}
          onChangeText={setPricePerUnit}
          keyboardType="numeric"
          placeholder="0.0"
          placeholderTextColor={theme.muted}
          style={{
            borderWidth: 1,
            borderColor: theme.muted,
            color: theme.text,
            padding: 10,
            marginBottom: 12,
          }}
        />

        <Text style={{ color: theme.muted, marginBottom: 6 }}>
          {t("transaction.totalFiat")}
        </Text>
        <View
          style={{
            borderWidth: 1,
            borderColor: theme.muted,
            flexDirection: "row",
            alignItems: "center",
            paddingHorizontal: 10,
            marginBottom: 12,
          }}
        >
          <Text style={{ color: theme.muted, marginRight: 6 }}>$</Text>
          <TextInput
            value={totalFiat}
            onChangeText={(value) => {
              setTotalFiat(value);
              setTotalFiatDirty(true);
            }}
            keyboardType="numeric"
            placeholder="0.0"
            placeholderTextColor={theme.muted}
            style={{
              color: theme.text,
              paddingVertical: 10,
              flex: 1,
            }}
          />
        </View>

        <Text style={{ color: theme.muted, marginBottom: 6 }}>
          {t("transaction.feeAmount")}
        </Text>
        <TextInput
          value={feeAmount}
          onChangeText={setFeeAmount}
          keyboardType="numeric"
          placeholder="0.0"
          placeholderTextColor={theme.muted}
          style={{
            borderWidth: 1,
            borderColor: theme.muted,
            color: theme.text,
            padding: 10,
            marginBottom: 12,
          }}
        />

        <Text style={{ color: theme.muted, marginBottom: 6 }}>
          {t("transaction.notes")}
        </Text>
        <TextInput
          value={notes}
          onChangeText={setNotes}
          placeholder={t("transaction.notesPlaceholder")}
          placeholderTextColor={theme.muted}
          style={{
            borderWidth: 1,
            borderColor: theme.muted,
            color: theme.text,
            padding: 10,
            marginBottom: 12,
          }}
          multiline
        />

        {error ? (
          <Text style={{ color: theme.loss, marginBottom: 12 }}>{error}</Text>
        ) : null}

        <Text style={{ color: theme.muted, marginBottom: 6 }}>
          {t("transaction.timestamp")}
        </Text>
        <Pressable onPress={() => setShowDatePicker(true)}>
          <View
            style={{
              borderWidth: 1,
              borderColor: theme.muted,
              padding: 10,
              marginBottom: 12,
            }}
          >
            <Text style={{ color: theme.text }}>
              {formatDateTime(date.getTime())}
            </Text>
          </View>
        </Pressable>

        {showDatePicker ? (
          <DateTimePicker
            value={date}
            mode="datetime"
            display="default"
            onChange={onDateChange}
          />
        ) : null}

        <Button
          title={
            isEditing ? t("transaction.saveChanges") : t("transaction.submit")
          }
          onPress={onSubmit}
        />
      </View>
    </ScrollView>
  );
}
