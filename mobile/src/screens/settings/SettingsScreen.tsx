import { View, StyleSheet, TouchableOpacity, Switch, ScrollView } from "react-native";
import { useTheme, spacing, radius } from "@/src/theme";
import { useLocale } from "@/src/i18n/LocaleProvider";
import type { Locale } from "@/src/i18n";
import { Body, Caption } from "@/components/ui";
import {
  ChevronRight,
  Moon,
  Sun,
  Monitor,
  Globe,
  DollarSign,
  Fingerprint,
  Info,
  MessageSquare,
  FileText,
  Shield,
} from "lucide-react-native";
import { useState, useMemo, useCallback } from "react";
import { useCurrency, SUPPORTED_CURRENCIES } from "@/src/currency";
import type { Currency } from "@/src/currency";
import { DocumentBottomSheet } from "@/components/DocumentBottomSheet";
import { SettingsSection } from "@/src/screens/settings/SettingsSection";
import { SelectionSheet } from "@/src/screens/settings/SelectionSheet";

const APP_VERSION = "1.0.0";

export default function SettingsScreen() {
  const { theme, mode, setMode, isDark } = useTheme();
  const { t, locale, setLocale } = useLocale();
  const { currency: selectedCurrency, setCurrency } = useCurrency();
  const [faceIdEnabled, setFaceIdEnabled] = useState(false);
  const [showLanguageModal, setShowLanguageModal] = useState(false);
  const [showCurrencyModal, setShowCurrencyModal] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);

  type Language = Locale;

  const languages = useMemo(
    () =>
      [
        { code: "en", label: t("settings.english") },
        { code: "ja", label: t("settings.japanese") },
        { code: "fr", label: t("settings.french") },
      ] as { code: Language; label: string }[],
    [t],
  );

  const currencies = useMemo(
    () =>
      SUPPORTED_CURRENCIES.map((code) => ({
        code,
        label:
          code === "USD"
            ? t("settings.usd")
            : code === "EUR"
              ? t("settings.eur")
              : t("settings.jpy"),
      })),
    [t],
  );

  const getLanguageLabel = (code: Language) => {
    return (
      languages.find((lang) => lang.code === code)?.label ||
      t("settings.english")
    );
  };

  const getCurrencyLabel = (code: Currency) => {
    return (
      currencies.find((curr) => curr.code === code)?.label || t("settings.usd")
    );
  };

  const handleLanguageChange = useCallback(
    async (lang: Language) => {
      await setLocale(lang);
      setShowLanguageModal(false);
    },
    [setLocale],
  );

  const handleCurrencyChange = useCallback(
    async (currency: Currency) => {
      await setCurrency(currency);
      setShowCurrencyModal(false);
    },
    [setCurrency],
  );

  return (
    <>
      <ScrollView style={[styles.container, { backgroundColor: theme.bg }]}>
        <SettingsSection title={t("settings.appearance")} theme={theme}>
          <View style={styles.row}>
            <View style={styles.iconContainer}>
              {isDark ? (
                <Moon size={20} color={theme.accent} />
              ) : (
                <Sun size={20} color={theme.accent} />
              )}
            </View>
            <View style={styles.textContainer}>
              <Body style={{ color: theme.text }}>{t("settings.theme")}</Body>
              <Caption style={{ color: theme.textSecondary }}>
                {mode === "system"
                  ? t("settings.system")
                  : mode === "dark"
                    ? t("settings.dark")
                    : t("settings.light")}
              </Caption>
            </View>
          </View>

          <View style={styles.themeOptions}>
            <TouchableOpacity
              style={[
                styles.themeButton,
                {
                  backgroundColor:
                    mode === "light" ? theme.accent + "20" : theme.bg,
                  borderColor: mode === "light" ? theme.accent : theme.border,
                },
              ]}
              onPress={() => setMode("light")}
            >
              <Sun
                size={18}
                color={mode === "light" ? theme.accent : theme.textSecondary}
              />
              <Caption
                style={{
                  color: mode === "light" ? theme.accent : theme.textSecondary,
                  marginTop: 4,
                }}
              >
                {t("settings.light")}
              </Caption>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.themeButton,
                {
                  backgroundColor:
                    mode === "dark" ? theme.accent + "20" : theme.bg,
                  borderColor: mode === "dark" ? theme.accent : theme.border,
                },
              ]}
              onPress={() => setMode("dark")}
            >
              <Moon
                size={18}
                color={mode === "dark" ? theme.accent : theme.textSecondary}
              />
              <Caption
                style={{
                  color: mode === "dark" ? theme.accent : theme.textSecondary,
                  marginTop: 4,
                }}
              >
                {t("settings.dark")}
              </Caption>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.themeButton,
                {
                  backgroundColor:
                    mode === "system" ? theme.accent + "20" : theme.bg,
                  borderColor: mode === "system" ? theme.accent : theme.border,
                },
              ]}
              onPress={() => setMode("system")}
            >
              <Monitor
                size={18}
                color={mode === "system" ? theme.accent : theme.textSecondary}
              />
              <Caption
                style={{
                  color:
                    mode === "system" ? theme.accent : theme.textSecondary,
                  marginTop: 4,
                }}
              >
                {t("settings.system")}
              </Caption>
            </TouchableOpacity>
          </View>
        </SettingsSection>

        <SettingsSection title={t("settings.preferences")} theme={theme}>
          <TouchableOpacity
            style={[styles.settingItem, { borderBottomColor: theme.border }]}
            onPress={() => setShowLanguageModal(true)}
          >
            <View style={styles.iconContainer}>
              <Globe size={20} color={theme.accent} />
            </View>
            <View style={styles.textContainer}>
              <Body style={{ color: theme.text }}>{t("settings.language")}</Body>
              <Caption style={{ color: theme.textSecondary }}>
                {getLanguageLabel(locale)}
              </Caption>
            </View>
            <ChevronRight size={20} color={theme.textSecondary} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.settingItem}
            onPress={() => setShowCurrencyModal(true)}
          >
            <View style={styles.iconContainer}>
              <DollarSign size={20} color={theme.accent} />
            </View>
            <View style={styles.textContainer}>
              <Body style={{ color: theme.text }}>{t("settings.currency")}</Body>
              <Caption style={{ color: theme.textSecondary }}>
                {getCurrencyLabel(selectedCurrency)}
              </Caption>
            </View>
            <ChevronRight size={20} color={theme.textSecondary} />
          </TouchableOpacity>
        </SettingsSection>

        <SettingsSection title={t("settings.security")} theme={theme}>
          <View style={styles.settingItem}>
            <View style={styles.iconContainer}>
              <Fingerprint size={20} color={theme.accent} />
            </View>
            <View style={styles.textContainer}>
              <Body style={{ color: theme.text }}>{t("settings.faceId")}</Body>
              <Caption style={{ color: theme.textSecondary }}>
                {t("settings.faceIdDescription")}
              </Caption>
            </View>
            <Switch
              value={faceIdEnabled}
              onValueChange={setFaceIdEnabled}
              trackColor={{ false: theme.border, true: theme.accent + "40" }}
              thumbColor={faceIdEnabled ? theme.accent : theme.textSecondary}
            />
          </View>
        </SettingsSection>

        <SettingsSection title={t("settings.about")} theme={theme}>
          <View style={[styles.settingItem, { borderBottomColor: theme.border }]}>
            <View style={styles.iconContainer}>
              <Info size={20} color={theme.accent} />
            </View>
            <View style={styles.textContainer}>
              <Body style={{ color: theme.text }}>{t("settings.version")}</Body>
              <Caption style={{ color: theme.textSecondary }}>
                {APP_VERSION}
              </Caption>
            </View>
          </View>

          <TouchableOpacity
            style={[styles.settingItem, { borderBottomColor: theme.border }]}
          >
            <View style={styles.iconContainer}>
              <MessageSquare size={20} color={theme.accent} />
            </View>
            <View style={styles.textContainer}>
              <Body style={{ color: theme.text }}>{t("settings.feedback")}</Body>
            </View>
            <ChevronRight size={20} color={theme.textSecondary} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.settingItem, { borderBottomColor: theme.border }]}
            onPress={() => setShowTermsModal(true)}
          >
            <View style={styles.iconContainer}>
              <FileText size={20} color={theme.accent} />
            </View>
            <View style={styles.textContainer}>
              <Body style={{ color: theme.text }}>{t("settings.termsOfUse")}</Body>
            </View>
            <ChevronRight size={20} color={theme.textSecondary} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.settingItem}
            onPress={() => setShowPrivacyModal(true)}
          >
            <View style={styles.iconContainer}>
              <Shield size={20} color={theme.accent} />
            </View>
            <View style={styles.textContainer}>
              <Body style={{ color: theme.text }}>
                {t("settings.privacyPolicy")}
              </Body>
            </View>
            <ChevronRight size={20} color={theme.textSecondary} />
          </TouchableOpacity>
        </SettingsSection>

        <View style={styles.footer} />
      </ScrollView>

      <SelectionSheet
        visible={showLanguageModal}
        title={t("settings.selectLanguage")}
        items={languages}
        selectedCode={locale}
        theme={theme}
        onClose={() => setShowLanguageModal(false)}
        onSelect={(code) => handleLanguageChange(code as Language)}
      />

      <SelectionSheet
        visible={showCurrencyModal}
        title={t("settings.selectCurrency")}
        items={currencies}
        selectedCode={selectedCurrency}
        theme={theme}
        onClose={() => setShowCurrencyModal(false)}
        onSelect={(code) => handleCurrencyChange(code as Currency)}
      />

      <DocumentBottomSheet
        visible={showTermsModal}
        titleKey="settings.termsOfUse"
        contentKey="legal.termsOfUse"
        theme={theme}
        onClose={() => setShowTermsModal(false)}
      />

      <DocumentBottomSheet
        visible={showPrivacyModal}
        titleKey="settings.privacyPolicy"
        contentKey="legal.privacyPolicy"
        theme={theme}
        onClose={() => setShowPrivacyModal(false)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    padding: spacing.lg,
  },
  settingItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: spacing.lg,
    borderBottomWidth: 1,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
    marginRight: spacing.md,
  },
  textContainer: {
    flex: 1,
  },
  themeOptions: {
    flexDirection: "row",
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
  },
  themeButton: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
  },
  footer: {
    height: spacing.xxl,
  },
});
