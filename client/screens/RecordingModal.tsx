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
import { useAudioRecorder, AudioModule, setAudioModeAsync, RecordingPresets } from "expo-audio";
import * as FileSystem from "expo-file-system/legacy";

import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, Colors, BorderRadius } from "@/constants/theme";
import { useNotes } from "@/hooks/useNotes";
import { useCustomSections } from "@/hooks/useCustomSections";
import { transcribeAndProcess } from "@/lib/api";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

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
      
      await audioRecorder.record();
      setIsRecording(true);
    } catch (error: any) {
      console.error("Failed to start recording:", error);
      setErrorMessage("Could not start recording. Please try again.");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  };

  const stopRecording = async () => {
    let cacheUri: string | null = null;
    let persistedUri: string | null = null;

    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      await audioRecorder.stop();
      setIsRecording(false);
      setIsProcessing(true);

      cacheUri = audioRecorder.uri;
      console.log("Recording stopped, URI:", cacheUri);

      if (!cacheUri) {
        setErrorMessage("Recording failed. Please try again.");
        setIsProcessing(false);
        return;
      }

      // Wait for file to be fully written
      await new Promise(resolve => setTimeout(resolve, 300));

      // Verify cache file exists
      const cacheInfo = await FileSystem.getInfoAsync(cacheUri);
      if (!cacheInfo.exists) {
        console.error("Cache file missing after recording");
        setErrorMessage("Recording file not found. Please try again.");
        setIsProcessing(false);
        return;
      }
      console.log("Cache file verified, size:", cacheInfo.size);

      // Copy to Documents for reliable upload
      const recordingsDir = FileSystem.documentDirectory + "recordings/";
      await FileSystem.makeDirectoryAsync(recordingsDir, { intermediates: true });
      persistedUri = recordingsDir + `recording_${Date.now()}.m4a`;

      await FileSystem.copyAsync({ from: cacheUri, to: persistedUri });

      // Verify persisted file exists
      const persistedInfo = await FileSystem.getInfoAsync(persistedUri);
      if (!persistedInfo.exists) {
        console.error("Failed to persist recording to Documents");
        persistedUri = cacheUri;
        cacheUri = null;
      } else {
        console.log("Recording persisted, size:", persistedInfo.size);
      }

      // Upload and process
      const result = await transcribeAndProcess(persistedUri, sections);
      setTranscribedText(result.rawText);

      await addNote({
        rawText: result.rawText,
        title: result.title,
        category: result.category,
        dueDate: result.dueDate,
        entities: result.entities,
        tags: result.tags,
      });

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
      // Clean up files AFTER upload is complete
      if (persistedUri) {
        try {
          await FileSystem.deleteAsync(persistedUri, { idempotent: true });
        } catch {}
      }
      if (cacheUri) {
        try {
          await FileSystem.deleteAsync(cacheUri, { idempotent: true });
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

  const handleClose = () => {
    if (isRecording) {
      audioRecorder.stop();
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
