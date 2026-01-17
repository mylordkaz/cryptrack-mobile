import { View, ViewStyle, StyleSheet } from "react-native";
import { useTheme, spacing, radius } from "@/src/theme";
import { ReactNode } from "react";

interface CardProps {
  children: ReactNode;
  variant?: "default" | "secondary";
  padding?: "none" | "sm" | "md" | "lg";
  style?: ViewStyle;
}

export function Card({
  children,
  variant = "default",
  padding = "lg",
  style,
}: CardProps) {
  const { theme, shadow } = useTheme();

  const paddingValue = {
    none: 0,
    sm: spacing.sm,
    md: spacing.md,
    lg: spacing.lg,
  }[padding];

  const backgroundColor =
    variant === "default" ? theme.surface : theme.surfaceSecondary;

  return (
    <View
      style={[
        styles.card,
        shadow,
        {
          backgroundColor,
          padding: paddingValue,
          borderColor: theme.border,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.md,
    borderWidth: 1,
  },
});
