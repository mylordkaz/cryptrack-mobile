import { View, Text, TextInput, ScrollView, Pressable } from "react-native";
import { useTheme, spacing, radius } from "@/src/theme";
import { useLocale } from "@/src/i18n/LocaleProvider";
import { formatDateTime } from "@/src/utils/format";
import { TypeToggle } from "@/src/screens/add-transaction/TypeToggle";
import { AssetPicker } from "@/src/screens/add-transaction/AssetPicker";
import { OptionalFields } from "@/src/screens/add-transaction/OptionalFields";
import { DatePickerModal } from "@/src/screens/add-transaction/DatePickerModal";
import { useAddTransactionForm } from "@/src/screens/add-transaction/useAddTransactionForm";

export default function AddTransactionScreen() {
  const { theme, isDark } = useTheme();
  const { t } = useLocale();
  const {
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
    setTotalFiatDirty,
    error,
    currencySymbol,
    onDateChange,
    onSubmit,
    isEditing,
    coinsLoading,
    coins,
    selectedCoin,
  } = useAddTransactionForm();

  return (
    <ScrollView style={{ flex: 1, backgroundColor: theme.bg }}>
      <View style={{ padding: spacing.md }}>
        <TypeToggle theme={theme} type={type} onChange={setType} t={t} />

        <AssetPicker
          theme={theme}
          t={t}
          coins={coins}
          selectedCoin={selectedCoin}
          assetSymbol={assetSymbol}
          showAssetList={showAssetList}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          setShowAssetList={setShowAssetList}
          onSelectAsset={setAssetSymbol}
          coinsLoading={coinsLoading}
        />

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
            {currencySymbol}
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

        <OptionalFields
          theme={theme}
          t={t}
          showOptionalFields={showOptionalFields}
          onToggle={() => setShowOptionalFields(!showOptionalFields)}
          feeAmount={feeAmount}
          setFeeAmount={setFeeAmount}
          notes={notes}
          setNotes={setNotes}
        />

        <DatePickerModal
          theme={theme}
          t={t}
          visible={showDatePicker}
          date={date}
          onClose={() => setShowDatePicker(false)}
          onChange={(_event, selected) => onDateChange(selected)}
        />

        <Pressable onPress={onSubmit}>
          {({ pressed }) => (
            <View
              style={{
                backgroundColor: theme.accent,
                borderRadius: radius.md,
                padding: spacing.md,
                alignItems: "center",
                opacity: pressed ? 0.8 : 1,
                shadowColor: theme.accent,
                shadowOpacity: 0.4,
                shadowRadius: 8,
                shadowOffset: { width: 0, height: 0 },
                elevation: 6,
              }}
            >
              <Text
                style={{
                  color: isDark ? "#000000" : "#FFFFFF",
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
