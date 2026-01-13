import React from "react";
import { View, StyleSheet, Image, ImageSourcePropType } from "react-native";
import Animated, { FadeIn } from "react-native-reanimated";
import { Feather } from "@expo/vector-icons";

import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";

interface EmptyStateProps {
  image?: ImageSourcePropType;
  icon?: keyof typeof Feather.glyphMap;
  title: string;
  subtitle?: string;
}

export function EmptyState({ image, icon, title, subtitle }: EmptyStateProps) {
  const { theme } = useTheme();

  return (
    <Animated.View entering={FadeIn.duration(500)} style={styles.container}>
      {image ? (
        <Image source={image} style={styles.image} resizeMode="contain" />
      ) : icon ? (
        <View style={[styles.iconContainer, { backgroundColor: theme.backgroundSecondary }]}>
          <Feather name={icon} size={32} color={theme.textTertiary} />
        </View>
      ) : null}
      <ThemedText type="title3" style={styles.title}>
        {title}
      </ThemedText>
      {subtitle ? (
        <ThemedText
          type="body"
          style={[styles.subtitle, { color: theme.textSecondary }]}
        >
          {subtitle}
        </ThemedText>
      ) : null}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing["2xl"],
    paddingHorizontal: Spacing.lg,
  },
  image: {
    width: 180,
    height: 180,
    marginBottom: Spacing.lg,
    opacity: 0.8,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: BorderRadius.xl,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.lg,
  },
  title: {
    textAlign: "center",
    marginBottom: Spacing.sm,
  },
  subtitle: {
    textAlign: "center",
  },
});
