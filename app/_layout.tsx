import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import 'react-native-reanimated';

import { ErrorBoundary } from '@/app/src/components/ErrorBoundary';
import { initializeNotifications } from '@/app/src/services/notifications';
import { initializeStorage } from '@/app/src/storage/secureStorage';
import { logger } from '@/app/src/utils/logger';
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
        logger.info('Initializing Home Security Hub...');
        
        // Request all necessary permissions
        const permissions = await requestAllPermissions();
        logger.debug('Permissions granted:', permissions);
        
        // Initialize secure storage
        const storageInitialized = await initializeStorage();
        logger.debug('Storage initialized:', storageInitialized);
        
        // Initialize notifications
        const notificationsInitialized = await initializeNotifications();
        logger.debug('Notifications initialized:', notificationsInitialized);
        
        logger.info('App initialization complete');
      } catch (error) {
        logger.error('App initialization failed:', error);
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
    <ErrorBoundary>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <Stack>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="+not-found" />
        </Stack>
        <StatusBar style="auto" />
      </ThemeProvider>
    </ErrorBoundary>
  );
}
