import * as Notifications from 'expo-notifications';
import * as TaskManager from 'expo-task-manager';
import { Platform } from 'react-native';

const BACKGROUND_NOTIFICATION_TASK = 'background-notification';

// Configure notifications
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export interface SecurityAlert {
  type: 'unknown_device' | 'unusual_time' | 'multiple_unknowns' | 'person_arrived' | 'person_left';
  severity: 'low' | 'medium' | 'high';
  title: string;
  body: string;
  data?: any;
}

export async function initializeNotifications(): Promise<boolean> {
  try {
    // Request permissions
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.warn('Notification permissions not granted');
      return false;
    }

    // Configure notification channel for Android
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('security-alerts', {
        name: 'Security Alerts',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF231F7C',
        sound: 'default',
        enableVibrate: true,
        enableLights: true,
        description: 'Important security notifications from Home Security Hub',
      });

      await Notifications.setNotificationChannelAsync('presence-updates', {
        name: 'Presence Updates',
        importance: Notifications.AndroidImportance.DEFAULT,
        description: 'Updates about family members arriving or leaving home',
      });
    }

    return true;
  } catch (error) {
    console.error('Failed to initialize notifications:', error);
    return false;
  }
}

export async function sendSecurityAlert(alert: SecurityAlert): Promise<void> {
  try {
    const channelId = alert.severity === 'high' ? 'security-alerts' : 'presence-updates';
    
    await Notifications.scheduleNotificationAsync({
      content: {
        title: alert.title,
        body: alert.body,
        data: {
          type: alert.type,
          severity: alert.severity,
          timestamp: Date.now(),
          ...alert.data
        },
        sound: alert.severity === 'high' ? 'default' : false,
        priority: alert.severity === 'high' ? 
          Notifications.AndroidNotificationPriority.HIGH : 
          Notifications.AndroidNotificationPriority.DEFAULT,
      },
      trigger: null,
      identifier: `security-${Date.now()}`,
    });

    console.log(`Security alert sent: ${alert.title}`);
  } catch (error) {
    console.error('Failed to send security alert:', error);
  }
}

export async function sendUnknownDeviceAlert(deviceCount: number, devices: any[]): Promise<void> {
  const severity: SecurityAlert['severity'] = deviceCount > 2 ? 'high' : 'medium';
  const deviceList = devices.slice(0, 3).map(d => d.hostname || d.name || 'Unknown').join(', ');
  
  await sendSecurityAlert({
    type: 'unknown_device',
    severity,
    title: '⚠️ Unknown Device Detected',
    body: `${deviceCount} unknown device${deviceCount > 1 ? 's' : ''} detected: ${deviceList}${deviceCount > 3 ? '...' : ''}`,
    data: { deviceCount, devices }
  });
}

export async function sendPresenceAlert(personName: string, action: 'arrived' | 'left', confidence: number): Promise<void> {
  const emoji = action === 'arrived' ? '🏠' : '🚪';
  
  await sendSecurityAlert({
    type: action === 'arrived' ? 'person_arrived' : 'person_left',
    severity: 'low',
    title: `${emoji} ${personName} ${action === 'arrived' ? 'Arrived' : 'Left'}`,
    body: `${personName} ${action === 'arrived' ? 'arrived home' : 'left home'} (${Math.round(confidence * 100)}% confidence)`,
    data: { personName, action, confidence }
  });
}

export async function sendUnusualTimeAlert(hour: number, unknownDeviceCount: number): Promise<void> {
  await sendSecurityAlert({
    type: 'unusual_time',
    severity: 'high',
    title: '🌙 Unusual Activity Detected',
    body: `${unknownDeviceCount} unknown device${unknownDeviceCount > 1 ? 's' : ''} detected at ${hour}:00. Everyone appears to be away.`,
    data: { hour, unknownDeviceCount }
  });
}

export async function clearAllNotifications(): Promise<void> {
  try {
    await Notifications.dismissAllNotificationsAsync();
    console.log('All notifications cleared');
  } catch (error) {
    console.error('Failed to clear notifications:', error);
  }
}

export async function schedulePeriodicScan(): Promise<void> {
  try {
    // Cancel existing scheduled notifications
    await Notifications.cancelAllScheduledNotificationsAsync();

    // Schedule periodic security checks (every 30 minutes)
    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Security Check',
        body: 'Performing routine security scan...',
        data: { type: 'periodic_scan' },
      },
      trigger: {
        seconds: 1800, // 30 minutes
        repeats: true,
      } as any,
      identifier: 'periodic-scan',
    });

    console.log('Periodic scan scheduled');
  } catch (error) {
    console.error('Failed to schedule periodic scan:', error);
  }
}

// Background task for notifications
TaskManager.defineTask(BACKGROUND_NOTIFICATION_TASK, async ({ data, error, executionInfo }) => {
  console.log('Received a notification in the background!');
  // Handle background notification logic here
  return Promise.resolve();
});

export async function registerBackgroundTask(): Promise<void> {
  try {
    await Notifications.registerTaskAsync(BACKGROUND_NOTIFICATION_TASK);
    console.log('Background notification task registered');
  } catch (error) {
    console.error('Failed to register background task:', error);
  }
} 