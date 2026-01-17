import { Platform } from "react-native";

// ============================================
// COLOR TOKENS
// ============================================

export const lightTokens = {
  // Backgrounds
  bg: "#FFFFFF",
  surface: "#F0F6FF",
  surfaceSecondary: "#E8F1FF",

  // Text
  text: "#0B0F14",
  textSecondary: "#6B7280",
  muted: "#6B7280", // Alias for backward compatibility

  // Actions
  accent: "#4A87F7",
  accentSecondary: "#000000",

  // Borders
  border: "#D1E3FF",

  // Semantic
  gain: "#10B981",
  loss: "#EF4444",
};

export const darkTokens = {
  // Backgrounds
  bg: "#0B0F14",
  surface: "#151A21",
  surfaceSecondary: "#1F252E",

  // Text
  text: "#FFFFFF",
  textSecondary: "#9CA3AF",
  muted: "#9CA3AF", // Alias for backward compatibility

  // Actions
  accent: "#75F7F3",
  accentSecondary: "#D1D5DB",

  // Borders
  border: "#2D3748",

  // Semantic
  gain: "#10B981",
  loss: "#EF4444",
};

export type ThemeTokens = typeof lightTokens;

// ============================================
// SPACING SCALE
// ============================================

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

export type Spacing = typeof spacing;

// ============================================
// TYPOGRAPHY SCALE
// ============================================

export const fontSize = {
  xs: 11,
  sm: 13,
  md: 15,
  lg: 17,
  xl: 20,
  xxl: 28,
  hero: 34,
} as const;

export const fontWeight = {
  regular: "400" as const,
  medium: "500" as const,
  semibold: "600" as const,
  bold: "700" as const,
};

export type FontSize = typeof fontSize;
export type FontWeight = typeof fontWeight;

// ============================================
// BORDER RADIUS
// ============================================

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 9999,
} as const;

export type Radius = typeof radius;

// ============================================
// SHADOWS
// ============================================

export const lightShadow = Platform.select({
  ios: {
    shadowColor: "#4A87F7",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
  },
  android: {
    elevation: 3,
  },
  default: {},
});

export const darkShadow = Platform.select({
  ios: {
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  android: {
    elevation: 4,
  },
  default: {},
});

export type Shadow = typeof lightShadow;
