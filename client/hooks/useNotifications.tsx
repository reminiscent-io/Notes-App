import { useCallback } from "react";
import { Platform, Linking } from "react-native";
import * as Notifications from "expo-notifications";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Note } from "./useNotes";

const NOTIFICATION_IDS_KEY = "@voice_notes_notification_ids";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

interface NotificationIdMap {
  [noteId: string]: string;
}

async function getNotificationIdMap(): Promise<NotificationIdMap> {
  try {
    const stored = await AsyncStorage.getItem(NOTIFICATION_IDS_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch {
    return {};
  }
}

async function saveNotificationIdMap(map: NotificationIdMap): Promise<void> {
  try {
    await AsyncStorage.setItem(NOTIFICATION_IDS_KEY, JSON.stringify(map));
  } catch (error) {
    console.error("Failed to save notification ID map:", error);
  }
}

function calculateTriggerDate(note: Note): Date | null {
  const now = new Date();

  if (note.dueDate) {
    const dueDate = new Date(note.dueDate);
    const triggerDate = new Date(dueDate.getTime() - 15 * 60 * 1000);
    if (triggerDate > now) {
      return triggerDate;
    }
    return null;
  }

  switch (note.category) {
    case "today": {
      const sixPM = new Date(now);
      sixPM.setHours(18, 0, 0, 0);
      if (now < sixPM) {
        return sixPM;
      }
      return new Date(now.getTime() + 60 * 60 * 1000);
    }

    case "tomorrow": {
      const tomorrow9AM = new Date(now);
      tomorrow9AM.setDate(tomorrow9AM.getDate() + 1);
      tomorrow9AM.setHours(9, 0, 0, 0);
      return tomorrow9AM;
    }

    case "shopping": {
      const nextDay10AM = new Date(now);
      nextDay10AM.setDate(nextDay10AM.getDate() + 1);
      nextDay10AM.setHours(10, 0, 0, 0);
      return nextDay10AM;
    }

    case "idea":
    case "other":
    default:
      return null;
  }
}

function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength - 3) + "...";
}

export function useNotifications() {
  const checkPermissionStatus = useCallback(async (): Promise<{
    granted: boolean;
    canAskAgain: boolean;
  }> => {
    const { status, canAskAgain } = await Notifications.getPermissionsAsync();
    return {
      granted: status === "granted",
      canAskAgain: canAskAgain ?? true,
    };
  }, []);

  const requestPermissions = useCallback(async (): Promise<boolean> => {
    const { status, canAskAgain } = await Notifications.getPermissionsAsync();

    if (status === "granted") {
      return true;
    }

    if (status === "denied" && !canAskAgain) {
      if (Platform.OS !== "web") {
        try {
          await Linking.openSettings();
        } catch (error) {
          console.error("Failed to open settings:", error);
        }
      }
      return false;
    }

    const { status: newStatus } = await Notifications.requestPermissionsAsync();
    return newStatus === "granted";
  }, []);

  const scheduleNoteReminder = useCallback(
    async (note: Note): Promise<boolean> => {
      const permissionGranted = await requestPermissions();
      if (!permissionGranted) {
        return false;
      }

      const triggerDate = calculateTriggerDate(note);
      if (!triggerDate) {
        return false;
      }

      try {
        const existingMap = await getNotificationIdMap();
        if (existingMap[note.id]) {
          await Notifications.cancelScheduledNotificationAsync(existingMap[note.id]);
        }

        const notificationId = await Notifications.scheduleNotificationAsync({
          content: {
            title: note.title,
            body: truncateText(note.rawText, 100),
            categoryIdentifier: note.category,
            data: { noteId: note.id },
          },
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.DATE,
            date: triggerDate,
          },
        });

        existingMap[note.id] = notificationId;
        await saveNotificationIdMap(existingMap);

        return true;
      } catch (error) {
        console.error("Failed to schedule notification:", error);
        return false;
      }
    },
    [requestPermissions]
  );

  const cancelNoteReminder = useCallback(async (noteId: string): Promise<boolean> => {
    try {
      const existingMap = await getNotificationIdMap();
      const notificationId = existingMap[noteId];

      if (notificationId) {
        await Notifications.cancelScheduledNotificationAsync(notificationId);
        delete existingMap[noteId];
        await saveNotificationIdMap(existingMap);
      }

      return true;
    } catch (error) {
      console.error("Failed to cancel notification:", error);
      return false;
    }
  }, []);

  return {
    requestPermissions,
    scheduleNoteReminder,
    cancelNoteReminder,
    checkPermissionStatus,
  };
}
