import React, { useEffect, useRef } from "react";
import { StyleSheet } from "react-native";
import { NavigationContainer, NavigationContainerRef } from "@react-navigation/native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import * as Notifications from "expo-notifications";

import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/lib/query-client";

import RootStackNavigator, { RootStackParamList } from "@/navigation/RootStackNavigator";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { NotesProvider } from "@/hooks/useNotes";
import { CustomSectionsProvider } from "@/hooks/useCustomSections";

export default function App() {
  const navigationRef = useRef<NavigationContainerRef<RootStackParamList>>(null);

  useEffect(() => {
    const responseSubscription = Notifications.addNotificationResponseReceivedListener((response) => {
      const noteId = response.notification.request.content.data?.noteId;
      if (noteId && navigationRef.current) {
        navigationRef.current.navigate("MainFeed");
      }
    });

    return () => {
      responseSubscription.remove();
    };
  }, []);

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <NotesProvider>
          <CustomSectionsProvider>
            <SafeAreaProvider>
              <GestureHandlerRootView style={styles.root}>
                <KeyboardProvider>
                  <NavigationContainer ref={navigationRef}>
                    <RootStackNavigator />
                  </NavigationContainer>
                  <StatusBar style="auto" />
                </KeyboardProvider>
              </GestureHandlerRootView>
            </SafeAreaProvider>
          </CustomSectionsProvider>
        </NotesProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});
