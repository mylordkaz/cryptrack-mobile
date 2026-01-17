import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { darkTokens, lightTokens, ThemeTokens, lightShadow, darkShadow, Shadow } from "./tokens";
import { useColorScheme } from "react-native";

export type ThemeMode = "light" | "dark" | "system";

type ThemeContextValue = {
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
  theme: ThemeTokens;
  shadow: Shadow;
  isDark: boolean;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);
const STORAGE_KEY = "theme-mode";

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const system = useColorScheme();
  const [mode, setModeState] = useState<ThemeMode>("system");

  useEffect(() => {
    let mounted = true;
    (async () => {
      const saved = await AsyncStorage.getItem(STORAGE_KEY);
      if (
        mounted &&
        (saved === "light" || saved === "dark" || saved === "system")
      ) {
        setModeState(saved);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const setMode = (next: ThemeMode) => {
    setModeState(next);
    AsyncStorage.setItem(STORAGE_KEY, next).catch(() => {});
  };

  const effective =
    mode === "system" ? (system === "dark" ? "dark" : "light") : mode;

  const isDark = effective === "dark";
  const theme = useMemo(() => (isDark ? darkTokens : lightTokens), [isDark]);
  const shadow = useMemo(() => (isDark ? darkShadow : lightShadow), [isDark]);
  const value = useMemo(
    () => ({ mode, setMode, theme, shadow, isDark }),
    [mode, theme, shadow, isDark]
  );
  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}
