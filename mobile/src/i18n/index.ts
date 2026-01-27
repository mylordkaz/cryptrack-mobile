import * as Localization from "expo-localization";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { I18n } from "i18n-js";
import { en } from "./locales/en";
import { fr } from "./locales/fr";
import { ja } from "./locales/ja";

const translations = {
  en,
  fr,
  ja,
};

export const SUPPORTED_LOCALES = ["en", "fr", "ja"] as const;
export type Locale = (typeof SUPPORTED_LOCALES)[number];
const DEFAULT_LOCALE: Locale = "en";
const LANGUAGE_STORAGE_KEY = "app-language";

const i18n = new I18n(translations);
i18n.enableFallback = true;
i18n.defaultLocale = "en";
i18n.locale = DEFAULT_LOCALE;

export function t(key: string, options?: Record<string, unknown>) {
  return i18n.t(key, options);
}

export function normalizeLocale(locale?: string | null): Locale {
  if (!locale) return DEFAULT_LOCALE;
  const normalized = locale.toLowerCase().replace("_", "-");
  const base = normalized.split("-")[0];
  if (SUPPORTED_LOCALES.includes(base as Locale)) {
    return base as Locale;
  }
  if (SUPPORTED_LOCALES.includes(normalized as Locale)) {
    return normalized as Locale;
  }
  return DEFAULT_LOCALE;
}

export function getDeviceLocale(): Locale {
  const locale =
    Localization.getLocales()[0]?.languageCode ??
    Localization.getLocales()[0]?.languageTag ??
    null;
  return normalizeLocale(locale);
}

export async function initLocale(): Promise<Locale> {
  try {
    const saved = await AsyncStorage.getItem(LANGUAGE_STORAGE_KEY);
    const locale = saved ? normalizeLocale(saved) : getDeviceLocale();
    i18n.locale = locale;
    return locale;
  } catch {
    const locale = getDeviceLocale();
    i18n.locale = locale;
    return locale;
  }
}

export async function setLocale(
  locale: string,
  options?: { persist?: boolean },
) {
  const next = normalizeLocale(locale);
  i18n.locale = next;
  if (options?.persist !== false) {
    await AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, next);
  }
}

export function getLocale() {
  return normalizeLocale(i18n.locale);
}
