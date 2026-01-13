import React, { useCallback } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  RefreshControl,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import Animated, {
  FadeInUp,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  runOnJS,
} from "react-native-reanimated";
import { Gesture, GestureDetector } from "react-native-gesture-handler";

import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius, Colors } from "@/constants/theme";
import { EmptyState } from "@/components/EmptyState";
import { useNotes, Note } from "@/hooks/useNotes";

interface ArchivedNoteCardProps {
  note: Note;
  onUnarchive: () => void;
  delay?: number;
}

function ArchivedNoteCard({ note, onUnarchive, delay = 0 }: ArchivedNoteCardProps) {
  const { theme } = useTheme();
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

  const formatArchivedDate = () => {
    if (!note.archivedAt) return null;
    const date = new Date(note.archivedAt);
    return date.toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" });
  };

  const handleUnarchive = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onUnarchive();
  };

  const panGesture = Gesture.Pan()
    .activeOffsetX([-20, 20])
    .onUpdate((event) => {
      translateX.value = Math.max(-100, Math.min(100, event.translationX));
    })
    .onEnd((event) => {
      if (event.translationX > 80) {
        translateX.value = withSpring(0);
        runOnJS(handleUnarchive)();
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

  return (
    <Animated.View
      entering={FadeInUp.delay(delay).duration(300)}
      style={styles.wrapper}
    >
      <Animated.View style={[styles.actionLeft, leftActionStyle]}>
        <Feather name="inbox" size={24} color={Colors.light.success} />
      </Animated.View>

      <GestureDetector gesture={panGesture}>
        <Animated.View
          style={[
            styles.card,
            animatedStyle,
            { backgroundColor: theme.backgroundDefault },
          ]}
        >
          <View style={styles.content}>
            <View style={styles.titleRow}>
              <Feather
                name={getCategoryIcon()}
                size={14}
                color={theme.textSecondary}
                style={styles.icon}
              />
              <ThemedText
                type="body"
                style={[
                  styles.title,
                  note.completed && { textDecorationLine: "line-through", opacity: 0.6 },
                ]}
                numberOfLines={2}
              >
                {note.title}
              </ThemedText>
            </View>
            <View style={styles.metaRow}>
              <Feather name="archive" size={12} color={theme.textTertiary} />
              <ThemedText type="caption" style={{ color: theme.textTertiary }}>
                Archived {formatArchivedDate()}
              </ThemedText>
            </View>
          </View>
          <View style={styles.swipeHint}>
            <Feather name="chevron-right" size={16} color={theme.textTertiary} />
          </View>
        </Animated.View>
      </GestureDetector>
    </Animated.View>
  );
}

export default function ArchivedNotesScreen() {
  const headerHeight = useHeaderHeight();
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const { notes, refreshNotes, unarchiveNote } = useNotes();
  const [refreshing, setRefreshing] = React.useState(false);

  const archivedNotes = notes.filter((n) => n.archivedAt);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refreshNotes();
    setRefreshing(false);
  }, [refreshNotes]);

  const handleUnarchive = useCallback(
    (id: string) => {
      unarchiveNote(id);
    },
    [unarchiveNote]
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundRoot }]}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.contentContainer,
          {
            paddingTop: headerHeight + Spacing.md,
            paddingBottom: insets.bottom + Spacing.xl,
          },
        ]}
        scrollIndicatorInsets={{ bottom: insets.bottom }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {archivedNotes.length > 0 ? (
          <>
            <Animated.View
              entering={FadeInUp.delay(50).duration(300)}
              style={styles.hintContainer}
            >
              <Feather name="info" size={14} color={theme.textTertiary} />
              <ThemedText type="caption" style={{ color: theme.textTertiary }}>
                Swipe right to unarchive
              </ThemedText>
            </Animated.View>
            {archivedNotes.map((note, index) => (
              <ArchivedNoteCard
                key={note.id}
                note={note}
                onUnarchive={() => handleUnarchive(note.id)}
                delay={100 + index * 50}
              />
            ))}
          </>
        ) : (
          <EmptyState
            image={require("../../assets/images/empty-notes.png")}
            title="No archived notes"
            subtitle="Archived notes will appear here"
          />
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: Spacing.lg,
  },
  hintContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    marginBottom: Spacing.md,
  },
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
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    marginTop: Spacing.xs,
  },
  swipeHint: {
    opacity: 0.5,
  },
  actionLeft: {
    position: "absolute",
    left: Spacing.md,
    top: 0,
    bottom: 0,
    justifyContent: "center",
  },
});
