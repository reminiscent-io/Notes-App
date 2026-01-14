import React, { useState, useEffect } from "react";
import {
  View,
  StyleSheet,
  Pressable,
  Platform,
  ActivityIndicator,
  Linking,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
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
import { useAudioRecorder, AudioModule, setAudioModeAsync, RecordingPresets, type RecordingOptions } from "expo-audio";
import * as FileSystem from "expo-file-system/legacy";

import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, Colors, BorderRadius } from "@/constants/theme";
import { useNotes } from "@/hooks/useNotes";
import { useCustomSections } from "@/hooks/useCustomSections";
import { transcribeAndProcess } from "@/lib/api";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const VOICE_RECORDING_OPTIONS: RecordingOptions = {
  ...RecordingPresets.HIGH_QUALITY,
  numberOfChannels: 1,
  sampleRate: 16000,
  bitRate: 32000,
};

interface PermissionStatus {
  granted: boolean;
  canAskAgain: boolean;
}

export default function RecordingModal() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { theme, isDark } = useTheme();
  const { addNote } = useNotes();
  const { sections } = useCustomSections();

  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [transcribedText, setTranscribedText] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [permissionStatus, setPermissionStatus] = useState<PermissionStatus | null>(null);

  const audioRecorder = useAudioRecorder(VOICE_RECORDING_OPTIONS);
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
      setTranscribedText("");
      
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
      
      // Immediately switch to processing state for instant UI feedback
      setIsRecording(false);
      setIsProcessing(true);
      
      // Let React render the processing indicator before doing heavy work
      await new Promise(resolve => setTimeout(resolve, 50));
      
      await audioRecorder.stop();

      const cacheUri = audioRecorder.uri;
      console.log("Recording stopped, URI:", cacheUri);

      if (!cacheUri) {
        setErrorMessage("Recording failed. Please try again.");
        setIsProcessing(false);
        return;
      }

      // Try to copy to Documents immediately (cache files are very temporary)
      try {
        const recordingsDir = FileSystem.documentDirectory + "recordings/";
        await FileSystem.makeDirectoryAsync(recordingsDir, { intermediates: true });
        persistedUri = recordingsDir + `recording_${Date.now()}.m4a`;
        await FileSystem.copyAsync({ from: cacheUri, to: persistedUri });
        console.log("Recording copied to:", persistedUri);
      } catch (copyError) {
        console.log("Copy failed:", copyError);
        persistedUri = cacheUri;
      }

      // Upload and process immediately
      const result = await transcribeAndProcess(persistedUri, sections);
      
      // Show combined transcription
      const combinedText = result.notes.map(n => n.rawText).join(" | ");
      setTranscribedText(combinedText);

      // Create all parsed notes
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

      setTimeout(() => {
        navigation.goBack();
      }, 1000);

      setIsProcessing(false);
    } catch (error: any) {
      console.error("Failed to process recording:", error);
      setTranscribedText("");
      setErrorMessage(error.message || "Failed to process. Please try again.");
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
          <Pressable style={styles.closeButton} onPress={handleClose}>
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
                ? "Voice Notes needs access to your microphone to record notes."
                : "Microphone access was denied. Please enable it in Settings to use voice recording."}
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
        <Pressable style={styles.closeButton} onPress={handleClose}>
          <Feather name="x" size={24} color="#FFFFFF" />
        </Pressable>

        <View style={styles.centerContent}>
          {isProcessing ? (
            <View style={styles.processingContainer}>
              <ActivityIndicator size="large" color={Colors.light.accent} />
              <ThemedText
                type="body"
                style={{ color: "#FFFFFF", marginTop: Spacing.lg }}
              >
                Processing...
              </ThemedText>
            </View>
          ) : (
            <>
              <Animated.View style={[styles.pulseRing, pulseStyle, { opacity: isRecording ? 0.3 : 0 }]} />
              <AnimatedPressable
                onPress={handleMicPress}
                onPressIn={handleMicPressIn}
                onPressOut={handleMicPressOut}
                style={[
                  styles.micButton,
                  micAnimatedStyle,
                  {
                    backgroundColor: isRecording
                      ? Colors.light.accent
                      : isDark
                      ? Colors.dark.primary
                      : Colors.light.primary,
                  },
                ]}
                testID="button-recording-mic"
              >
                <Feather
                  name={isRecording ? "square" : "mic"}
                  size={48}
                  color="#FFFFFF"
                />
              </AnimatedPressable>

              <ThemedText
                type="body"
                style={{ color: "rgba(255,255,255,0.8)", marginTop: Spacing.xl }}
              >
                {isRecording ? "Tap to stop" : "Tap to record"}
              </ThemedText>
            </>
          )}

          {transcribedText ? (
            <Animated.View
              entering={FadeIn}
              style={[styles.transcriptionContainer, { backgroundColor: "rgba(255,255,255,0.1)" }]}
            >
              <ThemedText type="body" style={{ color: "#FFFFFF", textAlign: "center" }}>
                {transcribedText}
              </ThemedText>
            </Animated.View>
          ) : null}

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
        </View>
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
    justifyContent: "center",
    alignItems: "center",
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
  },
  centerContent: {
    alignItems: "center",
    justifyContent: "center",
  },
  pulseRing: {
    position: "absolute",
    width: Spacing.micButtonLarge + 40,
    height: Spacing.micButtonLarge + 40,
    borderRadius: (Spacing.micButtonLarge + 40) / 2,
    backgroundColor: Colors.light.accent,
  },
  micButton: {
    width: Spacing.micButtonLarge,
    height: Spacing.micButtonLarge,
    borderRadius: Spacing.micButtonLarge / 2,
    alignItems: "center",
    justifyContent: "center",
  },
  transcriptionContainer: {
    marginTop: Spacing.xl,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    maxWidth: "90%",
  },
  errorContainer: {
    marginTop: Spacing.lg,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    maxWidth: "90%",
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
});
