import { Fragment } from "react";
import { View, Text, TextInput, Pressable } from "react-native";
import { Plus, Minus } from "lucide-react-native";
import { spacing, radius, ThemeTokens } from "@/src/theme";

type OptionalFieldsProps = {
  theme: ThemeTokens;
  t: (key: string) => string;
  showOptionalFields: boolean;
  onToggle: () => void;
  feeAmount: string;
  setFeeAmount: (value: string) => void;
  notes: string;
  setNotes: (value: string) => void;
};

export function OptionalFields({
  theme,
  t,
  showOptionalFields,
  onToggle,
  feeAmount,
  setFeeAmount,
  notes,
  setNotes,
}: OptionalFieldsProps) {
  return (
    <Fragment>
      <Pressable
        onPress={onToggle}
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
        <Fragment>
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
        </Fragment>
      )}
    </Fragment>
  );
}
