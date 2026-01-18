import { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  TextInput,
  ScrollView,
  Pressable,
  Modal,
  Platform,
} from "react-native";
import { Image } from "expo-image";
import DateTimePicker, {
  DateTimePickerEvent,
} from "@react-native-community/datetimepicker";
import { useTheme, spacing, radius } from "@/src/theme";
import { t } from "@/src/i18n";
import { Plus, Minus } from "lucide-react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
  getTransactionById,
  insertTransaction,
  updateTransaction,
} from "@/src/db/transactions";
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
  const [searchQuery, setSearchQuery] = useState("");
  const [showAssetList, setShowAssetList] = useState(false);
  const [showOptionalFields, setShowOptionalFields] = useState(false);
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
      if (tx.fee_amount || tx.notes) {
        setShowOptionalFields(true);
      }
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

  const filteredCoins = useMemo(() => {
    if (!searchQuery.trim()) return coins;
    const query = searchQuery.toLowerCase();
    return coins.filter(
      (coin) =>
        coin.name.toLowerCase().includes(query) ||
        coin.symbol.toLowerCase().includes(query),
    );
  }, [coins, searchQuery]);

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
      total_fiat: Number.isFinite(signedTotalFiat)
        ? signedTotalFiat
        : undefined,
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
      <View style={{ padding: spacing.md }}>
        <View
          style={{
            flexDirection: "row",
            justifyContent: "center",
            gap: spacing.sm,
            marginBottom: spacing.md,
          }}
        >
          <Pressable onPress={() => setType("BUY")}>
            <View
              style={{
                paddingVertical: spacing.sm,
                paddingHorizontal: spacing.lg,
                borderRadius: radius.md,
                borderWidth: 1,
                borderColor: type === "BUY" ? theme.gain : theme.border,
                backgroundColor:
                  type === "BUY" ? theme.gain + "20" : "transparent",
              }}
            >
              <Text
                style={{
                  color: type === "BUY" ? theme.gain : theme.text,
                  fontWeight: type === "BUY" ? "600" : "400",
                  fontSize: 15,
                }}
              >
                {t("transaction.buy")}
              </Text>
            </View>
          </Pressable>
          <Pressable onPress={() => setType("SELL")}>
            <View
              style={{
                paddingVertical: spacing.sm,
                paddingHorizontal: spacing.lg,
                borderRadius: radius.md,
                borderWidth: 1,
                borderColor: type === "SELL" ? theme.loss : theme.border,
                backgroundColor:
                  type === "SELL" ? theme.loss + "20" : "transparent",
              }}
            >
              <Text
                style={{
                  color: type === "SELL" ? theme.loss : theme.text,
                  fontWeight: type === "SELL" ? "600" : "400",
                  fontSize: 15,
                }}
              >
                {t("transaction.sell")}
              </Text>
            </View>
          </Pressable>
        </View>

        <Text
          style={{
            color: theme.textSecondary,
            marginBottom: spacing.xs,
            fontSize: 13,
          }}
        >
          {t("transaction.asset")}
        </Text>
        {!showAssetList && selectedCoin ? (
          <Pressable
            onPress={() => {
              setShowAssetList(true);
              setSearchQuery("");
            }}
            style={{
              borderWidth: 1,
              borderColor: theme.border,
              borderRadius: radius.md,
              padding: spacing.sm,
              marginBottom: spacing.md,
              flexDirection: "row",
              alignItems: "center",
              minHeight: 44,
            }}
          >
            <Image
              source={{ uri: selectedCoin.image }}
              style={{
                width: 28,
                height: 28,
                marginRight: spacing.sm,
                borderRadius: 14,
              }}
              contentFit="contain"
              cachePolicy="disk"
            />
            <Text style={{ color: theme.text, fontSize: 15, flex: 1 }}>
              {selectedCoin.name}
            </Text>
            <Text style={{ color: theme.textSecondary, fontSize: 13 }}>
              {selectedCoin.symbol.toUpperCase()}
            </Text>
          </Pressable>
        ) : (
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            onFocus={() => setShowAssetList(true)}
            placeholder={t("transaction.searchAsset")}
            placeholderTextColor={theme.muted}
            autoFocus={showAssetList}
            style={{
              borderWidth: 1,
              borderColor: theme.border,
              borderRadius: radius.md,
              color: theme.text,
              padding: spacing.sm,
              marginBottom: spacing.md,
              fontSize: 15,
              minHeight: 44,
            }}
          />
        )}
        {showAssetList && (
          <ScrollView
            style={{
              maxHeight: 200,
              borderWidth: 1,
              borderColor: theme.border,
              borderRadius: radius.md,
              marginBottom: spacing.md,
            }}
            nestedScrollEnabled={true}
          >
            {coinsLoading ? (
              <View style={{ padding: spacing.md, alignItems: "center" }}>
                <Text style={{ color: theme.textSecondary }}>
                  {t("common.loading")}
                </Text>
              </View>
            ) : filteredCoins.length === 0 ? (
              <View style={{ padding: spacing.md, alignItems: "center" }}>
                <Text style={{ color: theme.textSecondary }}>
                  {t("common.noData")}
                </Text>
              </View>
            ) : (
              filteredCoins.map((coin) => (
                <Pressable
                  key={coin.id}
                  onPress={() => {
                    setAssetSymbol(coin.symbol);
                    setSearchQuery("");
                    setShowAssetList(false);
                  }}
                  style={{
                    padding: spacing.sm,
                    borderBottomWidth: 1,
                    borderBottomColor: theme.border,
                    backgroundColor:
                      assetSymbol === coin.symbol
                        ? theme.accent + "10"
                        : "transparent",
                  }}
                >
                  <View style={{ flexDirection: "row", alignItems: "center" }}>
                    <Image
                      source={{ uri: coin.image }}
                      style={{
                        width: 32,
                        height: 32,
                        marginRight: spacing.sm,
                        borderRadius: 16,
                      }}
                      contentFit="contain"
                      cachePolicy="disk"
                    />
                    <View>
                      <Text
                        style={{
                          color: theme.text,
                          fontSize: 15,
                          fontWeight: "500",
                        }}
                      >
                        {coin.name}
                      </Text>
                      <Text
                        style={{
                          color: theme.textSecondary,
                          fontSize: 13,
                        }}
                      >
                        {coin.symbol.toUpperCase()}
                      </Text>
                    </View>
                  </View>
                </Pressable>
              ))
            )}
          </ScrollView>
        )}

        <Text
          style={{
            color: theme.textSecondary,
            marginBottom: spacing.xs,
            fontSize: 13,
          }}
        >
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
            borderColor: theme.border,
            borderRadius: radius.md,
            color: theme.text,
            padding: spacing.sm,
            marginBottom: spacing.md,
            fontSize: 15,
            minHeight: 44,
          }}
        />

        <Text
          style={{
            color: theme.textSecondary,
            marginBottom: spacing.xs,
            fontSize: 13,
          }}
        >
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
            borderColor: theme.border,
            borderRadius: radius.md,
            color: theme.text,
            padding: spacing.sm,
            marginBottom: spacing.md,
            fontSize: 15,
            minHeight: 44,
          }}
        />

        <Text
          style={{
            color: theme.textSecondary,
            marginBottom: spacing.xs,
            fontSize: 13,
          }}
        >
          {t("transaction.totalFiat")}
        </Text>
        <View
          style={{
            borderWidth: 1,
            borderColor: theme.border,
            borderRadius: radius.md,
            flexDirection: "row",
            alignItems: "center",
            paddingHorizontal: spacing.sm,
            marginBottom: spacing.md,
            minHeight: 44,
          }}
        >
          <Text
            style={{
              color: theme.textSecondary,
              marginRight: spacing.xs,
              fontSize: 15,
            }}
          >
            $
          </Text>
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
              flex: 1,
              fontSize: 15,
            }}
          />
        </View>

        {error ? (
          <Text
            style={{
              color: theme.loss,
              marginBottom: spacing.md,
              fontSize: 13,
            }}
          >
            {error}
          </Text>
        ) : null}

        <Text
          style={{
            color: theme.textSecondary,
            marginBottom: spacing.xs,
            fontSize: 13,
          }}
        >
          {t("transaction.timestamp")}
        </Text>
        <Pressable onPress={() => setShowDatePicker(true)}>
          <View
            style={{
              borderWidth: 1,
              borderColor: theme.border,
              borderRadius: radius.md,
              padding: spacing.sm,
              marginBottom: spacing.md,
              minHeight: 44,
              justifyContent: "center",
            }}
          >
            <Text style={{ color: theme.text, fontSize: 15 }}>
              {formatDateTime(date.getTime())}
            </Text>
          </View>
        </Pressable>

        <Pressable
          onPress={() => setShowOptionalFields(!showOptionalFields)}
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            paddingVertical: spacing.sm,
            marginBottom: spacing.md,
          }}
        >
          <Text
            style={{
              color: theme.textSecondary,
              fontSize: 13,
            }}
          >
            {t("transaction.optionalFieldsTitle")}
          </Text>
          {showOptionalFields ? (
            <Minus size={16} color={theme.textSecondary} />
          ) : (
            <Plus size={16} color={theme.textSecondary} />
          )}
        </Pressable>

        {showOptionalFields && (
          <>
            <Text
              style={{
                color: theme.textSecondary,
                marginBottom: spacing.xs,
                fontSize: 13,
              }}
            >
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
                borderColor: theme.border,
                borderRadius: radius.md,
                color: theme.text,
                padding: spacing.sm,
                marginBottom: spacing.md,
                fontSize: 15,
                minHeight: 44,
              }}
            />

            <Text
              style={{
                color: theme.textSecondary,
                marginBottom: spacing.xs,
                fontSize: 13,
              }}
            >
              {t("transaction.notes")}
            </Text>
            <TextInput
              value={notes}
              onChangeText={setNotes}
              placeholder={t("transaction.notesPlaceholder")}
              placeholderTextColor={theme.muted}
              style={{
                borderWidth: 1,
                borderColor: theme.border,
                borderRadius: radius.md,
                color: theme.text,
                padding: spacing.sm,
                marginBottom: spacing.md,
                fontSize: 15,
                minHeight: 70,
                textAlignVertical: "top",
              }}
              multiline
            />
          </>
        )}

        <Modal
          visible={showDatePicker}
          transparent
          animationType="fade"
          onRequestClose={() => setShowDatePicker(false)}
        >
          <Pressable
            style={{
              flex: 1,
              backgroundColor: "rgba(0, 0, 0, 0.5)",
              justifyContent: "flex-end",
            }}
            onPress={() => setShowDatePicker(false)}
          >
            <Pressable onPress={(e) => e.stopPropagation()}>
              <View
                style={{
                  backgroundColor: theme.surface,
                  borderTopLeftRadius: radius.lg,
                  borderTopRightRadius: radius.lg,
                  paddingBottom:
                    Platform.OS === "ios" ? spacing.xl : spacing.md,
                }}
              >
                <View
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: spacing.md,
                    borderBottomWidth: 1,
                    borderBottomColor: theme.border,
                  }}
                >
                  <Text
                    style={{
                      color: theme.text,
                      fontSize: 16,
                      fontWeight: "600",
                    }}
                  >
                    {t("transaction.timestamp")}
                  </Text>
                  <Pressable onPress={() => setShowDatePicker(false)}>
                    <Text
                      style={{
                        color: theme.accent,
                        fontSize: 16,
                        fontWeight: "600",
                      }}
                    >
                      {t("common.done")}
                    </Text>
                  </Pressable>
                </View>
                <View style={{ alignItems: "center", width: "100%" }}>
                  <DateTimePicker
                    value={date}
                    mode="datetime"
                    display={Platform.OS === "ios" ? "spinner" : "default"}
                    onChange={onDateChange}
                    textColor={theme.text}
                    themeVariant={theme.bg === "#0B0F14" ? "dark" : "light"}
                  />
                </View>
              </View>
            </Pressable>
          </Pressable>
        </Modal>

        <Pressable onPress={onSubmit}>
          {({ pressed }) => (
            <View
              style={{
                backgroundColor: theme.accent,
                borderRadius: radius.md,
                padding: spacing.md,
                alignItems: "center",
                opacity: pressed ? 0.8 : 1,
              }}
            >
              <Text
                style={{
                  color: "#FFFFFF",
                  fontSize: 16,
                  fontWeight: "600",
                }}
              >
                {isEditing
                  ? t("transaction.saveChanges")
                  : t("transaction.submit")}
              </Text>
            </View>
          )}
        </Pressable>
      </View>
    </ScrollView>
  );
}
