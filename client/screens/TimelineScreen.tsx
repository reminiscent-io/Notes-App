import React, { useState, useCallback } from "react";
import { View, StyleSheet, ScrollView, RefreshControl } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import Animated, { FadeInUp } from "react-native-reanimated";

import { useTheme } from "@/hooks/useTheme";
import { Spacing, Colors } from "@/constants/theme";
import { RootStackParamList } from "@/navigation/RootStackNavigator";
import { NoteCard } from "@/components/NoteCard";
import { SectionHeader } from "@/components/SectionHeader";
import { EmptyState } from "@/components/EmptyState";
import { useNotes, Note } from "@/hooks/useNotes";

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function TimelineScreen() {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const navigation = useNavigation<NavigationProp>();
  const { theme } = useTheme();
  const { notes, loading, refreshNotes, toggleComplete, deleteNote } = useNotes();
  const [refreshing, setRefreshing] = useState(false);

  const activeNotes = notes.filter((n) => !n.archivedAt && !n.completed);

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const noDateNotes = activeNotes.filter((n) => {
    if (n.dueDate) return false;
    return n.category === "idea" || n.category === "other" || n.category === "shopping";
  });

  const overdueNotes = activeNotes.filter((n) => {
    if (!n.dueDate) return false;
    const dueDate = new Date(n.dueDate);
    return dueDate < startOfToday;
  }).sort((a, b) => new Date(a.dueDate!).getTime() - new Date(b.dueDate!).getTime());

  const upcomingNotes = activeNotes.filter((n) => {
    if (!n.dueDate) return false;
    const dueDate = new Date(n.dueDate);
    return dueDate >= startOfToday;
  }).sort((a, b) => new Date(a.dueDate!).getTime() - new Date(b.dueDate!).getTime());

  const hasAnyNotes = noDateNotes.length > 0 || overdueNotes.length > 0 || upcomingNotes.length > 0;

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refreshNotes();
    setRefreshing(false);
  }, [refreshNotes]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const isToday = date.toDateString() === today.toDateString();
    const isTomorrow = date.toDateString() === tomorrow.toDateString();

    if (isToday) {
      return `Today at ${date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}`;
    }
    if (isTomorrow) {
      return `Tomorrow at ${date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}`;
    }

    return date.toLocaleDateString([], { 
      weekday: "short", 
      month: "short", 
      day: "numeric",
      hour: "numeric",
      minute: "2-digit"
    });
  };

  const renderNoteCard = (note: Note, delay: number, isOverdue: boolean = false) => (
    <NoteCard
      key={note.id}
      note={note}
      onToggleComplete={() => toggleComplete(note.id)}
      onDelete={() => deleteNote(note.id)}
      onEdit={() => navigation.navigate("EditNote", { note })}
      delay={delay}
    />
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
        {!hasAnyNotes && !loading ? (
          <EmptyState
            icon="calendar"
            title="No upcoming notes"
            subtitle="Your timeline is clear"
          />
        ) : (
          <>
            {overdueNotes.length > 0 ? (
              <Animated.View
                entering={FadeInUp.delay(100).duration(400)}
                style={styles.section}
              >
                <SectionHeader title="OVERDUE" icon="alert-circle" />
                {overdueNotes.map((note, index) => (
                  <View key={note.id} style={styles.overdueCard}>
                    <NoteCard
                      note={note}
                      onToggleComplete={() => toggleComplete(note.id)}
                      onDelete={() => deleteNote(note.id)}
                      onEdit={() => navigation.navigate("EditNote", { note })}
                      delay={100 + index * 50}
                    />
                  </View>
                ))}
              </Animated.View>
            ) : null}

            {upcomingNotes.length > 0 ? (
              <Animated.View
                entering={FadeInUp.delay(200).duration(400)}
                style={styles.section}
              >
                <SectionHeader title="UPCOMING" icon="clock" />
                {upcomingNotes.map((note, index) => renderNoteCard(note, 200 + index * 50))}
              </Animated.View>
            ) : null}

            {noDateNotes.length > 0 ? (
              <Animated.View
                entering={FadeInUp.delay(300).duration(400)}
                style={styles.section}
              >
                <SectionHeader title="NO DATE" icon="inbox" />
                {noDateNotes.map((note, index) => renderNoteCard(note, 300 + index * 50))}
              </Animated.View>
            ) : null}
          </>
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
  section: {
    marginBottom: Spacing.lg,
  },
  overdueCard: {
    borderLeftWidth: 3,
    borderLeftColor: Colors.light.error,
    borderRadius: 4,
    marginLeft: -3,
  },
});
