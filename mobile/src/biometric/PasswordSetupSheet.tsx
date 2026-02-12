import React, { useState } from "react";
import {
  Dimensions,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Image } from "expo-image";
import { useTheme } from "@/src/theme";
import { useLocale } from "@/src/i18n/LocaleProvider";
import { useBiometric } from "./BiometricProvider";

const PIN_LENGTH = 4;
const NUMPAD_W = 330;
const KEY_SIZE = NUMPAD_W / 3;

const ROWS = [
  ["1", "2", "3"],
  ["4", "5", "6"],
  ["7", "8", "9"],
  ["del", "0", ""],
];

export function PasswordSetupSheet() {
  const { theme, isDark } = useTheme();
  const { t } = useLocale();
  const { awaitingPasswordSetup, setupFallbackPassword, cancelPasswordSetup } = useBiometric();

  const [step, setStep] = useState<"enter" | "confirm">("enter");
  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [error, setError] = useState(false);

  const current = step === "enter" ? pin : confirmPin;

  const handleDigit = (d: string) => {
    if (current.length >= PIN_LENGTH) return;
    const next = current + d;
    setError(false);

    if (step === "enter") {
      setPin(next);
      if (next.length === PIN_LENGTH) {
        // auto-advance to confirm step
        setTimeout(() => {
          setStep("confirm");
          setConfirmPin("");
        }, 150);
      }
    } else {
      setConfirmPin(next);
      if (next.length === PIN_LENGTH) {
        if (next === pin) {
          setupFallbackPassword(pin);
          // reset
          setPin(""); setConfirmPin(""); setStep("enter"); setError(false);
        } else {
          setError(true);
          setTimeout(() => { setConfirmPin(""); setError(false); }, 600);
        }
      }
    }
  };

  const handleDelete = () => {
    setError(false);
    if (step === "enter") {
      setPin((p) => p.slice(0, -1));
    } else {
      if (confirmPin.length === 0) {
        // go back to enter step
        setStep("enter");
        setPin("");
      } else {
        setConfirmPin((p) => p.slice(0, -1));
      }
    }
  };

  const handleCancel = () => {
    setPin(""); setConfirmPin(""); setStep("enter"); setError(false);
    cancelPasswordSetup();
  };

  const subtitle = step === "enter"
    ? t("settings.pinSetupDescription")
    : t("settings.pinConfirm");

  return (
    <Modal
      visible={awaitingPasswordSetup}
      transparent={false}
      animationType="slide"
      onRequestClose={handleCancel}
    >
      <View style={[styles.container, { backgroundColor: theme.bg }]}>
        {/* Header */}
        <View style={styles.header}>
          <Image
            source={
              isDark
                ? require("@/assets/images/logo-dark.png")
                : require("@/assets/images/logo-light.png")
            }
            style={styles.logo}
            contentFit="contain"
          />
          <Text style={[styles.title, { color: theme.text }]}>
            {t("settings.pinSetupTitle")}
          </Text>
          <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
            {subtitle}
          </Text>

          {/* 4 dots */}
          <View style={styles.dots}>
            {Array.from({ length: PIN_LENGTH }).map((_, i) => (
              <View
                key={i}
                style={[
                  styles.dot,
                  {
                    backgroundColor:
                      i < current.length
                        ? error ? theme.loss : theme.text
                        : "transparent",
                    borderColor: error ? theme.loss : theme.text,
                  },
                ]}
              />
            ))}
          </View>

          {error && (
            <Text style={[styles.errorText, { color: theme.loss }]}>
              {t("settings.pinMismatch")}
            </Text>
          )}
        </View>

        {/* Numpad */}
        <View style={styles.numpad}>
          {ROWS.map((row, ri) => (
            <View key={ri} style={styles.row}>
              {row.map((key, ki) => {
                if (key === "del") {
                  return (
                    <TouchableOpacity
                      key={key}
                      style={styles.key}
                      onPress={handleDelete}
                      activeOpacity={0.5}
                    >
                      <Text style={[styles.delText, { color: theme.text }]}>⌫</Text>
                    </TouchableOpacity>
                  );
                }
                if (key === "") {
                  // empty bottom-right cell — show Cancel
                  return (
                    <TouchableOpacity
                      key={`empty-${ki}`}
                      style={styles.key}
                      onPress={handleCancel}
                      activeOpacity={0.5}
                    >
                      <Text style={[styles.cancelText, { color: theme.textSecondary }]}>
                        {t("settings.pinCancel")}
                      </Text>
                    </TouchableOpacity>
                  );
                }
                return (
                  <TouchableOpacity
                    key={key}
                    style={styles.key}
                    onPress={() => handleDigit(key)}
                    activeOpacity={0.5}
                  >
                    <Text style={[styles.digit, { color: theme.text }]}>{key}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          ))}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 120,
    paddingBottom: 48,
  },
  header: {
    alignItems: "center",
    gap: 24,
    paddingHorizontal: 32,
  },
  logo: {
    width: 100,
    height: 100,
  },
  title: {
    fontSize: 22,
    fontWeight: "600",
  },
  subtitle: {
    fontSize: 14,
    textAlign: "center",
  },
  dots: {
    flexDirection: "row",
    gap: 20,
  },
  dot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 1,
  },
  errorText: {
    fontSize: 13,
  },
  numpad: {
    width: NUMPAD_W,
  },
  row: {
    flexDirection: "row",
  },
  key: {
    width: KEY_SIZE,
    height: 82,
    alignItems: "center",
    justifyContent: "center",
  },
  digit: {
    fontSize: 24,
    fontWeight: "300",
  },
  delText: {
    fontSize: 20,
  },
  cancelText: {
    fontSize: 15,
  },
});
