import React from "react";
import { View, StyleSheet } from "react-native";
import { Feather } from "@expo/vector-icons";

import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing } from "@/constants/theme";

interface SectionHeaderProps {
  title: string;
  icon: keyof typeof Feather.glyphMap;
  count?: number;
}

export function SectionHeader({ title, icon, count }: SectionHeaderProps) {
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
      {count !== undefined && count > 0 ? (
        <View style={[styles.countBadge, { backgroundColor: theme.textTertiary }]}>
          <ThemedText type="caption" style={styles.countText}>
            {count}
          </ThemedText>
        </View>
      ) : null}
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
  countBadge: {
    marginLeft: Spacing.xs,
    paddingHorizontal: Spacing.xs + 2,
    paddingVertical: 2,
    borderRadius: 10,
  },
  countText: {
    fontSize: 10,
    color: "#FFFFFF",
    fontWeight: "600",
  },
});
