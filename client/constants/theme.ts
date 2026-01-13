import { Platform } from "react-native";

export const Colors = {
  light: {
    text: "#1A202C",
    textSecondary: "#718096",
    textTertiary: "#CBD5E0",
    buttonText: "#FFFFFF",
    tabIconDefault: "#718096",
    tabIconSelected: "#2D3748",
    link: "#2D3748",
    backgroundRoot: "#FFFFFF",
    backgroundDefault: "#F7FAFC",
    backgroundSecondary: "#EDF2F7",
    backgroundTertiary: "#E2E8F0",
    primary: "#2D3748",
    accent: "#F59E0B",
    error: "#EF4444",
    success: "#10B981",
    overlay: "rgba(0,0,0,0.6)",
  },
  dark: {
    text: "#F7FAFC",
    textSecondary: "#A0AEC0",
    textTertiary: "#718096",
    buttonText: "#FFFFFF",
    tabIconDefault: "#718096",
    tabIconSelected: "#F59E0B",
    link: "#F59E0B",
    backgroundRoot: "#1A202C",
    backgroundDefault: "#2D3748",
    backgroundSecondary: "#4A5568",
    backgroundTertiary: "#718096",
    primary: "#F7FAFC",
    accent: "#F59E0B",
    error: "#EF4444",
    success: "#10B981",
    overlay: "rgba(0,0,0,0.75)",
  },
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  "2xl": 48,
  inputHeight: 48,
  buttonHeight: 52,
  micButtonSize: 80,
  micButtonLarge: 120,
};

export const BorderRadius = {
  xs: 8,
  sm: 12,
  md: 16,
  lg: 24,
  xl: 40,
  full: 9999,
};

export const Typography = {
  display: {
    fontSize: 48,
    fontWeight: "700" as const,
  },
  title1: {
    fontSize: 28,
    fontWeight: "700" as const,
  },
  title3: {
    fontSize: 20,
    fontWeight: "600" as const,
  },
  body: {
    fontSize: 16,
    fontWeight: "400" as const,
  },
  caption: {
    fontSize: 14,
    fontWeight: "400" as const,
  },
  label: {
    fontSize: 12,
    fontWeight: "500" as const,
  },
};

export const Shadows = {
  micButton: Platform.select({
    ios: {
      shadowColor: "#000000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 2,
    },
    android: {
      elevation: 4,
    },
    default: {},
  }),
};

export const Fonts = Platform.select({
  ios: {
    sans: "system-ui",
    serif: "ui-serif",
    rounded: "ui-rounded",
    mono: "ui-monospace",
  },
  default: {
    sans: "normal",
    serif: "serif",
    rounded: "normal",
    mono: "monospace",
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded:
      "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});
