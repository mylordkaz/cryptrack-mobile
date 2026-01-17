import {
  Pressable,
  Text,
  StyleSheet,
  ViewStyle,
  TextStyle,
  ActivityIndicator,
} from "react-native";
import { useTheme, spacing, radius, fontSize, fontWeight } from "@/src/theme";

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: "primary" | "secondary" | "text";
  size?: "sm" | "md" | "lg";
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
}

export function Button({
  title,
  onPress,
  variant = "primary",
  size = "md",
  disabled = false,
  loading = false,
  style,
}: ButtonProps) {
  const { theme, isDark } = useTheme();

  const sizeStyles: Record<string, { paddingVertical: number; paddingHorizontal: number; fontSize: number }> = {
    sm: {
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.md,
      fontSize: fontSize.sm,
    },
    md: {
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.lg,
      fontSize: fontSize.md,
    },
    lg: {
      paddingVertical: spacing.lg,
      paddingHorizontal: spacing.xl,
      fontSize: fontSize.lg,
    },
  };

  const getVariantStyles = (pressed: boolean): { container: ViewStyle; text: TextStyle } => {
    const pressedOpacity = pressed ? 0.8 : 1;

    switch (variant) {
      case "primary":
        return {
          container: {
            backgroundColor: theme.accent,
            opacity: disabled ? 0.5 : pressedOpacity,
          },
          text: {
            color: isDark ? theme.bg : "#FFFFFF",
          },
        };
      case "secondary":
        return {
          container: {
            backgroundColor: "transparent",
            borderWidth: 1.5,
            borderColor: theme.accentSecondary,
            opacity: disabled ? 0.5 : pressedOpacity,
          },
          text: {
            color: theme.accentSecondary,
          },
        };
      case "text":
        return {
          container: {
            backgroundColor: "transparent",
            opacity: disabled ? 0.5 : pressedOpacity,
          },
          text: {
            color: theme.accent,
          },
        };
    }
  };

  const currentSize = sizeStyles[size];

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.base,
        {
          paddingVertical: currentSize.paddingVertical,
          paddingHorizontal: currentSize.paddingHorizontal,
        },
        getVariantStyles(pressed).container,
        style,
      ]}
    >
      {({ pressed }) =>
        loading ? (
          <ActivityIndicator
            size="small"
            color={variant === "primary" ? (isDark ? theme.bg : "#FFFFFF") : theme.accent}
          />
        ) : (
          <Text
            style={[
              styles.text,
              { fontSize: currentSize.fontSize },
              getVariantStyles(pressed).text,
            ]}
          >
            {title}
          </Text>
        )
      }
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
  },
  text: {
    fontWeight: fontWeight.semibold,
  },
});
