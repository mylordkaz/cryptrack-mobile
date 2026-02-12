import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { Alert, AppState, AppStateStatus } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Crypto from "expo-crypto";
import type * as LocalAuthenticationType from "expo-local-authentication";
import { useLocale } from "@/src/i18n/LocaleProvider";

const STORAGE_KEY = "biometric-enabled";
const PASSWORD_KEY = "biometric-password";
const HASH_SALT = "cryptrack-biometric-v1";

// Dynamically require so the app degrades gracefully in Expo Go (which lacks
// the native ExpoLocalAuthentication module). In a dev/production build the
// module is present and everything works normally.
let LocalAuthentication: typeof LocalAuthenticationType | null = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  LocalAuthentication = require("expo-local-authentication");
} catch {
  // Expo Go — native module not available
}

async function hashPassword(password: string): Promise<string> {
  return Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    `${HASH_SALT}:${password}`,
  );
}

interface BiometricContextValue {
  enabled: boolean;
  isLocked: boolean;
  isAuthenticating: boolean;
  hasFallbackPassword: boolean;
  awaitingPasswordSetup: boolean;
  enableBiometric: () => Promise<boolean>;
  disableBiometric: () => void;
  unlock: () => void;
  authenticate: () => Promise<boolean>;
  setupFallbackPassword: (password: string) => Promise<void>;
  verifyFallbackPassword: (password: string) => Promise<boolean>;
  cancelPasswordSetup: () => void;
}

const BiometricContext = createContext<BiometricContextValue | null>(null);

export function useBiometric(): BiometricContextValue {
  const ctx = useContext(BiometricContext);
  if (!ctx)
    throw new Error("useBiometric must be used within BiometricProvider");
  return ctx;
}

export function BiometricProvider({ children }: { children: React.ReactNode }) {
  const { t } = useLocale();
  const [enabled, setEnabled] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [hasFallbackPassword, setHasFallbackPassword] = useState(false);
  const [awaitingPasswordSetup, setAwaitingPasswordSetup] = useState(false);
  const appState = useRef<AppStateStatus>(AppState.currentState);

  // On mount: restore persisted state
  useEffect(() => {
    (async () => {
      const [stored, pw] = await Promise.all([
        AsyncStorage.getItem(STORAGE_KEY),
        AsyncStorage.getItem(PASSWORD_KEY),
      ]);
      if (stored === "true") {
        setEnabled(true);
        setIsLocked(true);
      }
      if (pw) setHasFallbackPassword(true);
    })();
  }, []);

  // AppState listener: only re-lock when returning from background.
  // We intentionally ignore inactive→active because that transition also
  // fires when the Face ID sheet dismisses, which would create an endless loop.
  useEffect(() => {
    const subscription = AppState.addEventListener(
      "change",
      (nextState: AppStateStatus) => {
        const prev = appState.current;
        appState.current = nextState;

        if (nextState === "active" && prev === "background") {
          setEnabled((isEnabled) => {
            if (isEnabled) {
              setIsLocked(true);
            }
            return isEnabled;
          });
        }
      },
    );

    return () => subscription.remove();
  }, []);

  const authenticate = useCallback(async (): Promise<boolean> => {
    if (!LocalAuthentication) return false;
    setIsAuthenticating(true);
    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: t("settings.biometricPrompt"),
        disableDeviceFallback: false,
      });
      return result.success;
    } catch {
      return false;
    } finally {
      setIsAuthenticating(false);
    }
  }, [t]);

  const enableBiometric = useCallback(async (): Promise<boolean> => {
    if (!LocalAuthentication) {
      Alert.alert(t("common.error"), t("settings.biometricNotAvailable"));
      return false;
    }

    const hasHardware = await LocalAuthentication.hasHardwareAsync();
    const isEnrolled = await LocalAuthentication.isEnrolledAsync();

    if (!hasHardware || !isEnrolled) {
      Alert.alert(t("common.error"), t("settings.biometricNotAvailable"));
      return false;
    }

    const success = await authenticate();
    if (success) {
      // Don't persist or set enabled=true yet — wait for password setup
      setAwaitingPasswordSetup(true);
    }
    return success;
  }, [authenticate, t]);

  const setupFallbackPassword = useCallback(
    async (password: string): Promise<void> => {
      const hash = await hashPassword(password);
      await AsyncStorage.setItem(PASSWORD_KEY, hash);
      await AsyncStorage.setItem(STORAGE_KEY, "true");
      setHasFallbackPassword(true);
      setEnabled(true);
      setAwaitingPasswordSetup(false);
    },
    [],
  );

  const verifyFallbackPassword = useCallback(
    async (password: string): Promise<boolean> => {
      const stored = await AsyncStorage.getItem(PASSWORD_KEY);
      if (!stored) return false;
      const hash = await hashPassword(password);
      return hash === stored;
    },
    [],
  );

  const cancelPasswordSetup = useCallback(() => {
    setAwaitingPasswordSetup(false);
    // enabled stays false, nothing was persisted
  }, []);

  const disableBiometric = useCallback(() => {
    setEnabled(false);
    setIsLocked(false);
    setAwaitingPasswordSetup(false);
    setHasFallbackPassword(false);
    AsyncStorage.setItem(STORAGE_KEY, "false");
    AsyncStorage.removeItem(PASSWORD_KEY);
  }, []);

  const unlock = useCallback(() => {
    setIsLocked(false);
  }, []);

  return (
    <BiometricContext.Provider
      value={{
        enabled,
        isLocked,
        isAuthenticating,
        hasFallbackPassword,
        awaitingPasswordSetup,
        enableBiometric,
        disableBiometric,
        unlock,
        authenticate,
        setupFallbackPassword,
        verifyFallbackPassword,
        cancelPasswordSetup,
      }}
    >
      {children}
    </BiometricContext.Provider>
  );
}
