import { useSyncExternalStore } from 'react';
import { useColorScheme as useReactNativeColorScheme } from 'react-native';

/**
 * React Native Web can render the application before the browser has hydrated.
 *
 * useSyncExternalStore lets us return a predictable light theme during static
 * rendering and then use the browser's actual color scheme after hydration.
 */
const subscribeToHydration = () => () => undefined;

export function useColorScheme() {
  const hasHydrated = useSyncExternalStore(
    subscribeToHydration,
    () => true,
    () => false
  );

  const colorScheme = useReactNativeColorScheme();

  return hasHydrated ? colorScheme : 'light';
}