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
import { Spacing, BorderRadius } from "@/constants/theme";
import { useCustomSections, CustomSection } from "@/hooks/useCustomSections";
import { useNotes } from "@/hooks/useNotes";
import { SectionHeader } from "@/components/SectionHeader";
import { RootStackParamList } from "@/navigation/RootStackNavigator";

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function SettingsScreen() {
  const headerHeight = useHeaderHeight();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavigationProp>();
  const { theme } = useTheme();
  const { sections, deleteSection } = useCustomSections();
  const { notes } = useNotes();

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
            onPress: () => deleteSection(section.id),
          },
        ]
      );
    },
    [deleteSection]
  );

  const handleArchivedPress = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    navigation.navigate("ArchivedNotes");
  }, [navigation]);

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
          entering={FadeInUp.delay(150).duration(300)}
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
