import React, { useCallback } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  Pressable,
  Alert,
} from "react-native";
import { useHeaderHeight } from "@react-navigation/elements";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import Animated, { FadeInUp } from "react-native-reanimated";

import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius, Colors } from "@/constants/theme";
import { useCustomSections, CustomSection } from "@/hooks/useCustomSections";
import { useNotes } from "@/hooks/useNotes";
import { SectionHeader } from "@/components/SectionHeader";
import { useSettings, Settings } from "@/hooks/useSettings";
import { RootStackParamList } from "@/navigation/RootStackNavigator";

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const THEME_OPTIONS: { value: Settings["themeMode"]; label: string; icon: keyof typeof Feather.glyphMap }[] = [
  { value: "system", label: "System", icon: "smartphone" },
  { value: "light", label: "Light", icon: "sun" },
  { value: "dark", label: "Dark", icon: "moon" },
];

const REMINDER_HOURS = [6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22];
const LEAD_MINUTES = [5, 10, 15, 30, 60];

function formatHour(hour: number): string {
  const ampm = hour >= 12 ? "PM" : "AM";
  const h = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
  return `${h}:00 ${ampm}`;
}

function formatMinutes(mins: number): string {
  if (mins === 60) return "1 hour";
  return `${mins} min`;
}

export default function SettingsScreen() {
  const headerHeight = useHeaderHeight();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavigationProp>();
  const { theme } = useTheme();
  const { sections, deleteSection } = useCustomSections();
  const { notes, updateNoteTags } = useNotes();
  const { settings, updateSettings } = useSettings();

  const archivedNotes = notes.filter((n) => n.archivedAt);
  const archivedCount = archivedNotes.length;

  const handleDeleteSection = useCallback(
    (section: CustomSection) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      Alert.alert(
        "Delete Section",
        `Are you sure you want to delete "${section.name}"?`,
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Delete",
            style: "destructive",
            onPress: async () => {
              for (const note of notes) {
                if (note.tags?.includes(section.name)) {
                  const updatedTags = note.tags.filter((t) => t !== section.name);
                  await updateNoteTags(note.id, updatedTags);
                }
              }
              await deleteSection(section.id);
            },
          },
        ]
      );
    },
    [deleteSection, notes, updateNoteTags]
  );

  const handleArchivedPress = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    navigation.navigate("ArchivedNotes");
  }, [navigation]);

  const handleThemeChange = useCallback((mode: Settings["themeMode"]) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    updateSettings({ themeMode: mode });
  }, [updateSettings]);

  const handleTodayHourChange = useCallback(() => {
    const currentIndex = REMINDER_HOURS.indexOf(settings.todayReminderHour);
    const nextIndex = (currentIndex + 1) % REMINDER_HOURS.length;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    updateSettings({ todayReminderHour: REMINDER_HOURS[nextIndex] });
  }, [settings.todayReminderHour, updateSettings]);

  const handleTomorrowHourChange = useCallback(() => {
    const currentIndex = REMINDER_HOURS.indexOf(settings.tomorrowReminderHour);
    const nextIndex = (currentIndex + 1) % REMINDER_HOURS.length;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    updateSettings({ tomorrowReminderHour: REMINDER_HOURS[nextIndex] });
  }, [settings.tomorrowReminderHour, updateSettings]);

  const handleLeadTimeChange = useCallback(() => {
    const currentIndex = LEAD_MINUTES.indexOf(settings.reminderLeadMinutes);
    const nextIndex = (currentIndex + 1) % LEAD_MINUTES.length;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    updateSettings({ reminderLeadMinutes: LEAD_MINUTES[nextIndex] });
  }, [settings.reminderLeadMinutes, updateSettings]);

  const renderSectionItem = (section: CustomSection, index: number) => (
    <Animated.View
      key={section.id}
      entering={FadeInUp.delay(100 + index * 50).duration(300)}
    >
      <View
        style={[
          styles.sectionItem,
          { backgroundColor: theme.backgroundDefault },
        ]}
      >
        <View style={styles.sectionInfo}>
          <View
            style={[
              styles.iconContainer,
              { backgroundColor: theme.backgroundSecondary },
            ]}
          >
            <Feather
              name={section.icon as keyof typeof Feather.glyphMap}
              size={18}
              color={theme.text}
            />
          </View>
          <View style={styles.sectionDetails}>
            <ThemedText type="body" style={{ color: theme.text }}>
              {section.name}
            </ThemedText>
            <ThemedText type="caption" style={{ color: theme.textSecondary }}>
              {section.keywords.length} keyword{section.keywords.length !== 1 ? "s" : ""}
            </ThemedText>
          </View>
        </View>
        <Pressable
          onPress={() => handleDeleteSection(section)}
          style={({ pressed }) => [
            styles.deleteButton,
            { opacity: pressed ? 0.6 : 1 },
          ]}
          hitSlop={12}
          testID={`button-delete-section-${section.id}`}
        >
          <Feather name="trash-2" size={18} color={theme.error} />
        </Pressable>
      </View>
    </Animated.View>
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
      >
        <Animated.View
          entering={FadeInUp.delay(50).duration(300)}
          style={styles.section}
        >
          <SectionHeader title="APPEARANCE" icon="eye" />
          <View style={[styles.settingCard, { backgroundColor: theme.backgroundDefault }]}>
            <View style={styles.settingRow}>
              <View style={styles.settingLabel}>
                <Feather name="moon" size={18} color={theme.text} />
                <ThemedText type="body" style={{ color: theme.text, marginLeft: Spacing.sm }}>
                  Theme
                </ThemedText>
              </View>
              <View style={styles.themeButtons}>
                {THEME_OPTIONS.map((opt) => (
                  <Pressable
                    key={opt.value}
                    onPress={() => handleThemeChange(opt.value)}
                    style={[
                      styles.themeButton,
                      {
                        backgroundColor:
                          settings.themeMode === opt.value
                            ? Colors.light.accent
                            : theme.backgroundTertiary,
                        borderColor:
                          settings.themeMode === opt.value
                            ? Colors.light.accent
                            : theme.textTertiary,
                      },
                    ]}
                  >
                    <Feather
                      name={opt.icon}
                      size={14}
                      color={settings.themeMode === opt.value ? "#FFFFFF" : theme.textSecondary}
                    />
                  </Pressable>
                ))}
              </View>
            </View>
          </View>
        </Animated.View>

        <Animated.View
          entering={FadeInUp.delay(100).duration(300)}
          style={styles.section}
        >
          <SectionHeader title="NOTIFICATIONS" icon="bell" />
          <View style={[styles.settingCard, { backgroundColor: theme.backgroundDefault }]}>
            <Pressable onPress={handleTodayHourChange} style={styles.settingRow}>
              <View style={styles.settingLabel}>
                <Feather name="calendar" size={18} color={theme.text} />
                <ThemedText type="body" style={{ color: theme.text, marginLeft: Spacing.sm }}>
                  Today reminder
                </ThemedText>
              </View>
              <View style={styles.settingValue}>
                <ThemedText type="body" style={{ color: Colors.light.accent }}>
                  {formatHour(settings.todayReminderHour)}
                </ThemedText>
                <Feather name="chevron-right" size={16} color={theme.textTertiary} />
              </View>
            </Pressable>

            <View style={[styles.divider, { backgroundColor: theme.textTertiary }]} />

            <Pressable onPress={handleTomorrowHourChange} style={styles.settingRow}>
              <View style={styles.settingLabel}>
                <Feather name="sunrise" size={18} color={theme.text} />
                <ThemedText type="body" style={{ color: theme.text, marginLeft: Spacing.sm }}>
                  Tomorrow reminder
                </ThemedText>
              </View>
              <View style={styles.settingValue}>
                <ThemedText type="body" style={{ color: Colors.light.accent }}>
                  {formatHour(settings.tomorrowReminderHour)}
                </ThemedText>
                <Feather name="chevron-right" size={16} color={theme.textTertiary} />
              </View>
            </Pressable>

            <View style={[styles.divider, { backgroundColor: theme.textTertiary }]} />

            <Pressable onPress={handleLeadTimeChange} style={styles.settingRow}>
              <View style={styles.settingLabel}>
                <Feather name="clock" size={18} color={theme.text} />
                <ThemedText type="body" style={{ color: theme.text, marginLeft: Spacing.sm }}>
                  Remind before due
                </ThemedText>
              </View>
              <View style={styles.settingValue}>
                <ThemedText type="body" style={{ color: Colors.light.accent }}>
                  {formatMinutes(settings.reminderLeadMinutes)}
                </ThemedText>
                <Feather name="chevron-right" size={16} color={theme.textTertiary} />
              </View>
            </Pressable>
          </View>
        </Animated.View>

        <Animated.View
          entering={FadeInUp.delay(150).duration(300)}
          style={styles.section}
        >
          <SectionHeader title="CUSTOM SECTIONS" icon="folder" />
          {sections.length > 0 ? (
            <View style={styles.sectionsList}>
              {sections.map((section, index) => renderSectionItem(section, index))}
            </View>
          ) : (
            <View
              style={[
                styles.emptyCard,
                { backgroundColor: theme.backgroundDefault },
              ]}
            >
              <Feather name="folder-plus" size={32} color={theme.textTertiary} />
              <ThemedText
                type="caption"
                style={{ color: theme.textSecondary, textAlign: "center" }}
              >
                No custom sections yet.{"\n"}Create sections from the main screen.
              </ThemedText>
            </View>
          )}
        </Animated.View>

        <Animated.View
          entering={FadeInUp.delay(200).duration(300)}
          style={styles.section}
        >
          <SectionHeader title="ARCHIVED NOTES" icon="archive" />
          <Pressable
            onPress={handleArchivedPress}
            style={({ pressed }) => [
              styles.archivedCard,
              {
                backgroundColor: theme.backgroundDefault,
                opacity: pressed ? 0.7 : 1,
              },
            ]}
            testID="button-archived-notes"
          >
            <View style={styles.archivedContent}>
              <View
                style={[
                  styles.iconContainer,
                  { backgroundColor: theme.backgroundSecondary },
                ]}
              >
                <Feather name="archive" size={18} color={theme.text} />
              </View>
              <View style={styles.archivedDetails}>
                <ThemedText type="body" style={{ color: theme.text }}>
                  Archived Notes
                </ThemedText>
                <ThemedText type="caption" style={{ color: theme.textSecondary }}>
                  {archivedCount} note{archivedCount !== 1 ? "s" : ""}
                </ThemedText>
              </View>
            </View>
            <Feather name="chevron-right" size={20} color={theme.textSecondary} />
          </Pressable>
        </Animated.View>
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
    marginBottom: Spacing.xl,
  },
  settingCard: {
    borderRadius: BorderRadius.xs,
    overflow: "hidden",
  },
  settingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: Spacing.md,
  },
  settingLabel: {
    flexDirection: "row",
    alignItems: "center",
  },
  settingValue: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
  },
  themeButtons: {
    flexDirection: "row",
    gap: Spacing.xs,
  },
  themeButton: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginHorizontal: Spacing.md,
  },
  sectionsList: {
    gap: Spacing.sm,
  },
  sectionItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: Spacing.md,
    borderRadius: BorderRadius.xs,
  },
  sectionInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    flex: 1,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.xs,
    alignItems: "center",
    justifyContent: "center",
  },
  sectionDetails: {
    flex: 1,
    gap: 2,
  },
  deleteButton: {
    padding: Spacing.xs,
  },
  emptyCard: {
    padding: Spacing.xl,
    borderRadius: BorderRadius.xs,
    alignItems: "center",
    gap: Spacing.md,
  },
  archivedCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: Spacing.md,
    borderRadius: BorderRadius.xs,
  },
  archivedContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
  },
  archivedDetails: {
    gap: 2,
  },
});
