import { PermissionsAndroid, Platform } from 'react-native';
import { BleError, BleManager, Device, Subscription } from 'react-native-ble-plx';

const manager = new BleManager();

interface BLEDevice {
  id: string;
  name?: string;
  rssi: number;
  lastSeen: number;
  isNearby: boolean;
}

const knownBLEDevices = new Map<string, BLEDevice>();
let scanSubscription: Subscription | null = null;
let isScanning = false;

export async function requestBLEPermissions(): Promise<boolean> {
  if (Platform.OS === 'android') {
    try {
      const permissions = [
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
      ];

      const granted = await PermissionsAndroid.requestMultiple(permissions);
      
      return Object.values(granted).every(
        permission => permission === PermissionsAndroid.RESULTS.GRANTED
      );
    } catch (error) {
      console.error('BLE permission request failed:', error);
      return false;
    }
  }
  return true;
}

export async function startBLEScan(callback: (dev: BLEDevice, rssi: number) => void): Promise<boolean> {
  try {
    // Request permissions first
    const hasPermissions = await requestBLEPermissions();
    if (!hasPermissions) {
      console.warn('BLE permissions not granted');
      return false;
    }

    // Check if BLE is available
    const state = await manager.state();
    if (state !== 'PoweredOn') {
      console.warn('Bluetooth is not powered on');
      return false;
    }

    if (isScanning) {
      stopBLEScan();
    }

    isScanning = true;
    manager.startDeviceScan(
      null, 
      { allowDuplicates: true, scanMode: 1 }, 
      (error: BleError | null, device: Device | null) => {
        if (error) {
          console.error('BLE scan error:', error);
          return;
        }

        if (device && device.rssi != null) {
          const bleDevice: BLEDevice = {
            id: device.id,
            name: device.name || device.localName || undefined,
            rssi: device.rssi,
            lastSeen: Date.now(),
            isNearby: device.rssi > -80 // Consider devices with RSSI > -80dBm as nearby
          };

          // Update known devices
          knownBLEDevices.set(device.id, bleDevice);
          
          callback(bleDevice, device.rssi);
        }
      }
    );
    
    // Create a simple subscription object for cleanup
    scanSubscription = {
      remove: () => {
        manager.stopDeviceScan();
        isScanning = false;
      }
    };

    // Auto-stop scan after 30 seconds to save battery
    setTimeout(() => {
      if (isScanning) {
        stopBLEScan();
        // Restart scan after a short break
        setTimeout(() => startBLEScan(callback), 5000);
      }
    }, 30000);

    return true;
  } catch (error) {
    console.error('Failed to start BLE scan:', error);
    isScanning = false;
    return false;
  }
}

export function stopBLEScan(): void {
  if (scanSubscription) {
    scanSubscription.remove();
    scanSubscription = null;
  }
  if (isScanning) {
    manager.stopDeviceScan();
    isScanning = false;
  }
}

export function getKnownBLEDevices(): BLEDevice[] {
  return Array.from(knownBLEDevices.values());
}

export function getNearbyDevices(): BLEDevice[] {
  const now = Date.now();
  const fiveMinutesAgo = now - 5 * 60 * 1000;
  
  return Array.from(knownBLEDevices.values()).filter(
    device => device.isNearby && device.lastSeen > fiveMinutesAgo
  );
}

export function getDeviceProximity(deviceId: string): 'very-close' | 'close' | 'far' | 'unknown' {
  const device = knownBLEDevices.get(deviceId);
  if (!device) return 'unknown';

  const rssi = device.rssi;
  if (rssi > -50) return 'very-close';
  if (rssi > -70) return 'close';
  if (rssi > -90) return 'far';
  return 'unknown';
}

export function isDeviceNearby(deviceId: string, timeThreshold: number = 60000): boolean {
  const device = knownBLEDevices.get(deviceId);
  if (!device) return false;
  
  const now = Date.now();
  return device.isNearby && (now - device.lastSeen) < timeThreshold;
}

export function addTrustedDevice(deviceId: string, name?: string): void {
  const existing = knownBLEDevices.get(deviceId);
  if (existing) {
    existing.name = name || existing.name;
  } else {
    knownBLEDevices.set(deviceId, {
      id: deviceId,
      name,
      rssi: -100,
      lastSeen: 0,
      isNearby: false
    });
  }
}
