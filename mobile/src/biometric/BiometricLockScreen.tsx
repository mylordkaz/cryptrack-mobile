import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Image } from "expo-image";
import { Fingerprint } from "lucide-react-native";
import { useTheme } from "@/src/theme";
import { useLocale } from "@/src/i18n/LocaleProvider";
import { useBiometric } from "./BiometricProvider";

const PIN_LENGTH = 4;
const NUMPAD_W = 330;
const KEY_W = NUMPAD_W / 3;
const KEY_H = 82;

const ROWS = [
  ["1", "2", "3"],
  ["4", "5", "6"],
  ["7", "8", "9"],
  ["del", "0", "faceid"],
];

export function BiometricLockScreen() {
  const { theme, isDark } = useTheme();
  const { t } = useLocale();
  const {
    isAuthenticating,
    authenticate,
    unlock,
    verifyFallbackPassword,
    pinLockedUntil,
    remainingPinAttempts,
  } = useBiometric();

  const [showNumpad, setShowNumpad] = useState(false);
  const [pin, setPin] = useState("");
  const [pinError, setPinError] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [lockoutRemaining, setLockoutRemaining] = useState<number | null>(null);
  const triggered = useRef(false);
  const isPinLocked =
    pinLockedUntil !== null && pinLockedUntil > Date.now();

  useEffect(() => {
    if (triggered.current) return;
    triggered.current = true;
    runFaceID();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!pinLockedUntil) {
      setLockoutRemaining(null);
      return;
    }
    const updateRemaining = () => {
      const diff = pinLockedUntil - Date.now();
      setLockoutRemaining(diff > 0 ? Math.ceil(diff / 1000) : 0);
    };
    updateRemaining();
    const interval = setInterval(updateRemaining, 1000);
    return () => clearInterval(interval);
  }, [pinLockedUntil]);

  const runFaceID = async () => {
    setShowNumpad(false);
    setPin("");
    setPinError(false);
    const success = await authenticate();
    if (success) unlock();
    else setShowNumpad(true);
  };

  const handleDigit = async (d: string) => {
    if (isVerifying || pinError || pin.length >= PIN_LENGTH || isPinLocked) return;
    const next = pin + d;
    setPin(next);
    if (next.length === PIN_LENGTH) {
      setIsVerifying(true);
      const result = await verifyFallbackPassword(next);
      setIsVerifying(false);
      if (result === "success") {
        unlock();
      } else {
        setPinError(true);
        setTimeout(() => { setPin(""); setPinError(false); }, 600);
      }
    }
  };

  const handleDelete = () => {
    if (isVerifying) return;
    if (pinError) { setPin(""); setPinError(false); return; }
    setPin((p) => p.slice(0, -1));
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>

      {/* Logo — always visible */}
      <View style={styles.logoArea}>
        <Image
          source={
            isDark
              ? require("@/assets/images/logo-dark.png")
              : require("@/assets/images/logo-light.png")
          }
          style={styles.logo}
          contentFit="contain"
        />
        {isAuthenticating && (
          <ActivityIndicator color={theme.accent} style={{ marginTop: 12 }} />
        )}
      </View>

      {/* PIN area + numpad — only when Face ID failed */}
      {showNumpad && (
        <View style={styles.bottomArea}>
          {/* "Enter PIN" + dots */}
          <View style={styles.pinHeader}>
            <Text style={[styles.pinTitle, { color: theme.text }]}>
              {t("settings.pinEnter")}
            </Text>
            <View style={styles.dots}>
              {Array.from({ length: PIN_LENGTH }).map((_, i) => (
                <View
                  key={i}
                  style={[
                    styles.dot,
                    {
                      backgroundColor:
                        i < pin.length
                          ? pinError ? theme.loss : theme.text
                          : "transparent",
                      borderColor: pinError ? theme.loss : theme.text,
                    },
                  ]}
                />
              ))}
            </View>
            {isPinLocked ? (
              <Text style={[styles.pinSubtitle, { color: theme.loss }]}>
                {t("settings.pinLocked", { seconds: lockoutRemaining ?? 30 })}
              </Text>
            ) : (
              <Text style={[styles.pinSubtitle, { color: theme.textSecondary }]}>
                {t("settings.pinAttemptsLeft", { count: remainingPinAttempts })}
              </Text>
            )}
            {isVerifying && (
              <ActivityIndicator color={theme.accent} style={{ marginTop: 6 }} />
            )}
          </View>

          {/* Numpad */}
          <View style={styles.numpad}>
            {ROWS.map((row, ri) => (
              <View key={ri} style={styles.row}>
                {row.map((key) => {
                  if (key === "del") {
                    return (
                      <TouchableOpacity key={key} style={styles.key} onPress={handleDelete} activeOpacity={0.5}>
                        <Text style={[styles.delText, { color: theme.text }]}>⌫</Text>
                      </TouchableOpacity>
                    );
                  }
                  if (key === "faceid") {
                    return (
                      <TouchableOpacity key={key} style={styles.key} onPress={runFaceID} activeOpacity={0.5}>
                        <Fingerprint size={28} color={theme.text} />
                      </TouchableOpacity>
                    );
                  }
                  return (
                    <TouchableOpacity key={key} style={styles.key} onPress={() => handleDigit(key)} activeOpacity={0.5}>
                      <Text style={[styles.digit, { color: theme.text }]}>{key}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            ))}
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "space-between",
    paddingBottom: 32,
  },
  logoArea: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  logo: {
    width: 120,
    height: 120,
  },
  bottomArea: {
    width: "100%",
    alignItems: "center",
    gap: 20,
  },
  pinHeader: {
    alignItems: "center",
    gap: 16,
  },
  pinTitle: {
    fontSize: 17,
    fontWeight: "500",
  },
  pinSubtitle: {
    fontSize: 14,
    fontWeight: "400",
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
  numpad: {
    width: NUMPAD_W,
  },
  row: {
    flexDirection: "row",
  },
  key: {
    width: KEY_W,
    height: KEY_H,
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
});
