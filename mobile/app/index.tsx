import { View, StyleSheet } from "react-native";
import { useTheme, spacing, radius } from "@/src/theme";
import { useRouter } from "expo-router";
import { Button, Headline, Body } from "@/components/ui";
import { t } from "@/src/i18n";
import { Image } from "expo-image";
import { TrendingUp } from "lucide-react-native";

export default function LandingScreen() {
  const { theme, isDark } = useTheme();
  const router = useRouter();

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      <View style={styles.content}>
        {/* Logo/Icon */}
        <View style={styles.logoContainer}>
          <Image
            source={
              isDark
                ? require("@/assets/images/logo-dark.png")
                : require("@/assets/images/logo-light.png")
            }
            style={styles.logo}
            contentFit="contain"
            cachePolicy="memory-disk"
          />
        </View>

        {/* App Name */}
        <Headline style={styles.appName}>{t("landing.appName")}</Headline>

        {/* Tagline */}
        <Body style={[styles.tagline, { color: theme.textSecondary }]}>
          {t("landing.tagline")}
        </Body>

        {/* Feature Icons */}
        <View style={styles.featuresContainer}>
          <View
            style={[
              styles.featureBox,
              { backgroundColor: theme.accent + "15", borderColor: theme.accent + "30" },
            ]}
          >
            <TrendingUp size={32} color={theme.accent} />
            <Body style={[styles.featureText, { color: theme.textSecondary }]}>
              {t("landing.trackPerformance")}
            </Body>
          </View>
        </View>

        {/* Get Started Button */}
        <Button
          title={t("landing.getStarted")}
          onPress={() => router.replace("/portfolio")}
          style={styles.button}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: spacing.xl,
  },
  logoContainer: {
    marginBottom: spacing.xl,
  },
  logo: {
    width: 120,
    height: 120,
  },
  appName: {
    fontSize: 32,
    fontWeight: "700",
    marginBottom: spacing.md,
    textAlign: "center",
  },
  tagline: {
    fontSize: 16,
    textAlign: "center",
    marginBottom: spacing.xxl,
  },
  featuresContainer: {
    width: "100%",
    maxWidth: 300,
    marginTop: spacing.lg,
  },
  featureBox: {
    flexDirection: "row",
    alignItems: "center",
    padding: spacing.lg,
    borderRadius: radius.md,
    borderWidth: 1,
    gap: spacing.md,
  },
  featureText: {
    flex: 1,
    fontSize: 15,
  },
  button: {
    alignSelf: "center",
    marginTop: spacing.xxl * 2,
    minWidth: 200,
    paddingHorizontal: spacing.xl,
  },
});
