import { View, StyleSheet } from "react-native";
import { useTheme, spacing } from "@/src/theme";
import { t } from "@/src/i18n";
import { Body } from "@/components/ui";

export default function SettingsScreen() {
  const { theme } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      <Body>{t("settings.title")}</Body>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: spacing.lg,
  },
});
