import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/useColorScheme";
import { useSettingsOptional } from "@/hooks/useSettings";

export function useTheme() {
  const deviceColorScheme = useColorScheme();
  const settingsContext = useSettingsOptional();
  
  const themeMode = settingsContext?.settings.themeMode ?? "system";
  
  let effectiveScheme: "light" | "dark";
  if (themeMode === "system") {
    effectiveScheme = deviceColorScheme ?? "light";
  } else {
    effectiveScheme = themeMode;
  }
  
  const isDark = effectiveScheme === "dark";
  const theme = Colors[effectiveScheme];

  return {
    theme,
    isDark,
  };
}
