import AsyncStorage from '@react-native-async-storage/async-storage';

interface LogEvent {
  type: string;
  data: any;
  timestamp: string;
}

export async function logEvent(type: string, data: any): Promise<void> {
  try {
    const timestamp = Date.now().toString();
    const key = `event_${timestamp}_${type}`;
    const event: LogEvent = { type, data, timestamp };
    await AsyncStorage.setItem(key, JSON.stringify(event));
    
    // Clean up old events (keep only last 100)
    await cleanupOldEvents();
  } catch (error) {
    console.error('Failed to log event:', error);
  }
}

export async function getRecentEvents(limit: number = 50): Promise<LogEvent[]> {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const eventKeys = keys.filter((key: string) => key.startsWith('event_')).sort().reverse();
    const recentKeys = eventKeys.slice(0, limit);
    
    if (recentKeys.length === 0) return [];
    
    const items = await AsyncStorage.multiGet(recentKeys);
    return items
      .map(([, value]: [string, string | null]) => value ? JSON.parse(value) : null)
      .filter(Boolean)
      .sort((a: LogEvent, b: LogEvent) => parseInt(b.timestamp) - parseInt(a.timestamp));
  } catch (error) {
    console.error('Failed to get recent events:', error);
    return [];
  }
}

export async function clearAllEvents(): Promise<void> {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const eventKeys = keys.filter((key: string) => key.startsWith('event_'));
    await AsyncStorage.multiRemove(eventKeys);
  } catch (error) {
    console.error('Failed to clear events:', error);
  }
}

async function cleanupOldEvents(): Promise<void> {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const eventKeys = keys.filter((key: string) => key.startsWith('event_')).sort();
    
    if (eventKeys.length > 100) {
      const keysToRemove = eventKeys.slice(0, eventKeys.length - 100);
      await AsyncStorage.multiRemove(keysToRemove);
    }
  } catch (error) {
    console.error('Failed to cleanup old events:', error);
  }
}

export async function getEventsByType(type: string, limit: number = 20): Promise<LogEvent[]> {
  try {
    const allEvents = await getRecentEvents(200);
    return allEvents
      .filter(event => event.type === type)
      .slice(0, limit);
  } catch (error) {
    console.error('Failed to get events by type:', error);
    return [];
  }
}
