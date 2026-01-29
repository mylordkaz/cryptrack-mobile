import {
  View,
  StyleSheet,
  TouchableOpacity,
  Switch,
  ScrollView,
  Modal,
  Pressable,
  Dimensions,
} from "react-native";
import { useTheme, spacing, radius } from "@/src/theme";
import { useLocale } from "@/src/i18n/LocaleProvider";
import type { Locale } from "@/src/i18n";
import { Body, Caption, Headline } from "@/components/ui";
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
  Check,
} from "lucide-react-native";
import { useState, useEffect, useCallback } from "react";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  interpolate,
  Extrapolation,
} from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";
import { useCurrency, SUPPORTED_CURRENCIES } from "@/src/currency";
import type { Currency } from "@/src/currency";
import { DocumentBottomSheet } from "@/components/DocumentBottomSheet";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

type Language = Locale;
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

  const translateYLanguage = useSharedValue(0);
  const translateYCurrency = useSharedValue(0);
  const isDismissingLanguage = useSharedValue(false);
  const isDismissingCurrency = useSharedValue(false);
  const { height: SCREEN_HEIGHT } = Dimensions.get("window");
  const DISMISS_THRESHOLD = 100;

  const languages: { code: Language; label: string }[] = [
    { code: "en", label: t("settings.english") },
    { code: "ja", label: t("settings.japanese") },
    { code: "fr", label: t("settings.french") },
  ];

  const currencies: { code: Currency; label: string }[] =
    SUPPORTED_CURRENCIES.map((code) => ({
      code,
      label:
        code === "USD"
          ? t("settings.usd")
          : code === "EUR"
            ? t("settings.eur")
            : t("settings.jpy"),
    }));

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


  useEffect(() => {
    if (showLanguageModal) {
      translateYLanguage.value = 0;
      isDismissingLanguage.value = false;
    }
  }, [showLanguageModal, translateYLanguage, isDismissingLanguage]);

  useEffect(() => {
    if (showCurrencyModal) {
      translateYCurrency.value = 0;
      isDismissingCurrency.value = false;
    }
  }, [showCurrencyModal, translateYCurrency, isDismissingCurrency]);

  const closeLanguageModal = useCallback(() => {
    isDismissingLanguage.value = true;
    translateYLanguage.value = SCREEN_HEIGHT;
    setShowLanguageModal(false);
  }, [SCREEN_HEIGHT, isDismissingLanguage, translateYLanguage]);

  const closeCurrencyModal = useCallback(() => {
    isDismissingCurrency.value = true;
    translateYCurrency.value = SCREEN_HEIGHT;
    setShowCurrencyModal(false);
  }, [SCREEN_HEIGHT, isDismissingCurrency, translateYCurrency]);

  const handleLanguageChange = useCallback(
    async (lang: Language) => {
      await setLocale(lang);
      closeLanguageModal();
    },
    [closeLanguageModal],
  );

  const handleCurrencyChange = useCallback(
    async (currency: Currency) => {
      await setCurrency(currency);
      closeCurrencyModal();
    },
    [closeCurrencyModal, setCurrency],
  );

  const panGestureLanguage = Gesture.Pan()
    .onUpdate((event) => {
      if (event.translationY > 0) {
        translateYLanguage.value = event.translationY;
      }
    })
    .onEnd((event) => {
      if (event.translationY > DISMISS_THRESHOLD) {
        isDismissingLanguage.value = true;
        translateYLanguage.value = SCREEN_HEIGHT;
        scheduleOnRN(() => setShowLanguageModal(false));
      } else {
        translateYLanguage.value = withSpring(0, {
          damping: 15,
          stiffness: 200,
        });
      }
    });

  const panGestureCurrency = Gesture.Pan()
    .onUpdate((event) => {
      if (event.translationY > 0) {
        translateYCurrency.value = event.translationY;
      }
    })
    .onEnd((event) => {
      if (event.translationY > DISMISS_THRESHOLD) {
        isDismissingCurrency.value = true;
        translateYCurrency.value = SCREEN_HEIGHT;
        scheduleOnRN(() => setShowCurrencyModal(false));
      } else {
        translateYCurrency.value = withSpring(0, {
          damping: 15,
          stiffness: 200,
        });
      }
    });

  const animatedStyleLanguage = useAnimatedStyle(() => ({
    transform: [{ translateY: translateYLanguage.value }],
  }));

  const backdropStyleLanguage = useAnimatedStyle(() => ({
    opacity: interpolate(
      translateYLanguage.value,
      [0, SCREEN_HEIGHT],
      [1, 0],
      Extrapolation.CLAMP,
    ),
  }));

  const animatedStyleCurrency = useAnimatedStyle(() => ({
    transform: [{ translateY: translateYCurrency.value }],
  }));

  const backdropStyleCurrency = useAnimatedStyle(() => ({
    opacity: interpolate(
      translateYCurrency.value,
      [0, SCREEN_HEIGHT],
      [1, 0],
      Extrapolation.CLAMP,
    ),
  }));

  return (
    <>
      <ScrollView style={[styles.container, { backgroundColor: theme.bg }]}>
        {/* Appearance Section */}
        <View style={styles.section}>
          <Caption
            style={[styles.sectionTitle, { color: theme.textSecondary }]}
          >
            {t("settings.appearance")}
          </Caption>

          {/* Theme Mode */}
          <View style={[styles.card, { backgroundColor: theme.cardBg }]}>
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

            {/* Theme Options */}
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
                    color:
                      mode === "light" ? theme.accent : theme.textSecondary,
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
                    borderColor:
                      mode === "system" ? theme.accent : theme.border,
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
          </View>
        </View>

        {/* Preferences Section */}
        <View style={styles.section}>
          <Caption
            style={[styles.sectionTitle, { color: theme.textSecondary }]}
          >
            {t("settings.preferences")}
          </Caption>

          <View style={[styles.card, { backgroundColor: theme.cardBg }]}>
            {/* Language */}
            <TouchableOpacity
              style={[styles.settingItem, { borderBottomColor: theme.border }]}
              onPress={() => setShowLanguageModal(true)}
            >
              <View style={styles.iconContainer}>
                <Globe size={20} color={theme.accent} />
              </View>
              <View style={styles.textContainer}>
                <Body style={{ color: theme.text }}>
                  {t("settings.language")}
                </Body>
                <Caption style={{ color: theme.textSecondary }}>
                  {getLanguageLabel(locale)}
                </Caption>
              </View>
              <ChevronRight size={20} color={theme.textSecondary} />
            </TouchableOpacity>

            {/* Currency */}
            <TouchableOpacity
              style={styles.settingItem}
              onPress={() => setShowCurrencyModal(true)}
            >
              <View style={styles.iconContainer}>
                <DollarSign size={20} color={theme.accent} />
              </View>
              <View style={styles.textContainer}>
                <Body style={{ color: theme.text }}>
                  {t("settings.currency")}
                </Body>
                <Caption style={{ color: theme.textSecondary }}>
                  {getCurrencyLabel(selectedCurrency)}
                </Caption>
              </View>
              <ChevronRight size={20} color={theme.textSecondary} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Security Section */}
        <View style={styles.section}>
          <Caption
            style={[styles.sectionTitle, { color: theme.textSecondary }]}
          >
            {t("settings.security")}
          </Caption>

          <View style={[styles.card, { backgroundColor: theme.cardBg }]}>
            {/* Face ID */}
            <View style={styles.settingItem}>
              <View style={styles.iconContainer}>
                <Fingerprint size={20} color={theme.accent} />
              </View>
              <View style={styles.textContainer}>
                <Body style={{ color: theme.text }}>
                  {t("settings.faceId")}
                </Body>
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
          </View>
        </View>

        {/* About Section */}
        <View style={styles.section}>
          <Caption
            style={[styles.sectionTitle, { color: theme.textSecondary }]}
          >
            {t("settings.about")}
          </Caption>

          <View style={[styles.card, { backgroundColor: theme.cardBg }]}>
            {/* Version */}
            <View
              style={[styles.settingItem, { borderBottomColor: theme.border }]}
            >
              <View style={styles.iconContainer}>
                <Info size={20} color={theme.accent} />
              </View>
              <View style={styles.textContainer}>
                <Body style={{ color: theme.text }}>
                  {t("settings.version")}
                </Body>
                <Caption style={{ color: theme.textSecondary }}>
                  {APP_VERSION}
                </Caption>
              </View>
            </View>

            {/* Feedback */}
            <TouchableOpacity
              style={[styles.settingItem, { borderBottomColor: theme.border }]}
            >
              <View style={styles.iconContainer}>
                <MessageSquare size={20} color={theme.accent} />
              </View>
              <View style={styles.textContainer}>
                <Body style={{ color: theme.text }}>
                  {t("settings.feedback")}
                </Body>
              </View>
              <ChevronRight size={20} color={theme.textSecondary} />
            </TouchableOpacity>

            {/* Terms of Use */}
            <TouchableOpacity
              style={[styles.settingItem, { borderBottomColor: theme.border }]}
              onPress={() => setShowTermsModal(true)}
            >
              <View style={styles.iconContainer}>
                <FileText size={20} color={theme.accent} />
              </View>
              <View style={styles.textContainer}>
                <Body style={{ color: theme.text }}>
                  {t("settings.termsOfUse")}
                </Body>
              </View>
              <ChevronRight size={20} color={theme.textSecondary} />
            </TouchableOpacity>

            {/* Privacy Policy */}
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
          </View>
        </View>

        <View style={styles.footer} />
      </ScrollView>

      {/* Language Selection Modal */}
      <Modal
        visible={showLanguageModal}
        transparent
        animationType="none"
        onRequestClose={closeLanguageModal}
      >
        <View style={styles.modalContainer}>
          <AnimatedPressable
            onPress={closeLanguageModal}
            style={[styles.backdrop, backdropStyleLanguage]}
          />
          <GestureDetector gesture={panGestureLanguage}>
            <Animated.View
              style={[
                styles.sheetContainer,
                { backgroundColor: theme.bg },
                animatedStyleLanguage,
              ]}
            >
              <View
                style={[styles.dragHandle, { backgroundColor: theme.muted }]}
              />

              <View style={styles.modalHeader}>
                <Headline style={{ color: theme.text }}>
                  {t("settings.selectLanguage")}
                </Headline>
              </View>

              <View style={styles.modalList}>
                {languages.map((language, index) => (
                  <TouchableOpacity
                    key={language.code}
                    style={[
                      styles.languageOption,
                      index < languages.length - 1 && {
                        borderBottomColor: theme.border,
                        borderBottomWidth: 1,
                      },
                    ]}
                    onPress={() => handleLanguageChange(language.code)}
                  >
                    <Body style={{ color: theme.text, flex: 1 }}>
                      {language.label}
                    </Body>
                    {locale === language.code && (
                      <Check size={20} color={theme.accent} />
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            </Animated.View>
          </GestureDetector>
        </View>
      </Modal>

      {/* Currency Selection Modal */}
      <Modal
        visible={showCurrencyModal}
        transparent
        animationType="none"
        onRequestClose={closeCurrencyModal}
      >
        <View style={styles.modalContainer}>
          <AnimatedPressable
            onPress={closeCurrencyModal}
            style={[styles.backdrop, backdropStyleCurrency]}
          />
          <GestureDetector gesture={panGestureCurrency}>
            <Animated.View
              style={[
                styles.sheetContainer,
                { backgroundColor: theme.bg },
                animatedStyleCurrency,
              ]}
            >
              <View
                style={[styles.dragHandle, { backgroundColor: theme.muted }]}
              />

              <View style={styles.modalHeader}>
                <Headline style={{ color: theme.text }}>
                  {t("settings.selectCurrency")}
                </Headline>
              </View>

              <View style={styles.modalList}>
                {currencies.map((currency, index) => (
                  <TouchableOpacity
                    key={currency.code}
                    style={[
                      styles.languageOption,
                      index < currencies.length - 1 && {
                        borderBottomColor: theme.border,
                        borderBottomWidth: 1,
                      },
                    ]}
                    onPress={() => handleCurrencyChange(currency.code)}
                  >
                    <Body style={{ color: theme.text, flex: 1 }}>
                      {currency.label}
                    </Body>
                    {selectedCurrency === currency.code && (
                      <Check size={20} color={theme.accent} />
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            </Animated.View>
          </GestureDetector>
        </View>
      </Modal>

      {/* Terms of Use Modal */}
      <DocumentBottomSheet
        visible={showTermsModal}
        titleKey="settings.termsOfUse"
        contentKey="legal.termsOfUse"
        theme={theme}
        onClose={() => setShowTermsModal(false)}
      />

      {/* Privacy Policy Modal */}
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
  section: {
    marginTop: spacing.lg,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "600",
    textTransform: "uppercase",
    marginBottom: spacing.sm,
    marginLeft: spacing.lg,
  },
  card: {
    marginHorizontal: spacing.lg,
    borderRadius: radius.lg,
    overflow: "hidden",
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
  modalContainer: {
    flex: 1,
    justifyContent: "flex-end",
  },
  backdrop: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  sheetContainer: {
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.xxl,
  },
  dragHandle: {
    width: 40,
    height: 4,
    borderRadius: radius.sm,
    alignSelf: "center",
    marginBottom: spacing.lg,
  },
  modalHeader: {
    marginBottom: spacing.md,
  },
  modalList: {
    gap: spacing.xs,
  },
  languageOption: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: spacing.lg,
  },
});
