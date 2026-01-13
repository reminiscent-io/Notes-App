import React, { useEffect } from "react";
import { View, StyleSheet, Pressable } from "react-native";
import { Feather } from "@expo/vector-icons";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
  withSequence,
  withSpring,
  withDelay,
  interpolate,
  Easing,
  cancelAnimation,
} from "react-native-reanimated";
import { Colors, Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/useTheme";

interface AnimatedOrbProps {
  onPress: () => void;
  onPressIn?: () => void;
  onPressOut?: () => void;
  isRecording?: boolean;
  size?: number;
  testID?: string;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function AnimatedOrb({
  onPress,
  onPressIn,
  onPressOut,
  isRecording = false,
  size = 80,
  testID,
}: AnimatedOrbProps) {
  const { isDark } = useTheme();

  const ring1Scale = useSharedValue(1);
  const ring2Scale = useSharedValue(1);
  const ring3Scale = useSharedValue(1);
  const coreGlow = useSharedValue(0.6);
  const rotation = useSharedValue(0);
  const pulseOpacity = useSharedValue(0);
  const buttonScale = useSharedValue(1);

  const baseColor = isDark ? Colors.dark.accent : Colors.light.primary;
  const glowColor = isDark ? "#00D4FF" : "#0066FF";

  useEffect(() => {
    ring1Scale.value = withRepeat(
      withSequence(
        withTiming(1.15, { duration: 2000, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: 2000, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );

    ring2Scale.value = withDelay(
      300,
      withRepeat(
        withSequence(
          withTiming(1.2, { duration: 2500, easing: Easing.inOut(Easing.ease) }),
          withTiming(1, { duration: 2500, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        true
      )
    );

    ring3Scale.value = withDelay(
      600,
      withRepeat(
        withSequence(
          withTiming(1.25, { duration: 3000, easing: Easing.inOut(Easing.ease) }),
          withTiming(1, { duration: 3000, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        true
      )
    );

    coreGlow.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
        withTiming(0.6, { duration: 1500, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );

    rotation.value = withRepeat(
      withTiming(360, { duration: 20000, easing: Easing.linear }),
      -1,
      false
    );

    return () => {
      cancelAnimation(ring1Scale);
      cancelAnimation(ring2Scale);
      cancelAnimation(ring3Scale);
      cancelAnimation(coreGlow);
      cancelAnimation(rotation);
    };
  }, []);

  useEffect(() => {
    if (isRecording) {
      pulseOpacity.value = withRepeat(
        withSequence(
          withTiming(0.8, { duration: 400, easing: Easing.out(Easing.ease) }),
          withTiming(0.2, { duration: 400, easing: Easing.in(Easing.ease) })
        ),
        -1,
        true
      );
    } else {
      cancelAnimation(pulseOpacity);
      pulseOpacity.value = withTiming(0, { duration: 200 });
    }
  }, [isRecording]);

  const ring1Style = useAnimatedStyle(() => ({
    transform: [{ scale: ring1Scale.value }, { rotate: `${rotation.value}deg` }],
    opacity: interpolate(ring1Scale.value, [1, 1.15], [0.3, 0.15]),
  }));

  const ring2Style = useAnimatedStyle(() => ({
    transform: [{ scale: ring2Scale.value }, { rotate: `${-rotation.value * 0.5}deg` }],
    opacity: interpolate(ring2Scale.value, [1, 1.2], [0.25, 0.1]),
  }));

  const ring3Style = useAnimatedStyle(() => ({
    transform: [{ scale: ring3Scale.value }, { rotate: `${rotation.value * 0.3}deg` }],
    opacity: interpolate(ring3Scale.value, [1, 1.25], [0.2, 0.05]),
  }));

  const coreStyle = useAnimatedStyle(() => ({
    shadowOpacity: coreGlow.value,
    transform: [{ scale: buttonScale.value }],
  }));

  const recordingPulseStyle = useAnimatedStyle(() => ({
    opacity: pulseOpacity.value,
    transform: [{ scale: interpolate(pulseOpacity.value, [0.2, 0.8], [1, 1.5]) }],
  }));

  const handlePressIn = () => {
    buttonScale.value = withSpring(0.92, { damping: 15, stiffness: 300 });
    onPressIn?.();
  };

  const handlePressOut = () => {
    buttonScale.value = withSpring(1, { damping: 15, stiffness: 300 });
    onPressOut?.();
  };

  return (
    <View style={[styles.container, { width: size * 1.8, height: size * 1.8 }]}>
      <Animated.View
        style={[
          styles.ring,
          ring3Style,
          {
            width: size * 1.6,
            height: size * 1.6,
            borderRadius: size * 0.8,
            borderColor: glowColor,
          },
        ]}
      />
      <Animated.View
        style={[
          styles.ring,
          ring2Style,
          {
            width: size * 1.4,
            height: size * 1.4,
            borderRadius: size * 0.7,
            borderColor: glowColor,
          },
        ]}
      />
      <Animated.View
        style={[
          styles.ring,
          ring1Style,
          {
            width: size * 1.2,
            height: size * 1.2,
            borderRadius: size * 0.6,
            borderColor: glowColor,
          },
        ]}
      />

      {isRecording ? (
        <Animated.View
          style={[
            styles.recordingPulse,
            recordingPulseStyle,
            {
              width: size,
              height: size,
              borderRadius: size / 2,
              backgroundColor: "#FF3B30",
            },
          ]}
        />
      ) : null}

      <AnimatedPressable
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        testID={testID}
        style={[
          styles.core,
          coreStyle,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: isRecording ? "#FF3B30" : baseColor,
            shadowColor: isRecording ? "#FF3B30" : glowColor,
          },
        ]}
      >
        <View style={styles.innerGlow}>
          <Feather
            name={isRecording ? "square" : "mic"}
            size={size * 0.4}
            color="#FFFFFF"
          />
        </View>
      </AnimatedPressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
  },
  ring: {
    position: "absolute",
    borderWidth: 1.5,
    borderStyle: "dashed",
  },
  core: {
    alignItems: "center",
    justifyContent: "center",
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 20,
    elevation: 10,
  },
  innerGlow: {
    alignItems: "center",
    justifyContent: "center",
  },
  recordingPulse: {
    position: "absolute",
  },
});
