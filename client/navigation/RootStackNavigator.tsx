import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import MainFeedScreen from "@/screens/MainFeedScreen";
import RecordingModal from "@/screens/RecordingModal";
import QueryModal from "@/screens/QueryModal";
import { useScreenOptions } from "@/hooks/useScreenOptions";
import { HeaderTitle } from "@/components/HeaderTitle";

export type RootStackParamList = {
  MainFeed: undefined;
  Recording: undefined;
  Query: undefined;
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
    </Stack.Navigator>
  );
}
