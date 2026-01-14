import React, { useState, useCallback, useLayoutEffect } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Pressable,
  Platform,
  Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight, HeaderButton } from "@react-navigation/elements";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as FileSystem from "expo-file-system/legacy";
import Animated, { FadeInUp } from "react-native-reanimated";

import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";
import { RootStackParamList } from "@/navigation/RootStackNavigator";
import { NoteCard } from "@/components/NoteCard";
import { SectionHeader } from "@/components/SectionHeader";
import { EmptyState } from "@/components/EmptyState";
import { AnimatedOrb } from "@/components/AnimatedOrb";
import { useNotes, Note } from "@/hooks/useNotes";
import { useCustomSections } from "@/hooks/useCustomSections";
import { useSettings } from "@/hooks/useSettings";
import { useUnifiedAudioRecorder } from "@/hooks/useUnifiedAudioRecorder";
import { transcribeAndProcess } from "@/lib/api";

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function MainFeedScreen() {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const navigation = useNavigation<NavigationProp>();
  const { theme } = useTheme();
  const { notes, loading, refreshNotes, toggleComplete, deleteNote, addNote } = useNotes();
  const { sections } = useCustomSections();
  const { settings } = useSettings();
  const [refreshing, setRefreshing] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const {
    isRecording,
    startRecording: hookStartRecording,
    stopRecording: hookStopRecording,
    permissionStatus,
    requestPermission,
  } = useUnifiedAudioRecorder();

  // Force re-render when screen regains focus (after editing a note)
  const [focusKey, setFocusKey] = useState(0);
  useFocusEffect(
    useCallback(() => {
      setFocusKey((k) => k + 1);
    }, [])
  );

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

  const startRecording = async () => {
    try {
      if (!permissionStatus?.granted) {
        const granted = await requestPermission();
        if (!granted) {
          Alert.alert("Permission Required", "Microphone access is needed to record voice notes.");
          return;
        }
      }

      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      await hookStartRecording();
    } catch (error) {
      console.error("Failed to start recording:", error);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  };

  const stopRecording = async () => {
    let persistedUri: string | null = null;
    
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setIsProcessing(true);

      const recordingResult = await hookStopRecording();
      console.log("Recording stopped, result:", recordingResult);
      
      if (!recordingResult) {
        Alert.alert("Error", "Recording failed. Please try again.");
        setIsProcessing(false);
        return;
      }

      let audioInput: { uri: string; blob?: Blob };

      if (Platform.OS === "web") {
        audioInput = recordingResult;
      } else {
        try {
          const recordingsDir = FileSystem.documentDirectory + "recordings/";
          await FileSystem.makeDirectoryAsync(recordingsDir, { intermediates: true });
          persistedUri = recordingsDir + `recording_${Date.now()}.m4a`;
          await FileSystem.copyAsync({ from: recordingResult.uri, to: persistedUri });
          console.log("Recording copied to:", persistedUri);
          audioInput = { uri: persistedUri };
        } catch (copyError) {
          console.log("Copy failed:", copyError);
          audioInput = { uri: recordingResult.uri };
        }
      }

      const result = await transcribeAndProcess(audioInput, sections, settings.timezone);

      for (const note of result.notes) {
        await addNote({
          rawText: note.rawText,
          title: note.title,
          category: note.category,
          dueDate: note.dueDate,
          entities: note.entities,
          tags: note.tags,
        });
      }

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setIsProcessing(false);
    } catch (error: any) {
      console.error("Failed to process recording:", error);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert("Error", error.message || "Could not process recording. Please try again.");
      setIsProcessing(false);
    } finally {
      if (persistedUri && persistedUri.includes("/recordings/")) {
        try {
          await FileSystem.deleteAsync(persistedUri, { idempotent: true });
        } catch {}
      }
    }
  };

  const handleMicPress = () => {
    if (isProcessing) return;
    
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  const handleQueryPress = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    navigation.navigate("Query");
  }, [navigation]);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <View style={{ flexDirection: "row", alignItems: "center", gap: Spacing.sm }}>
          <HeaderButton
            onPress={() => navigation.navigate("Timeline")}
            pressColor="transparent"
            pressOpacity={0.7}
          >
            <Feather name="list" size={22} color={theme.text} />
          </HeaderButton>
          <HeaderButton
            onPress={() => navigation.navigate("Settings")}
            pressColor="transparent"
            pressOpacity={0.7}
          >
            <Feather name="settings" size={22} color={theme.text} />
          </HeaderButton>
        </View>
      ),
    });
  }, [navigation, theme]);

  const renderSection = (
    title: string,
    icon: keyof typeof Feather.glyphMap,
    sectionNotes: Note[],
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
              onEdit={() => navigation.navigate("EditNote", { note })}
              delay={delay + index * 50}
            />
          ))
        ) : (
          <View style={styles.sectionEmpty}>
            <Feather name={icon} size={24} color={theme.textTertiary} />
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
            icon="mic"
            title="No notes yet"
            subtitle="Tap the orb to start capturing thoughts"
          />
        ) : (
          <>
            {renderSection(
              "TODAY",
              "calendar",
              todayNotes,
              "Nothing scheduled for today",
              100
            )}
            {renderSection(
              "TOMORROW",
              "sunrise",
              tomorrowNotes,
              "Nothing scheduled for tomorrow",
              200
            )}
            {renderSection(
              "IDEAS",
              "zap",
              ideaNotes,
              "Capture your ideas here",
              300
            )}
            {renderSection(
              "TO BUY",
              "shopping-cart",
              shoppingNotes,
              "Your shopping list is empty",
              400
            )}
            {otherNotes.length > 0
              ? renderSection(
                  "NOTES",
                  "file-text",
                  otherNotes,
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

      <View style={[styles.orbContainer, { bottom: insets.bottom + Spacing.sm }]}>
        <AnimatedOrb
          onPress={handleMicPress}
          isRecording={isRecording}
          isProcessing={isProcessing}
          size={Spacing.micButtonSize}
          testID="button-record"
        />
      </View>
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
  orbContainer: {
    position: "absolute",
    alignSelf: "center",
    alignItems: "center",
    justifyContent: "center",
  },
});
