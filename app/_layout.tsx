import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import 'react-native-reanimated';

import { initializeNotifications } from '@/app/src/services/notifications';
import { initializeStorage } from '@/app/src/storage/secureStorage';
import { requestAllPermissions } from '@/app/src/utils/permissions';
import { useColorScheme } from '@/hooks/useColorScheme';

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [loaded] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });

  useEffect(() => {
    // Initialize app services on startup
    const initializeApp = async () => {
      try {
        console.log('Initializing Home Security Hub...');
        
        // Request all necessary permissions
        const permissions = await requestAllPermissions();
        console.log('Permissions granted:', permissions);
        
        // Initialize secure storage
        const storageInitialized = await initializeStorage();
        console.log('Storage initialized:', storageInitialized);
        
        // Initialize notifications
        const notificationsInitialized = await initializeNotifications();
        console.log('Notifications initialized:', notificationsInitialized);
        
        console.log('App initialization complete');
      } catch (error) {
        console.error('App initialization failed:', error);
      }
    };

    if (loaded) {
      initializeApp();
    }
  }, [loaded]);

  if (!loaded) {
    // Async font loading only occurs in development.
    return null;
  }

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="+not-found" />
      </Stack>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}
