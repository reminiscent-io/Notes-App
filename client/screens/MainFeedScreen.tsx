import React, { useState, useCallback, useEffect } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Pressable,
  Image,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import Animated, {
  useAnimatedStyle,
  withSpring,
  useSharedValue,
  FadeInUp,
} from "react-native-reanimated";

import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius, Shadows, Colors } from "@/constants/theme";
import { RootStackParamList } from "@/navigation/RootStackNavigator";
import { NoteCard } from "@/components/NoteCard";
import { SectionHeader } from "@/components/SectionHeader";
import { EmptyState } from "@/components/EmptyState";
import { useNotes, Note } from "@/hooks/useNotes";
import { useCustomSections } from "@/hooks/useCustomSections";

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export default function MainFeedScreen() {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const navigation = useNavigation<NavigationProp>();
  const { theme, isDark } = useTheme();
  const { notes, loading, refreshNotes, toggleComplete, deleteNote, archiveNote } = useNotes();
  const { sections, deleteSection } = useCustomSections();
  const [refreshing, setRefreshing] = useState(false);

  const micScale = useSharedValue(1);

  const activeNotes = notes.filter((n) => !n.archivedAt);
  const todayNotes = activeNotes.filter((n) => n.category === "today");
  const tomorrowNotes = activeNotes.filter((n) => n.category === "tomorrow");
  const ideaNotes = activeNotes.filter((n) => n.category === "idea");
  const shoppingNotes = activeNotes.filter((n) => n.category === "shopping");
  const otherNotes = activeNotes.filter((n) => n.category === "other");

  const hasAnyNotes = activeNotes.length > 0;

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refreshNotes();
    setRefreshing(false);
  }, [refreshNotes]);

  const handleMicPress = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    navigation.navigate("Recording");
  }, [navigation]);

  const handleQueryPress = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    navigation.navigate("Query");
  }, [navigation]);

  const micAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: micScale.value }],
  }));

  const handleMicPressIn = () => {
    micScale.value = withSpring(0.92, { damping: 15, stiffness: 300 });
  };

  const handleMicPressOut = () => {
    micScale.value = withSpring(1, { damping: 15, stiffness: 300 });
  };

  const renderSection = (
    title: string,
    icon: keyof typeof Feather.glyphMap,
    sectionNotes: Note[],
    emptyImage: any,
    emptyText: string,
    delay: number
  ) => {
    if (sectionNotes.length === 0 && !hasAnyNotes) return null;

    return (
      <Animated.View
        key={title}
        entering={FadeInUp.delay(delay).duration(400)}
        style={styles.section}
      >
        <SectionHeader title={title} icon={icon} />
        {sectionNotes.length > 0 ? (
          sectionNotes.map((note, index) => (
            <NoteCard
              key={note.id}
              note={note}
              onToggleComplete={() => toggleComplete(note.id)}
              onDelete={() => deleteNote(note.id)}
              delay={delay + index * 50}
            />
          ))
        ) : (
          <View style={styles.sectionEmpty}>
            <Image source={emptyImage} style={styles.sectionEmptyImage} />
            <ThemedText
              type="caption"
              style={{ color: theme.textSecondary, textAlign: "center" }}
            >
              {emptyText}
            </ThemedText>
          </View>
        )}
      </Animated.View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundRoot }]}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.contentContainer,
          {
            paddingTop: headerHeight + Spacing.md,
            paddingBottom: insets.bottom + Spacing.micButtonSize + Spacing.xl * 2,
          },
        ]}
        scrollIndicatorInsets={{ bottom: insets.bottom }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <Pressable
          onPress={handleQueryPress}
          style={({ pressed }) => [
            styles.queryButton,
            {
              backgroundColor: theme.backgroundDefault,
              opacity: pressed ? 0.7 : 1,
            },
          ]}
        >
          <Feather name="search" size={18} color={theme.textSecondary} />
          <ThemedText type="body" style={{ color: theme.textSecondary }}>
            Ask me anything...
          </ThemedText>
        </Pressable>

        {!hasAnyNotes && !loading ? (
          <EmptyState
            image={require("../../assets/images/empty-notes.png")}
            title="No notes yet"
            subtitle="Tap the mic to start capturing thoughts"
          />
        ) : (
          <>
            {renderSection(
              "TODAY",
              "calendar",
              todayNotes,
              require("../../assets/images/empty-today.png"),
              "Nothing scheduled for today",
              100
            )}
            {renderSection(
              "TOMORROW",
              "sunrise",
              tomorrowNotes,
              require("../../assets/images/empty-today.png"),
              "Nothing scheduled for tomorrow",
              200
            )}
            {renderSection(
              "IDEAS",
              "zap",
              ideaNotes,
              require("../../assets/images/empty-ideas.png"),
              "Capture your ideas here",
              300
            )}
            {renderSection(
              "TO BUY",
              "shopping-cart",
              shoppingNotes,
              require("../../assets/images/empty-notes.png"),
              "Your shopping list is empty",
              400
            )}
            {otherNotes.length > 0
              ? renderSection(
                  "NOTES",
                  "file-text",
                  otherNotes,
                  require("../../assets/images/empty-notes.png"),
                  "No other notes",
                  500
                )
              : null}
            {sections.map((section, index) => {
              const sectionNotes = activeNotes.filter(
                (n) => n.tags?.includes(section.name)
              );
              if (sectionNotes.length === 0) return null;
              return (
                <Animated.View
                  key={section.id}
                  entering={FadeInUp.delay(600 + index * 100).duration(400)}
                  style={styles.section}
                >
                  <SectionHeader
                    title={section.name.toUpperCase()}
                    icon={section.icon as keyof typeof Feather.glyphMap}
                    count={sectionNotes.length}
                  />
                  {sectionNotes.map((note, noteIndex) => (
                    <NoteCard
                      key={note.id}
                      note={note}
                      onToggleComplete={() => toggleComplete(note.id)}
                      onDelete={() => deleteNote(note.id)}
                      delay={600 + index * 100 + noteIndex * 50}
                    />
                  ))}
                </Animated.View>
              );
            })}
          </>
        )}
      </ScrollView>

      <AnimatedPressable
        onPress={handleMicPress}
        onPressIn={handleMicPressIn}
        onPressOut={handleMicPressOut}
        style={[
          styles.micButton,
          micAnimatedStyle,
          {
            bottom: insets.bottom + Spacing.lg,
            backgroundColor: isDark ? Colors.dark.accent : Colors.light.primary,
          },
          Shadows.micButton,
        ]}
        testID="button-record"
      >
        <Feather name="mic" size={32} color="#FFFFFF" />
      </AnimatedPressable>
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
  queryButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm + 4,
    borderRadius: BorderRadius.xl,
    marginBottom: Spacing.lg,
  },
  section: {
    marginBottom: Spacing.lg,
  },
  sectionEmpty: {
    alignItems: "center",
    paddingVertical: Spacing.lg,
    gap: Spacing.sm,
  },
  sectionEmptyImage: {
    width: 80,
    height: 80,
    opacity: 0.6,
  },
  micButton: {
    position: "absolute",
    alignSelf: "center",
    width: Spacing.micButtonSize,
    height: Spacing.micButtonSize,
    borderRadius: Spacing.micButtonSize / 2,
    alignItems: "center",
    justifyContent: "center",
  },
});
