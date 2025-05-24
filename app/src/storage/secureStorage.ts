import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';

interface PersonProfile {
  id: string;
  name: string;
  devices: {
    mac: string[];
    ble: string[];
  };
  isHome: boolean;
  lastSeen: number;
  confidence: number;
  isEnabled: boolean;
}

interface SecuritySettings {
  scanInterval: number;
  alertThreshold: number;
  nightModeStart: number;
  nightModeEnd: number;
  autoScan: boolean;
  soundAlerts: boolean;
  encryptionEnabled: boolean;
}

interface AppData {
  people: PersonProfile[];
  settings: SecuritySettings;
  knownDevices: {
    network: Array<{mac: string, hostname?: string, trusted: boolean}>;
    ble: Array<{id: string, name?: string, trusted: boolean}>;
  };
  version: string;
  lastBackup: number;
}

const STORAGE_KEYS = {
  APP_DATA: 'home_security_app_data',
  ENCRYPTION_KEY: 'encryption_key',
  FIRST_RUN: 'first_run_complete'
};

const DEFAULT_SETTINGS: SecuritySettings = {
  scanInterval: 30,
  alertThreshold: 2,
  nightModeStart: 23,
  nightModeEnd: 6,
  autoScan: true,
  soundAlerts: true,
  encryptionEnabled: true
};

let encryptionKey: string | null = null;

async function getEncryptionKey(): Promise<string> {
  if (encryptionKey) return encryptionKey;
  
  try {
    let key = await AsyncStorage.getItem(STORAGE_KEYS.ENCRYPTION_KEY);
    if (!key) {
      // Generate new encryption key
      key = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        `${Date.now()}-${Math.random()}-home-security-key`,
        { encoding: Crypto.CryptoEncoding.HEX }
      );
      await AsyncStorage.setItem(STORAGE_KEYS.ENCRYPTION_KEY, key);
    }
    encryptionKey = key;
    return key;
  } catch (error) {
    console.error('Failed to get encryption key:', error);
    throw new Error('Encryption key generation failed');
  }
}

async function encryptData(data: string): Promise<string> {
  try {
    const key = await getEncryptionKey();
    // Simple encryption using base64 and key mixing
    // In production, use a proper encryption library like expo-crypto
    const combined = btoa(data + '|' + key);
    return combined;
  } catch (error) {
    console.error('Encryption failed:', error);
    return data; // Fallback to unencrypted
  }
}

async function decryptData(encryptedData: string): Promise<string> {
  try {
    const key = await getEncryptionKey();
    const decoded = atob(encryptedData);
    const [data] = decoded.split('|' + key);
    return data;
  } catch (error) {
    console.error('Decryption failed:', error);
    return encryptedData; // Fallback to return as-is
  }
}

export async function initializeStorage(): Promise<boolean> {
  try {
    const isFirstRun = await AsyncStorage.getItem(STORAGE_KEYS.FIRST_RUN);
    
    if (!isFirstRun) {
      // First run setup
      const defaultData: AppData = {
        people: [],
        settings: DEFAULT_SETTINGS,
        knownDevices: { network: [], ble: [] },
        version: '1.0.0',
        lastBackup: Date.now()
      };
      
      await saveAppData(defaultData);
      await AsyncStorage.setItem(STORAGE_KEYS.FIRST_RUN, 'true');
      console.log('Storage initialized for first run');
    }
    
    return true;
  } catch (error) {
    console.error('Storage initialization failed:', error);
    return false;
  }
}

export async function saveAppData(data: AppData): Promise<boolean> {
  try {
    const jsonData = JSON.stringify(data);
    const encrypted = await encryptData(jsonData);
    await AsyncStorage.setItem(STORAGE_KEYS.APP_DATA, encrypted);
    console.log('App data saved successfully');
    return true;
  } catch (error) {
    console.error('Failed to save app data:', error);
    return false;
  }
}

export async function loadAppData(): Promise<AppData | null> {
  try {
    const encrypted = await AsyncStorage.getItem(STORAGE_KEYS.APP_DATA);
    if (!encrypted) return null;
    
    const jsonData = await decryptData(encrypted);
    const data: AppData = JSON.parse(jsonData);
    
    // Ensure data structure is valid
    if (!data.people) data.people = [];
    if (!data.settings) data.settings = DEFAULT_SETTINGS;
    if (!data.knownDevices) data.knownDevices = { network: [], ble: [] };
    if (!data.version) data.version = '1.0.0';
    
    return data;
  } catch (error) {
    console.error('Failed to load app data:', error);
    return null;
  }
}

export async function savePeople(people: PersonProfile[]): Promise<boolean> {
  try {
    const data = await loadAppData();
    if (!data) return false;
    
    data.people = people;
    return await saveAppData(data);
  } catch (error) {
    console.error('Failed to save people:', error);
    return false;
  }
}

export async function loadPeople(): Promise<PersonProfile[]> {
  try {
    const data = await loadAppData();
    return data?.people || [];
  } catch (error) {
    console.error('Failed to load people:', error);
    return [];
  }
}

export async function saveSettings(settings: SecuritySettings): Promise<boolean> {
  try {
    const data = await loadAppData();
    if (!data) return false;
    
    data.settings = settings;
    return await saveAppData(data);
  } catch (error) {
    console.error('Failed to save settings:', error);
    return false;
  }
}

export async function loadSettings(): Promise<SecuritySettings> {
  try {
    const data = await loadAppData();
    return data?.settings || DEFAULT_SETTINGS;
  } catch (error) {
    console.error('Failed to load settings:', error);
    return DEFAULT_SETTINGS;
  }
}

export async function addTrustedDevice(type: 'network' | 'ble', deviceId: string, name?: string): Promise<boolean> {
  try {
    const data = await loadAppData();
    if (!data) return false;
    
    const device = type === 'network' 
      ? { mac: deviceId, hostname: name, trusted: true }
      : { id: deviceId, name, trusted: true };
    
    const existingIndex = data.knownDevices[type].findIndex(d => 
      type === 'network' ? (d as any).mac === deviceId : (d as any).id === deviceId
    );
    
    if (existingIndex >= 0) {
      data.knownDevices[type][existingIndex] = device as any;
    } else {
      data.knownDevices[type].push(device as any);
    }
    
    return await saveAppData(data);
  } catch (error) {
    console.error('Failed to add trusted device:', error);
    return false;
  }
}

export async function exportData(): Promise<string | null> {
  try {
    const data = await loadAppData();
    if (!data) return null;
    
    // Create export with timestamp
    const exportData = {
      ...data,
      exportDate: new Date().toISOString(),
      appVersion: '1.0.0'
    };
    
    return JSON.stringify(exportData, null, 2);
  } catch (error) {
    console.error('Failed to export data:', error);
    return null;
  }
}

export async function importData(jsonData: string): Promise<boolean> {
  try {
    const importedData = JSON.parse(jsonData);
    
    // Validate imported data structure
    if (!importedData.people || !importedData.settings) {
      throw new Error('Invalid data format');
    }
    
    const data: AppData = {
      people: importedData.people,
      settings: { ...DEFAULT_SETTINGS, ...importedData.settings },
      knownDevices: importedData.knownDevices || { network: [], ble: [] },
      version: '1.0.0',
      lastBackup: Date.now()
    };
    
    return await saveAppData(data);
  } catch (error) {
    console.error('Failed to import data:', error);
    return false;
  }
}

export async function clearAllData(): Promise<boolean> {
  try {
    await AsyncStorage.multiRemove([
      STORAGE_KEYS.APP_DATA,
      STORAGE_KEYS.FIRST_RUN
    ]);
    encryptionKey = null;
    console.log('All data cleared');
    return true;
  } catch (error) {
    console.error('Failed to clear data:', error);
    return false;
  }
} 