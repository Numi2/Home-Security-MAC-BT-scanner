import * as Location from 'expo-location';
import { PermissionsAndroid, Platform } from 'react-native';

export async function requestAllPermissions(): Promise<{
  location: boolean;
  camera: boolean;
  audio: boolean;
  bluetooth: boolean;
  network: boolean;
}> {
  const results = {
    location: false,
    camera: false,
    audio: false,
    bluetooth: false,
    network: false
  };

  try {
    // Request location permissions (needed for BLE scanning)
    const locationPermission = await Location.requestForegroundPermissionsAsync();
    results.location = locationPermission.status === 'granted';

    if (Platform.OS === 'android') {
      // Android-specific permissions
      const androidPermissions = await PermissionsAndroid.requestMultiple([
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION,
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_ADVERTISE,
        PermissionsAndroid.PERMISSIONS.ACCESS_WIFI_STATE,
        PermissionsAndroid.PERMISSIONS.CHANGE_WIFI_STATE,
        PermissionsAndroid.PERMISSIONS.ACCESS_NETWORK_STATE,
        PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
        PermissionsAndroid.PERMISSIONS.CAMERA,
        PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE,
        PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE,
      ]);

      results.bluetooth = (
        androidPermissions[PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN] === 'granted' &&
        androidPermissions[PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT] === 'granted'
      );

      results.network = (
        androidPermissions[PermissionsAndroid.PERMISSIONS.ACCESS_WIFI_STATE] === 'granted' &&
        androidPermissions[PermissionsAndroid.PERMISSIONS.ACCESS_NETWORK_STATE] === 'granted'
      );

      results.audio = androidPermissions[PermissionsAndroid.PERMISSIONS.RECORD_AUDIO] === 'granted';
      results.camera = androidPermissions[PermissionsAndroid.PERMISSIONS.CAMERA] === 'granted';
    } else {
      // iOS permissions are handled differently and are mostly granted by default
      // or requested when the functionality is first used
      results.bluetooth = true; // iOS doesn't require special permissions for BLE scanning
      results.network = true;   // Network access is granted by default
      results.audio = true;     // Will be requested when first used
      results.camera = true;    // Will be requested when first used
    }

  } catch (error) {
    console.error('Permission request failed:', error);
  }

  return results;
}

export async function checkPermissionStatus(): Promise<{
  location: boolean;
  bluetooth: boolean;
  network: boolean;
}> {
  const status = {
    location: false,
    bluetooth: false,
    network: false
  };

  try {
    // Check location permission
    const locationPermission = await Location.getForegroundPermissionsAsync();
    status.location = locationPermission.status === 'granted';

    if (Platform.OS === 'android') {
      // Check Android permissions
      const bluetoothScan = await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN);
      const bluetoothConnect = await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT);
      const wifiState = await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.ACCESS_WIFI_STATE);

      status.bluetooth = bluetoothScan && bluetoothConnect;
      status.network = wifiState;
    } else {
      // iOS defaults
      status.bluetooth = true;
      status.network = true;
    }
  } catch (error) {
    console.error('Permission check failed:', error);
  }

  return status;
}

export async function requestLocationPermission(): Promise<boolean> {
  try {
    const permission = await Location.requestForegroundPermissionsAsync();
    return permission.status === 'granted';
  } catch (error) {
    console.error('Location permission request failed:', error);
    return false;
  }
}

export async function requestBluetoothPermissions(): Promise<boolean> {
  if (Platform.OS === 'android') {
    try {
      const permissions = await PermissionsAndroid.requestMultiple([
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
      ]);

      return Object.values(permissions).every(
        permission => permission === PermissionsAndroid.RESULTS.GRANTED
      );
    } catch (error) {
      console.error('Bluetooth permission request failed:', error);
      return false;
    }
  }
  return true; // iOS doesn't require explicit BLE permissions
}
