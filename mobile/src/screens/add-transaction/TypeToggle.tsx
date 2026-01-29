import { View, Text, Pressable } from "react-native";
import { spacing, radius, ThemeTokens } from "@/src/theme";
import type { TxType } from "./useAddTransactionForm";

type TypeToggleProps = {
  theme: ThemeTokens;
  type: TxType;
  onChange: (type: TxType) => void;
  t: (key: string) => string;
};

export function TypeToggle({ theme, type, onChange, t }: TypeToggleProps) {
  return (
    <View
      style={{
        flexDirection: "row",
        marginBottom: spacing.md,
        gap: spacing.xl,
        paddingHorizontal: spacing.lg,
      }}
    >
      <Pressable onPress={() => onChange("BUY")} style={{ flex: 1 }}>
        <View>
          <Text
            style={{
              color: type === "BUY" ? theme.gain : theme.textSecondary,
              fontWeight: type === "BUY" ? "700" : "400",
              fontSize: 18,
              textAlign: "center",
              paddingBottom: spacing.sm,
            }}
          >
            {t("transaction.buy")}
          </Text>
          {type === "BUY" && (
            <View
              style={{
                height: 3,
                backgroundColor: theme.gain,
                borderRadius: radius.sm,
              }}
            />
          )}
        </View>
      </Pressable>
      <Pressable onPress={() => onChange("SELL")} style={{ flex: 1 }}>
        <View>
          <Text
            style={{
              color: type === "SELL" ? theme.loss : theme.textSecondary,
              fontWeight: type === "SELL" ? "700" : "400",
              fontSize: 18,
              textAlign: "center",
              paddingBottom: spacing.sm,
            }}
          >
            {t("transaction.sell")}
          </Text>
          {type === "SELL" && (
            <View
              style={{
                height: 3,
                backgroundColor: theme.loss,
                borderRadius: radius.sm,
              }}
            />
          )}
        </View>
      </Pressable>
    </View>
  );
}
