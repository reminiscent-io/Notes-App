import React from "react";
import { View, StyleSheet } from "react-native";
import { Feather } from "@expo/vector-icons";

import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing } from "@/constants/theme";

interface SectionHeaderProps {
  title: string;
  icon: keyof typeof Feather.glyphMap;
}

export function SectionHeader({ title, icon }: SectionHeaderProps) {
  const { theme } = useTheme();

  return (
    <View style={styles.container}>
      <Feather name={icon} size={16} color={theme.textSecondary} />
      <ThemedText
        type="label"
        style={[styles.title, { color: theme.textSecondary }]}
      >
        {title}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: Spacing.sm,
    gap: Spacing.xs,
  },
  title: {
    letterSpacing: 1,
  },
});
