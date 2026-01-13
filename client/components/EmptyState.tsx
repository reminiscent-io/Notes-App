import React from "react";
import { View, StyleSheet, Image, ImageSourcePropType } from "react-native";
import Animated, { FadeIn } from "react-native-reanimated";

import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing } from "@/constants/theme";

interface EmptyStateProps {
  image: ImageSourcePropType;
  title: string;
  subtitle?: string;
}

export function EmptyState({ image, title, subtitle }: EmptyStateProps) {
  const { theme } = useTheme();

  return (
    <Animated.View entering={FadeIn.duration(500)} style={styles.container}>
      <Image source={image} style={styles.image} resizeMode="contain" />
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
  title: {
    textAlign: "center",
    marginBottom: Spacing.sm,
  },
  subtitle: {
    textAlign: "center",
  },
});
