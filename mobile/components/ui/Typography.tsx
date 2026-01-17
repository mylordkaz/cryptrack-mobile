import { Text, TextStyle, StyleSheet } from "react-native";
import { useTheme, fontSize, fontWeight } from "@/src/theme";
import { ReactNode } from "react";

interface TypographyProps {
  children: ReactNode;
  color?: "primary" | "secondary" | "accent" | "gain" | "loss";
  style?: TextStyle;
}

function useTextColor(color: TypographyProps["color"]) {
  const { theme } = useTheme();
  switch (color) {
    case "secondary":
      return theme.textSecondary;
    case "accent":
      return theme.accent;
    case "gain":
      return theme.gain;
    case "loss":
      return theme.loss;
    case "primary":
    default:
      return theme.text;
  }
}

export function HeroText({ children, color = "primary", style }: TypographyProps) {
  const textColor = useTextColor(color);
  return (
    <Text style={[styles.hero, { color: textColor }, style]}>
      {children}
    </Text>
  );
}

export function Title({ children, color = "primary", style }: TypographyProps) {
  const textColor = useTextColor(color);
  return (
    <Text style={[styles.title, { color: textColor }, style]}>
      {children}
    </Text>
  );
}

export function Headline({ children, color = "primary", style }: TypographyProps) {
  const textColor = useTextColor(color);
  return (
    <Text style={[styles.headline, { color: textColor }, style]}>
      {children}
    </Text>
  );
}

export function Body({ children, color = "primary", style }: TypographyProps) {
  const textColor = useTextColor(color);
  return (
    <Text style={[styles.body, { color: textColor }, style]}>
      {children}
    </Text>
  );
}

export function BodyMedium({ children, color = "primary", style }: TypographyProps) {
  const textColor = useTextColor(color);
  return (
    <Text style={[styles.bodyMedium, { color: textColor }, style]}>
      {children}
    </Text>
  );
}

export function Caption({ children, color = "secondary", style }: TypographyProps) {
  const textColor = useTextColor(color);
  return (
    <Text style={[styles.caption, { color: textColor }, style]}>
      {children}
    </Text>
  );
}

export function Label({ children, color = "secondary", style }: TypographyProps) {
  const textColor = useTextColor(color);
  return (
    <Text style={[styles.label, { color: textColor }, style]}>
      {children}
    </Text>
  );
}

const styles = StyleSheet.create({
  hero: {
    fontSize: fontSize.hero,
    fontWeight: fontWeight.bold,
  },
  title: {
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.bold,
  },
  headline: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.semibold,
  },
  body: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.regular,
  },
  bodyMedium: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.medium,
  },
  caption: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.regular,
  },
  label: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.medium,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
});
