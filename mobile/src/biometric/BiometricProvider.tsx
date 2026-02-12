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
import * as SecureStore from "expo-secure-store";
import type * as LocalAuthenticationType from "expo-local-authentication";
import { useLocale } from "@/src/i18n/LocaleProvider";

const STORAGE_KEY = "biometric-enabled";
const PASSWORD_KEY = "biometric-password";
const PIN_ATTEMPTS_KEY = "biometric-pin-attempts";
const PIN_LOCK_UNTIL_KEY = "biometric-pin-lock-until";
const HASH_SALT = "cryptrack-biometric-v1";
const MAX_PIN_ATTEMPTS = 5;
const PIN_LOCKOUT_MS = 30_000;

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
  pinLockedUntil: number | null;
  remainingPinAttempts: number;
  enableBiometric: () => Promise<boolean>;
  disableBiometric: () => void;
  unlock: () => void;
  authenticate: () => Promise<boolean>;
  setupFallbackPassword: (password: string) => Promise<void>;
  verifyFallbackPassword: (password: string) => Promise<"success" | "invalid" | "locked">;
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
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [pinLockedUntil, setPinLockedUntil] = useState<number | null>(null);
  const appState = useRef<AppStateStatus>(AppState.currentState);
  const secureStoreAvailable = useRef<boolean | null>(null);

  const ensureSecureStoreAvailability = useCallback(async (): Promise<boolean> => {
    if (secureStoreAvailable.current !== null) {
      return secureStoreAvailable.current;
    }
    const available = await SecureStore.isAvailableAsync();
    secureStoreAvailable.current = available;
    return available;
  }, []);

  const readPasswordHash = useCallback(async (): Promise<string | null> => {
    const useSecureStore = await ensureSecureStoreAvailability();
    if (useSecureStore) {
      const secureHash = await SecureStore.getItemAsync(PASSWORD_KEY);
      if (secureHash) return secureHash;

      // Migrate legacy AsyncStorage value into SecureStore if it exists.
      const legacyHash = await AsyncStorage.getItem(PASSWORD_KEY);
      if (legacyHash) {
        await SecureStore.setItemAsync(PASSWORD_KEY, legacyHash);
        await AsyncStorage.removeItem(PASSWORD_KEY);
      }
      return legacyHash;
    }

    return AsyncStorage.getItem(PASSWORD_KEY);
  }, [ensureSecureStoreAvailability]);

  const persistPasswordHash = useCallback(
    async (hash: string): Promise<void> => {
      const useSecureStore = await ensureSecureStoreAvailability();
      if (useSecureStore) {
        await SecureStore.setItemAsync(PASSWORD_KEY, hash);
        await AsyncStorage.removeItem(PASSWORD_KEY);
        return;
      }

      await AsyncStorage.setItem(PASSWORD_KEY, hash);
    },
    [ensureSecureStoreAvailability],
  );

  const clearPasswordHash = useCallback(async (): Promise<void> => {
    const useSecureStore = await ensureSecureStoreAvailability();
    if (useSecureStore) {
      await SecureStore.deleteItemAsync(PASSWORD_KEY);
    }
    await AsyncStorage.removeItem(PASSWORD_KEY);
  }, [ensureSecureStoreAvailability]);

  const clearPinLock = useCallback(async () => {
    setFailedAttempts(0);
    setPinLockedUntil(null);
    await AsyncStorage.multiRemove([PIN_ATTEMPTS_KEY, PIN_LOCK_UNTIL_KEY]);
  }, []);

  // On mount: restore persisted state
  useEffect(() => {
    (async () => {
      const [stored, attemptsRaw, lockedUntilRaw, pw] = await Promise.all([
        AsyncStorage.getItem(STORAGE_KEY),
        AsyncStorage.getItem(PIN_ATTEMPTS_KEY),
        AsyncStorage.getItem(PIN_LOCK_UNTIL_KEY),
        readPasswordHash(),
      ]);
      const now = Date.now();

      if (lockedUntilRaw) {
        const parsedLock = Number(lockedUntilRaw);
        if (Number.isFinite(parsedLock) && parsedLock > now) {
          setPinLockedUntil(parsedLock);
        } else {
          await AsyncStorage.multiRemove([PIN_LOCK_UNTIL_KEY, PIN_ATTEMPTS_KEY]);
        }
      }

      const parsedAttempts = attemptsRaw ? Number(attemptsRaw) : 0;
      if (Number.isFinite(parsedAttempts) && parsedAttempts > 0) {
        setFailedAttempts(Math.min(parsedAttempts, MAX_PIN_ATTEMPTS));
      }

      if (stored === "true") {
        setEnabled(true);
        setIsLocked(true);
      }
      if (pw) setHasFallbackPassword(true);
    })();
  }, [readPasswordHash]);

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

  // Clear lock when timer expires
  useEffect(() => {
    if (!pinLockedUntil) return;
    const now = Date.now();
    if (pinLockedUntil <= now) {
      void clearPinLock();
      return;
    }
    const timeout = setTimeout(() => {
      void clearPinLock();
    }, pinLockedUntil - now);
    return () => clearTimeout(timeout);
  }, [clearPinLock, pinLockedUntil]);

  const authenticate = useCallback(async (): Promise<boolean> => {
    if (!LocalAuthentication) return false;
    setIsAuthenticating(true);
    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: t("settings.biometricPrompt"),
        disableDeviceFallback: true,
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
      await persistPasswordHash(hash);
      await AsyncStorage.setItem(STORAGE_KEY, "true");
      await clearPinLock();
      setHasFallbackPassword(true);
      setEnabled(true);
      setAwaitingPasswordSetup(false);
    },
    [clearPinLock, persistPasswordHash],
  );

  const verifyFallbackPassword = useCallback(
    async (password: string): Promise<"success" | "invalid" | "locked"> => {
      const now = Date.now();
      if (pinLockedUntil && pinLockedUntil > now) return "locked";

      const stored = await readPasswordHash();
      if (!stored) return "invalid";
      const hash = await hashPassword(password);
      if (hash === stored) {
        await clearPinLock();
        return "success";
      }

      let hitLockout = false;
      setFailedAttempts((prev) => {
        const next = prev + 1;
        if (next >= MAX_PIN_ATTEMPTS) {
          const until = Date.now() + PIN_LOCKOUT_MS;
          hitLockout = true;
          setPinLockedUntil(until);
          void AsyncStorage.multiSet([
            [PIN_ATTEMPTS_KEY, "0"],
            [PIN_LOCK_UNTIL_KEY, String(until)],
          ]);
          return 0;
        }
        void AsyncStorage.setItem(PIN_ATTEMPTS_KEY, String(next));
        return next;
      });

      return hitLockout ? "locked" : "invalid";
    },
    [clearPinLock, pinLockedUntil, readPasswordHash],
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
    void clearPasswordHash();
    void clearPinLock();
  }, [clearPasswordHash, clearPinLock]);

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
        pinLockedUntil,
        remainingPinAttempts:
          pinLockedUntil && pinLockedUntil > Date.now()
            ? 0
            : Math.max(0, MAX_PIN_ATTEMPTS - failedAttempts),
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
