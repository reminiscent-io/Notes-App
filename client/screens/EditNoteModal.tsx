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
import DateTimePicker from "@react-native-community/datetimepicker";

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
  const [dueDate, setDueDate] = useState<Date | null>(
    note.dueDate ? new Date(note.dueDate) : null
  );
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);

  const handleSave = async () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    await updateNote(note.id, {
      title: title.trim() || note.title,
      rawText: rawText.trim() || note.rawText,
      category,
      dueDate: dueDate ? dueDate.toISOString() : null,
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

  const handleDateChange = (_event: any, selectedDate?: Date) => {
    if (Platform.OS === "android") {
      setShowDatePicker(false);
    }
    if (selectedDate) {
      const newDate = dueDate ? new Date(dueDate) : new Date();
      newDate.setFullYear(selectedDate.getFullYear());
      newDate.setMonth(selectedDate.getMonth());
      newDate.setDate(selectedDate.getDate());
      setDueDate(newDate);
      if (Platform.OS === "android") {
        setShowTimePicker(true);
      }
    }
  };

  const handleTimeChange = (_event: any, selectedTime?: Date) => {
    if (Platform.OS === "android") {
      setShowTimePicker(false);
    }
    if (selectedTime) {
      const newDate = dueDate ? new Date(dueDate) : new Date();
      newDate.setHours(selectedTime.getHours());
      newDate.setMinutes(selectedTime.getMinutes());
      setDueDate(newDate);
    }
  };

  const handleClearDate = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setDueDate(null);
  };

  const handleSetDate = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (!dueDate) {
      setDueDate(new Date());
    }
    setShowDatePicker(true);
  };

  const formatDateTime = (date: Date) => {
    return date.toLocaleString([], {
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
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
          <ThemedText type="title3">Edit Note</ThemedText>
          <Pressable onPress={handleClose} hitSlop={16}>
            <Feather name="x" size={24} color={theme.text} />
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
                backgroundColor: theme.backgroundSecondary,
                color: theme.text,
                borderColor: theme.textTertiary,
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
                backgroundColor: theme.backgroundSecondary,
                color: theme.text,
                borderColor: theme.textTertiary,
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
                        : theme.backgroundSecondary,
                    borderColor:
                      category === cat.value
                        ? Colors.light.accent
                        : theme.textTertiary,
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

          <ThemedText type="caption" style={[styles.label, { color: theme.textSecondary }]}>
            Due Date & Time
          </ThemedText>
          <View style={styles.dateTimeRow}>
            <Pressable
              onPress={handleSetDate}
              style={[
                styles.dateButton,
                {
                  backgroundColor: theme.backgroundSecondary,
                  borderColor: theme.textTertiary,
                  flex: 1,
                },
              ]}
            >
              <Feather name="clock" size={16} color={theme.textSecondary} />
              <ThemedText
                type="body"
                style={{ color: dueDate ? theme.text : theme.textTertiary, marginLeft: 8 }}
              >
                {dueDate ? formatDateTime(dueDate) : "No due date"}
              </ThemedText>
            </Pressable>
            {dueDate ? (
              <Pressable
                onPress={handleClearDate}
                style={[styles.clearButton, { backgroundColor: theme.backgroundSecondary }]}
              >
                <Feather name="x" size={18} color={theme.textSecondary} />
              </Pressable>
            ) : null}
          </View>

          {Platform.OS === "ios" && (showDatePicker || showTimePicker) ? (
            <View style={styles.pickerContainer}>
              <DateTimePicker
                value={dueDate || new Date()}
                mode="datetime"
                display="spinner"
                onChange={(_e: any, date?: Date) => {
                  if (date) setDueDate(date);
                }}
                textColor={theme.text}
              />
              <Pressable
                onPress={() => {
                  setShowDatePicker(false);
                  setShowTimePicker(false);
                }}
                style={[styles.doneButton, { backgroundColor: Colors.light.accent }]}
              >
                <ThemedText type="body" style={{ color: "#FFFFFF" }}>
                  Done
                </ThemedText>
              </Pressable>
            </View>
          ) : null}

          {Platform.OS === "android" && showDatePicker ? (
            <DateTimePicker
              value={dueDate || new Date()}
              mode="date"
              display="default"
              onChange={handleDateChange}
            />
          ) : null}

          {Platform.OS === "android" && showTimePicker ? (
            <DateTimePicker
              value={dueDate || new Date()}
              mode="time"
              display="default"
              onChange={handleTimeChange}
            />
          ) : null}
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
    maxHeight: "85%",
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
  dateTimeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    marginTop: Spacing.xs,
  },
  dateButton: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.sm,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
  },
  clearButton: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.sm,
    alignItems: "center",
    justifyContent: "center",
  },
  pickerContainer: {
    marginTop: Spacing.sm,
    alignItems: "center",
  },
  doneButton: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.sm,
    marginTop: Spacing.sm,
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
