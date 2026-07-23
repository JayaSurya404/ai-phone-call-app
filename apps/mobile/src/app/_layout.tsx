import {
  DarkTheme,
  ThemeProvider,
} from '@react-navigation/native';

import {
  QueryClient,
  QueryClientProvider,
} from '@tanstack/react-query';

import {
  Stack,
} from 'expo-router';

import {
  StatusBar,
} from 'expo-status-bar';

import {
  useState,
} from 'react';

import {
  GestureHandlerRootView,
} from 'react-native-gesture-handler';

const navigationTheme = {
  ...DarkTheme,

  colors: {
    ...DarkTheme.colors,
    primary: '#8B5CF6',
    background: '#070A12',
    card: '#0D1321',
    text: '#F8FAFC',
    border: '#1E293B',
    notification: '#F97316',
  },
};

export default function RootLayout() {
  const [
    queryClient,
  ] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            retry: 1,
            staleTime: 4_000,
            refetchOnReconnect: true,
          },

          mutations: {
            retry: 0,
          },
        },
      })
  );

  return (
    <GestureHandlerRootView
      style={{
        flex: 1,
      }}
    >
      <QueryClientProvider
        client={queryClient}
      >
        <ThemeProvider
          value={navigationTheme}
        >
          <StatusBar
            style="light"
          />

          <Stack
            screenOptions={{
              headerShown: false,
              contentStyle: {
                backgroundColor:
                  '#070A12',
              },
              animation:
                'slide_from_right',
            }}
          >
            <Stack.Screen
              name="index"
            />

            <Stack.Screen
              name="call-monitor/[id]"
            />
          </Stack>
        </ThemeProvider>
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}