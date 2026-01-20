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
  variant?: "primary" | "secondary" | "text" | "destructive";
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
            shadowColor: theme.accent,
            shadowOpacity: 0.4,
            shadowRadius: 8,
            shadowOffset: { width: 0, height: 0 },
            elevation: 6,
          },
          text: {
            color: isDark ? "#000000" : "#FFFFFF",
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
      case "destructive":
        return {
          container: {
            backgroundColor: "transparent",
            borderWidth: 1.5,
            borderColor: theme.loss,
            opacity: disabled ? 0.5 : pressedOpacity,
            shadowColor: theme.loss,
            shadowOpacity: 0.4,
            shadowRadius: 8,
            shadowOffset: { width: 0, height: 0 },
            elevation: 6,
          },
          text: {
            color: theme.loss,
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
            color={
              variant === "primary"
                ? (isDark ? "#000000" : "#FFFFFF")
                : variant === "destructive"
                ? theme.loss
                : theme.accent
            }
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
