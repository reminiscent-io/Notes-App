import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import MainFeedScreen from "@/screens/MainFeedScreen";
import RecordingModal from "@/screens/RecordingModal";
import QueryModal from "@/screens/QueryModal";
import SettingsScreen from "@/screens/SettingsScreen";
import ArchivedNotesScreen from "@/screens/ArchivedNotesScreen";
import EditNoteModal from "@/screens/EditNoteModal";
import { useScreenOptions } from "@/hooks/useScreenOptions";
import { HeaderTitle } from "@/components/HeaderTitle";
import { Note } from "@/hooks/useNotes";

export type RootStackParamList = {
  MainFeed: undefined;
  Recording: undefined;
  Query: undefined;
  Settings: undefined;
  ArchivedNotes: undefined;
  EditNote: { note: Note };
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function RootStackNavigator() {
  const screenOptions = useScreenOptions();

  return (
    <Stack.Navigator screenOptions={screenOptions}>
      <Stack.Screen
        name="MainFeed"
        component={MainFeedScreen}
        options={{
          headerTitle: () => <HeaderTitle />,
        }}
      />
      <Stack.Screen
        name="Recording"
        component={RecordingModal}
        options={{
          presentation: "transparentModal",
          headerShown: false,
          animation: "fade",
        }}
      />
      <Stack.Screen
        name="Query"
        component={QueryModal}
        options={{
          presentation: "transparentModal",
          headerShown: false,
          animation: "fade",
        }}
      />
      <Stack.Screen
        name="Settings"
        component={SettingsScreen}
        options={{
          headerTitle: "Settings",
        }}
      />
      <Stack.Screen
        name="ArchivedNotes"
        component={ArchivedNotesScreen}
        options={{
          headerTitle: "Archived Notes",
        }}
      />
      <Stack.Screen
        name="EditNote"
        component={EditNoteModal}
        options={{
          presentation: "transparentModal",
          headerShown: false,
          animation: "fade",
        }}
      />
    </Stack.Navigator>
  );
}
