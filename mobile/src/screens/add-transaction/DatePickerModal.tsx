import { View, Text, Pressable, Modal, Platform } from "react-native";
import DateTimePicker, {
  DateTimePickerEvent,
} from "@react-native-community/datetimepicker";
import { spacing, radius, ThemeTokens } from "@/src/theme";

type DatePickerModalProps = {
  theme: ThemeTokens;
  t: (key: string) => string;
  visible: boolean;
  date: Date;
  onClose: () => void;
  onChange: (event: DateTimePickerEvent, selected?: Date) => void;
};

export function DatePickerModal({
  theme,
  t,
  visible,
  date,
  onClose,
  onChange,
}: DatePickerModalProps) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable
        style={{
          flex: 1,
          backgroundColor: "rgba(0, 0, 0, 0.5)",
          justifyContent: "flex-end",
        }}
        onPress={onClose}
      >
        <Pressable onPress={(event) => event.stopPropagation()}>
          <View
            style={{
              backgroundColor: theme.surface,
              borderTopLeftRadius: radius.lg,
              borderTopRightRadius: radius.lg,
              paddingBottom: Platform.OS === "ios" ? spacing.xl : spacing.md,
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
              <Pressable onPress={onClose}>
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
                onChange={onChange}
                textColor={theme.text}
                themeVariant={theme.bg === "#0B0F14" ? "dark" : "light"}
              />
            </View>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
