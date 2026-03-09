import { useState } from "react";
import { View, Text, Pressable, Modal, Platform } from "react-native";
import DateTimePicker, {
  DateTimePickerEvent,
} from "@react-native-community/datetimepicker";
import { spacing, radius, ThemeTokens } from "@/src/theme";

type Step = "date" | "time";

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
  const [step, setStep] = useState<Step>("date");

  const handleClose = () => {
    setStep("date");
    onClose();
  };

  const handleNext = () => {
    setStep("time");
  };

  const handleBack = () => {
    setStep("date");
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
      onShow={() => setStep("date")}
    >
      <Pressable
        style={{
          flex: 1,
          backgroundColor: "rgba(0, 0, 0, 0.5)",
          justifyContent: "flex-end",
        }}
        onPress={handleClose}
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
            {/* Header */}
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
              {step === "time" ? (
                <Pressable onPress={handleBack}>
                  <Text
                    style={{
                      color: theme.accent,
                      fontSize: 16,
                      fontWeight: "600",
                    }}
                  >
                    {t("transaction.date")}
                  </Text>
                </Pressable>
              ) : (
                <Text
                  style={{
                    color: theme.text,
                    fontSize: 16,
                    fontWeight: "600",
                  }}
                >
                  {t("transaction.timestamp")}
                </Text>
              )}

              <Pressable onPress={step === "date" ? handleNext : handleClose}>
                <Text
                  style={{
                    color: theme.accent,
                    fontSize: 16,
                    fontWeight: "600",
                  }}
                >
                  {step === "date" ? t("common.next") : t("common.done")}
                </Text>
              </Pressable>
            </View>

            {/* Picker */}
            <View style={{ alignItems: "center", width: "100%" }}>
              {step === "date" ? (
                <DateTimePicker
                  key="date-picker"
                  value={date}
                  mode="date"
                  display={Platform.OS === "ios" ? "inline" : "default"}
                  onChange={onChange}
                  textColor={theme.text}
                  themeVariant={theme.bg === "#0B0F14" ? "dark" : "light"}
                />
              ) : (
                <DateTimePicker
                  key="time-picker"
                  value={date}
                  mode="time"
                  display="spinner"
                  onChange={onChange}
                  textColor={theme.text}
                  themeVariant={theme.bg === "#0B0F14" ? "dark" : "light"}
                />
              )}
            </View>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
