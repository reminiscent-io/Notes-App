import React, { useState, useEffect } from "react";
import {
  View,
  StyleSheet,
  Pressable,
  ScrollView,
  ActivityIndicator,
  Platform,
  Linking,
  Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as FileSystem from "expo-file-system/legacy";
import Animated, {
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  useSharedValue,
  FadeIn,
  FadeOut,
  withSpring,
  cancelAnimation,
} from "react-native-reanimated";
import { useAudioRecorder, AudioModule, RecordingPresets, setAudioModeAsync } from "expo-audio";

import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, Colors, BorderRadius } from "@/constants/theme";
import { useNotes, Note } from "@/hooks/useNotes";
import { useCustomSections } from "@/hooks/useCustomSections";
import { useNotifications } from "@/hooks/useNotifications";
import { useSettings } from "@/hooks/useSettings";
import { queryNotes } from "@/lib/api";
import { NoteCard } from "@/components/NoteCard";

const EXAMPLE_PROMPTS = [
  '"What do I need to do today?"',
  '"Mark my grocery list as done"',
  '"Create a work section"',
  '"Archive my completed tasks"',
  '"Delete my shopping notes"',
  '"What ideas do I have?"',
];

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface PermissionStatus {
  granted: boolean;
  canAskAgain: boolean;
}

export default function QueryModal() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { theme, isDark } = useTheme();
  const { notes, toggleComplete, deleteNote, archiveNote } = useNotes();
  const { sections, addSection } = useCustomSections();
  const { cancelNoteReminder } = useNotifications();
  const { settings } = useSettings();

  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [queryText, setQueryText] = useState("");
  const [response, setResponse] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [matchedNotes, setMatchedNotes] = useState<Note[]>([]);
  const [permissionStatus, setPermissionStatus] = useState<PermissionStatus | null>(null);
  const [exampleIndex, setExampleIndex] = useState(0);

  const audioRecorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const pulseScale = useSharedValue(1);
  const micScale = useSharedValue(1);

  useEffect(() => {
    checkPermissions();
  }, []);

  const checkPermissions = async () => {
    try {
      const status = await AudioModule.getRecordingPermissionsAsync();
      setPermissionStatus({
        granted: status.granted,
        canAskAgain: status.canAskAgain,
      });
    } catch (error) {
      console.error("Failed to check permissions:", error);
      setPermissionStatus({ granted: false, canAskAgain: true });
    }
  };

  useEffect(() => {
    if (isRecording) {
      pulseScale.value = withRepeat(
        withSequence(
          withTiming(1.15, { duration: 600 }),
          withTiming(1, { duration: 600 })
        ),
        -1,
        true
      );
    } else {
      cancelAnimation(pulseScale);
      pulseScale.value = withTiming(1, { duration: 200 });
    }
  }, [isRecording]);

  useEffect(() => {
    if (!isRecording && !response && !isProcessing) {
      const interval = setInterval(() => {
        setExampleIndex((prev) => (prev + 1) % EXAMPLE_PROMPTS.length);
      }, 3000);
      return () => clearInterval(interval);
    }
  }, [isRecording, response, isProcessing]);

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
  }));

  const micAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: micScale.value }],
  }));

  const handleMicPressIn = () => {
    micScale.value = withSpring(0.9, { damping: 15, stiffness: 300 });
  };

  const handleMicPressOut = () => {
    micScale.value = withSpring(1, { damping: 15, stiffness: 300 });
  };

  const startRecording = async () => {
    try {
      setErrorMessage("");
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      setQueryText("");
      setResponse("");
      setMatchedNotes([]);

      if (Platform.OS === "ios") {
        await setAudioModeAsync({
          allowsRecording: true,
          playsInSilentMode: true,
        });
      }

      await audioRecorder.prepareToRecordAsync();
      audioRecorder.record();
      setIsRecording(true);
    } catch (error: any) {
      console.error("Failed to start recording:", error);
      setErrorMessage("Could not start recording. Please try again.");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  };

  const stopRecording = async () => {
    let persistedUri: string | null = null;
    
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setIsRecording(false);
      setIsProcessing(true);
      await audioRecorder.stop();

      const cacheUri = audioRecorder.uri;
      console.log("Query recording stopped, URI:", cacheUri);
      
      if (!cacheUri) {
        setErrorMessage("Recording failed. Please try again.");
        setIsProcessing(false);
        return;
      }

      // Try to copy to Documents immediately (cache files are very temporary)
      try {
        const recordingsDir = FileSystem.documentDirectory + "recordings/";
        await FileSystem.makeDirectoryAsync(recordingsDir, { intermediates: true });
        persistedUri = recordingsDir + `query_${Date.now()}.m4a`;
        await FileSystem.copyAsync({ from: cacheUri, to: persistedUri });
        console.log("Recording copied to:", persistedUri);
      } catch (copyError) {
        console.log("Copy failed:", copyError);
        persistedUri = cacheUri;
      }

      // Upload and process immediately
      const result = await queryNotes(persistedUri, notes, sections, settings.timezone);
      setQueryText(result.query);
      setResponse(result.response);
      setMatchedNotes(result.matchedNotes || []);

      if (result.action === "create_section" && result.sectionName) {
        await addSection(
          result.sectionName,
          result.sectionIcon || "folder",
          result.sectionKeywords || []
        );
      } else if (result.action && result.matchedNotes && result.matchedNotes.length > 0) {
        for (const note of result.matchedNotes) {
          if (result.action === "complete" && !note.completed) {
            await toggleComplete(note.id);
          } else if (result.action === "delete") {
            await deleteNote(note.id);
          } else if (result.action === "archive" && !note.archivedAt) {
            await archiveNote(note.id);
            await cancelNoteReminder(note.id);
          }
        }
      }

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setIsProcessing(false);
    } catch (error: any) {
      console.error("Failed to process query:", error);
      setErrorMessage(error.message || "Sorry, I couldn't process that. Please try again.");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setIsProcessing(false);
    } finally {
      // Clean up persisted file if we created one
      if (persistedUri && persistedUri.includes("/recordings/")) {
        try {
          await FileSystem.deleteAsync(persistedUri, { idempotent: true });
        } catch {}
      }
    }
  };

  const handleMicPress = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  const handleClose = async () => {
    if (isRecording) {
      try {
        await audioRecorder.stop();
      } catch {}
    }
    navigation.goBack();
  };

  const handleRequestPermission = async () => {
    try {
      const status = await AudioModule.requestRecordingPermissionsAsync();
      setPermissionStatus({
        granted: status.granted,
        canAskAgain: status.canAskAgain,
      });
    } catch (error) {
      console.error("Failed to request permission:", error);
    }
  };

  const handleOpenSettings = async () => {
    if (Platform.OS !== "web") {
      try {
        await Linking.openSettings();
      } catch (error) {
        console.error("Failed to open settings:", error);
      }
    }
  };

  if (permissionStatus === null) {
    return (
      <View style={[styles.container, { backgroundColor: theme.overlay }]}>
        <Pressable style={styles.backdrop} onPress={handleClose} />
        <View style={styles.content}>
          <ActivityIndicator size="large" color={Colors.light.accent} />
        </View>
      </View>
    );
  }

  if (!permissionStatus.granted) {
    const canRequest = permissionStatus.canAskAgain;
    
    return (
      <View style={[styles.container, { backgroundColor: theme.overlay }]}>
        <Pressable style={styles.backdrop} onPress={handleClose} />
        <Animated.View
          entering={FadeIn}
          exiting={FadeOut}
          style={[styles.content, { paddingBottom: insets.bottom + Spacing.xl }]}
        >
          <Pressable
            style={[styles.closeButton, { top: insets.top + Spacing.md }]}
            onPress={handleClose}
          >
            <Feather name="x" size={24} color="#FFFFFF" />
          </Pressable>

          <View style={styles.permissionContainer}>
            <Feather name="mic-off" size={48} color="#FFFFFF" />
            <ThemedText
              type="title3"
              style={{ color: "#FFFFFF", textAlign: "center", marginTop: Spacing.lg }}
            >
              Microphone Access Required
            </ThemedText>
            <ThemedText
              type="body"
              style={{ color: "rgba(255,255,255,0.7)", textAlign: "center", marginTop: Spacing.sm }}
            >
              {canRequest
                ? "Voice Notes needs access to your microphone to search your notes."
                : "Microphone access was denied. Please enable it in Settings to use voice search."}
            </ThemedText>
            
            {canRequest ? (
              <Pressable
                onPress={handleRequestPermission}
                style={[styles.permissionButton, { backgroundColor: Colors.light.accent }]}
              >
                <ThemedText type="body" style={{ color: "#FFFFFF", fontWeight: "600" }}>
                  Enable Microphone
                </ThemedText>
              </Pressable>
            ) : Platform.OS !== "web" ? (
              <Pressable
                onPress={handleOpenSettings}
                style={[styles.permissionButton, { backgroundColor: Colors.light.accent }]}
              >
                <ThemedText type="body" style={{ color: "#FFFFFF", fontWeight: "600" }}>
                  Open Settings
                </ThemedText>
              </Pressable>
            ) : (
              <ThemedText
                type="caption"
                style={{ color: "rgba(255,255,255,0.5)", textAlign: "center", marginTop: Spacing.lg }}
              >
                Run in Expo Go to use this feature
              </ThemedText>
            )}
          </View>
        </Animated.View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.overlay }]}>
      <Pressable style={styles.backdrop} onPress={handleClose} />
      <Animated.View
        entering={FadeIn}
        exiting={FadeOut}
        style={[styles.content, { paddingBottom: insets.bottom + Spacing.xl }]}
      >
        <Pressable
          style={[styles.closeButton, { top: insets.top + Spacing.md }]}
          onPress={handleClose}
        >
          <Feather name="x" size={24} color="#FFFFFF" />
        </Pressable>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[
            styles.scrollContent,
            { paddingTop: insets.top + 60 },
          ]}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.centerContent}>
            {isProcessing ? (
              <View style={styles.processingContainer}>
                <ActivityIndicator size="large" color={Colors.light.accent} />
                <ThemedText
                  type="body"
                  style={{ color: "#FFFFFF", marginTop: Spacing.lg }}
                >
                  Searching...
                </ThemedText>
              </View>
            ) : response ? (
              <View style={styles.resultsContainer}>
                {queryText ? (
                  <View style={[styles.queryBubble, { backgroundColor: "rgba(255,255,255,0.1)" }]}>
                    <ThemedText type="caption" style={{ color: "rgba(255,255,255,0.6)" }}>
                      You asked:
                    </ThemedText>
                    <ThemedText type="body" style={{ color: "#FFFFFF", marginTop: Spacing.xs }}>
                      "{queryText}"
                    </ThemedText>
                  </View>
                ) : null}

                <View style={[styles.responseBubble, { backgroundColor: Colors.light.accent }]}>
                  <ThemedText type="body" style={{ color: "#FFFFFF" }}>
                    {response}
                  </ThemedText>
                </View>

                {matchedNotes.length > 0 ? (
                  <View style={styles.matchedNotesContainer}>
                    <ThemedText
                      type="caption"
                      style={{ color: "rgba(255,255,255,0.6)", marginBottom: Spacing.sm }}
                    >
                      Related notes:
                    </ThemedText>
                    {matchedNotes.map((note) => (
                      <NoteCard
                        key={note.id}
                        note={note}
                        onToggleComplete={() => toggleComplete(note.id)}
                        onDelete={() => deleteNote(note.id)}
                        compact
                      />
                    ))}
                  </View>
                ) : null}

                <Pressable
                  onPress={() => {
                    setQueryText("");
                    setResponse("");
                    setMatchedNotes([]);
                    setErrorMessage("");
                  }}
                  style={[styles.askAgainButton, { borderColor: "rgba(255,255,255,0.3)" }]}
                >
                  <Feather name="refresh-cw" size={16} color="#FFFFFF" />
                  <ThemedText type="body" style={{ color: "#FFFFFF", marginLeft: Spacing.sm }}>
                    Ask another question
                  </ThemedText>
                </Pressable>
              </View>
            ) : (
              <>
                <Animated.View
                  style={[styles.pulseRing, pulseStyle, { opacity: isRecording ? 0.3 : 0 }]}
                />
                <AnimatedPressable
                  onPress={handleMicPress}
                  onPressIn={handleMicPressIn}
                  onPressOut={handleMicPressOut}
                  style={[
                    styles.micButton,
                    micAnimatedStyle,
                    { backgroundColor: Colors.light.accent },
                  ]}
                  testID="button-query-mic"
                >
                  <Feather
                    name={isRecording ? "square" : "search"}
                    size={36}
                    color="#FFFFFF"
                  />
                </AnimatedPressable>

                <ThemedText
                  type="title3"
                  style={{ color: "#FFFFFF", marginTop: Spacing.xl, textAlign: "center" }}
                >
                  {isRecording ? "Listening..." : "Ask me anything"}
                </ThemedText>
                <Animated.View
                  key={exampleIndex}
                  entering={FadeIn}
                  exiting={FadeOut}
                >
                  <ThemedText
                    type="body"
                    style={{ color: "rgba(255,255,255,0.7)", marginTop: Spacing.sm, textAlign: "center" }}
                  >
                    {isRecording
                      ? "Tap to stop"
                      : EXAMPLE_PROMPTS[exampleIndex]}
                  </ThemedText>
                </Animated.View>

                {errorMessage ? (
                  <Animated.View
                    entering={FadeIn}
                    style={[styles.errorContainer, { backgroundColor: "rgba(239,68,68,0.2)" }]}
                  >
                    <ThemedText type="body" style={{ color: Colors.light.error, textAlign: "center" }}>
                      {errorMessage}
                    </ThemedText>
                  </Animated.View>
                ) : null}
              </>
            )}
          </View>
        </ScrollView>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  content: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: Spacing.lg,
  },
  closeButton: {
    position: "absolute",
    top: Spacing.xl + 44,
    right: Spacing.lg,
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 10,
  },
  centerContent: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 400,
  },
  pulseRing: {
    position: "absolute",
    width: Spacing.micButtonSize + 40,
    height: Spacing.micButtonSize + 40,
    borderRadius: (Spacing.micButtonSize + 40) / 2,
    backgroundColor: Colors.light.accent,
  },
  micButton: {
    width: Spacing.micButtonSize,
    height: Spacing.micButtonSize,
    borderRadius: Spacing.micButtonSize / 2,
    alignItems: "center",
    justifyContent: "center",
  },
  permissionContainer: {
    alignItems: "center",
    paddingHorizontal: Spacing.xl,
  },
  permissionButton: {
    marginTop: Spacing.xl,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  processingContainer: {
    alignItems: "center",
  },
  resultsContainer: {
    width: "100%",
    alignItems: "center",
  },
  queryBubble: {
    width: "100%",
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.md,
  },
  responseBubble: {
    width: "100%",
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.lg,
  },
  matchedNotesContainer: {
    width: "100%",
    marginBottom: Spacing.lg,
  },
  askAgainButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
  },
  errorContainer: {
    marginTop: Spacing.lg,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    maxWidth: "90%",
  },
});
