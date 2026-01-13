import React, { useState } from "react";
import {
  View,
  StyleSheet,
  TextInput,
  Pressable,
  ScrollView,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import Animated, { FadeIn, FadeOut } from "react-native-reanimated";
import { BlurView } from "expo-blur";

import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius, Colors } from "@/constants/theme";
import { useNotes, Note } from "@/hooks/useNotes";
import { RootStackParamList } from "@/navigation/RootStackNavigator";

type EditNoteRouteProp = RouteProp<RootStackParamList, "EditNote">;

const CATEGORIES: { value: Note["category"]; label: string; icon: keyof typeof Feather.glyphMap }[] = [
  { value: "today", label: "Today", icon: "calendar" },
  { value: "tomorrow", label: "Tomorrow", icon: "sunrise" },
  { value: "idea", label: "Idea", icon: "zap" },
  { value: "shopping", label: "Shopping", icon: "shopping-cart" },
  { value: "other", label: "Other", icon: "file-text" },
];

export default function EditNoteModal() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const route = useRoute<EditNoteRouteProp>();
  const { theme, isDark } = useTheme();
  const { updateNote, deleteNote } = useNotes();

  const { note } = route.params;

  const [title, setTitle] = useState(note.title);
  const [rawText, setRawText] = useState(note.rawText);
  const [category, setCategory] = useState<Note["category"]>(note.category);

  const handleSave = async () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    await updateNote(note.id, {
      title: title.trim() || note.title,
      rawText: rawText.trim() || note.rawText,
      category,
    });
    navigation.goBack();
  };

  const handleDelete = async () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    await deleteNote(note.id);
    navigation.goBack();
  };

  const handleClose = () => {
    navigation.goBack();
  };

  return (
    <View style={styles.container}>
      <Pressable style={StyleSheet.absoluteFill} onPress={handleClose}>
        <BlurView
          intensity={isDark ? 40 : 60}
          tint={isDark ? "dark" : "light"}
          style={StyleSheet.absoluteFill}
        />
      </Pressable>

      <Animated.View
        entering={FadeIn.duration(200)}
        exiting={FadeOut.duration(150)}
        style={[
          styles.modal,
          {
            backgroundColor: theme.backgroundDefault,
            marginTop: insets.top + 60,
            marginBottom: insets.bottom + 20,
          },
        ]}
      >
        <View style={styles.header}>
          <ThemedText type="subtitle">Edit Note</ThemedText>
          <Pressable onPress={handleClose} hitSlop={16}>
            <Feather name="x" size={24} color={theme.textPrimary} />
          </Pressable>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          <ThemedText type="caption" style={[styles.label, { color: theme.textSecondary }]}>
            Title
          </ThemedText>
          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: theme.backgroundSubtle,
                color: theme.textPrimary,
                borderColor: theme.border,
              },
            ]}
            value={title}
            onChangeText={setTitle}
            placeholder="Note title"
            placeholderTextColor={theme.textTertiary}
            autoCapitalize="sentences"
          />

          <ThemedText type="caption" style={[styles.label, { color: theme.textSecondary }]}>
            Full Text
          </ThemedText>
          <TextInput
            style={[
              styles.input,
              styles.textArea,
              {
                backgroundColor: theme.backgroundSubtle,
                color: theme.textPrimary,
                borderColor: theme.border,
              },
            ]}
            value={rawText}
            onChangeText={setRawText}
            placeholder="Note content"
            placeholderTextColor={theme.textTertiary}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />

          <ThemedText type="caption" style={[styles.label, { color: theme.textSecondary }]}>
            Category
          </ThemedText>
          <View style={styles.categories}>
            {CATEGORIES.map((cat) => (
              <Pressable
                key={cat.value}
                onPress={() => setCategory(cat.value)}
                style={[
                  styles.categoryButton,
                  {
                    backgroundColor:
                      category === cat.value
                        ? Colors.light.accent
                        : theme.backgroundSubtle,
                    borderColor:
                      category === cat.value
                        ? Colors.light.accent
                        : theme.border,
                  },
                ]}
              >
                <Feather
                  name={cat.icon}
                  size={16}
                  color={category === cat.value ? "#FFFFFF" : theme.textSecondary}
                />
                <ThemedText
                  type="caption"
                  style={{
                    color: category === cat.value ? "#FFFFFF" : theme.textSecondary,
                    marginLeft: 4,
                  }}
                >
                  {cat.label}
                </ThemedText>
              </Pressable>
            ))}
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <Pressable
            onPress={handleDelete}
            style={[styles.deleteButton, { borderColor: Colors.light.error }]}
          >
            <Feather name="trash-2" size={18} color={Colors.light.error} />
            <ThemedText type="body" style={{ color: Colors.light.error, marginLeft: 8 }}>
              Delete
            </ThemedText>
          </Pressable>

          <Pressable
            onPress={handleSave}
            style={[styles.saveButton, { backgroundColor: Colors.light.accent }]}
          >
            <Feather name="check" size={18} color="#FFFFFF" />
            <ThemedText type="body" style={{ color: "#FFFFFF", marginLeft: 8 }}>
              Save
            </ThemedText>
          </Pressable>
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "flex-start",
  },
  modal: {
    marginHorizontal: Spacing.md,
    borderRadius: BorderRadius.lg,
    maxHeight: "80%",
    overflow: "hidden",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: Spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(0,0,0,0.1)",
  },
  content: {
    padding: Spacing.md,
  },
  label: {
    marginBottom: Spacing.xs,
    marginTop: Spacing.sm,
  },
  input: {
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    padding: Spacing.sm,
    fontSize: 16,
  },
  textArea: {
    minHeight: 100,
    paddingTop: Spacing.sm,
  },
  categories: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.xs,
    marginTop: Spacing.xs,
  },
  categoryButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
  },
  footer: {
    flexDirection: "row",
    padding: Spacing.md,
    gap: Spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "rgba(0,0,0,0.1)",
  },
  deleteButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
  },
  saveButton: {
    flex: 2,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.sm,
  },
});
