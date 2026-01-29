import { ReactNode } from "react";
import { View, StyleSheet } from "react-native";
import { Caption } from "@/components/ui";
import { spacing, radius, ThemeTokens } from "@/src/theme";

type SettingsSectionProps = {
  title: string;
  theme: ThemeTokens;
  children: ReactNode;
};

export function SettingsSection({ title, theme, children }: SettingsSectionProps) {
  return (
    <View style={styles.section}>
      <Caption style={[styles.sectionTitle, { color: theme.textSecondary }]}>
        {title}
      </Caption>
      <View style={[styles.card, { backgroundColor: theme.cardBg }]}>
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
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
});
