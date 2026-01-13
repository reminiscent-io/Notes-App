import React from "react";
import { View, StyleSheet, Pressable } from "react-native";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  FadeInRight,
  Layout,
  runOnJS,
} from "react-native-reanimated";
import { Gesture, GestureDetector } from "react-native-gesture-handler";

import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius, Colors } from "@/constants/theme";
import { Note } from "@/hooks/useNotes";

interface NoteCardProps {
  note: Note;
  onToggleComplete: () => void;
  onDelete: () => void;
  delay?: number;
  compact?: boolean;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function NoteCard({
  note,
  onToggleComplete,
  onDelete,
  delay = 0,
  compact = false,
}: NoteCardProps) {
  const { theme, isDark } = useTheme();
  const translateX = useSharedValue(0);
  const scale = useSharedValue(1);

  const getCategoryIcon = (): keyof typeof Feather.glyphMap => {
    switch (note.category) {
      case "today":
      case "tomorrow":
        return "calendar";
      case "idea":
        return "zap";
      case "shopping":
        return "shopping-cart";
      default:
        return "file-text";
    }
  };

  const formatTime = () => {
    if (!note.dueDate) return null;
    const date = new Date(note.dueDate);
    return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  };

  const handleComplete = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onToggleComplete();
  };

  const handleDelete = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    onDelete();
  };

  const panGesture = Gesture.Pan()
    .activeOffsetX([-20, 20])
    .onUpdate((event) => {
      translateX.value = Math.max(-100, Math.min(100, event.translationX));
    })
    .onEnd((event) => {
      if (event.translationX > 80) {
        translateX.value = withSpring(0);
        runOnJS(handleComplete)();
      } else if (event.translationX < -80) {
        translateX.value = withSpring(0);
        runOnJS(handleDelete)();
      } else {
        translateX.value = withSpring(0);
      }
    });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }, { scale: scale.value }],
  }));

  const leftActionStyle = useAnimatedStyle(() => ({
    opacity: translateX.value > 0 ? Math.min(translateX.value / 80, 1) : 0,
  }));

  const rightActionStyle = useAnimatedStyle(() => ({
    opacity: translateX.value < 0 ? Math.min(-translateX.value / 80, 1) : 0,
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.98, { damping: 15, stiffness: 300 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 15, stiffness: 300 });
  };

  return (
    <Animated.View
      entering={FadeInRight.delay(delay).duration(300)}
      layout={Layout.springify()}
      style={styles.wrapper}
    >
      <Animated.View style={[styles.actionLeft, leftActionStyle]}>
        <Feather name="check" size={24} color={Colors.light.success} />
      </Animated.View>
      <Animated.View style={[styles.actionRight, rightActionStyle]}>
        <Feather name="trash-2" size={24} color={Colors.light.error} />
      </Animated.View>

      <GestureDetector gesture={panGesture}>
        <AnimatedPressable
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          style={[
            compact ? styles.cardCompact : styles.card,
            animatedStyle,
            { backgroundColor: theme.backgroundDefault },
          ]}
          testID={`card-note-${note.id}`}
        >
          <Pressable
            onPress={handleComplete}
            style={[
              styles.checkbox,
              {
                borderColor: note.completed ? Colors.light.success : theme.textTertiary,
                backgroundColor: note.completed ? Colors.light.success : "transparent",
              },
            ]}
            testID={`checkbox-${note.id}`}
          >
            {note.completed ? (
              <Feather name="check" size={12} color="#FFFFFF" />
            ) : null}
          </Pressable>

          <View style={styles.content}>
            <View style={styles.titleRow}>
              <Feather
                name={getCategoryIcon()}
                size={14}
                color={theme.textSecondary}
                style={styles.icon}
              />
              <ThemedText
                type={compact ? "caption" : "body"}
                style={[
                  styles.title,
                  note.completed && { textDecorationLine: "line-through", opacity: 0.6 },
                ]}
                numberOfLines={compact ? 1 : 2}
              >
                {note.title}
              </ThemedText>
            </View>
            {formatTime() && !compact ? (
              <ThemedText type="caption" style={{ color: theme.textSecondary }}>
                {formatTime()}
              </ThemedText>
            ) : null}
          </View>
        </AnimatedPressable>
      </GestureDetector>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: Spacing.sm,
    position: "relative",
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.md,
    borderRadius: BorderRadius.xs,
  },
  cardCompact: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.sm,
    borderRadius: BorderRadius.xs,
    backgroundColor: "rgba(255,255,255,0.1)",
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
    marginRight: Spacing.sm,
  },
  content: {
    flex: 1,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  icon: {
    marginRight: Spacing.xs,
  },
  title: {
    flex: 1,
  },
  actionLeft: {
    position: "absolute",
    left: Spacing.md,
    top: 0,
    bottom: 0,
    justifyContent: "center",
  },
  actionRight: {
    position: "absolute",
    right: Spacing.md,
    top: 0,
    bottom: 0,
    justifyContent: "center",
  },
});
