import { describe, expect, it, jest } from '@jest/globals';
import { requestAllPermissions } from '../app/src/utils/permissions';

// The permissions utilities rely on native modules, so we mock react-native and expo-location/PermissionsAndroid APIs
jest.mock('expo-location', () => ({
  requestForegroundPermissionsAsync: (jest.fn() as any).mockResolvedValue({ status: 'granted' }),
  getForegroundPermissionsAsync: (jest.fn() as any).mockResolvedValue({ status: 'granted' }),
}));

jest.mock('react-native', () => {
  return {
    PermissionsAndroid: {
      PERMISSIONS: {
        ACCESS_FINE_LOCATION: 'android.permission.ACCESS_FINE_LOCATION',
        ACCESS_COARSE_LOCATION: 'android.permission.ACCESS_COARSE_LOCATION',
        BLUETOOTH_SCAN: 'android.permission.BLUETOOTH_SCAN',
        BLUETOOTH_CONNECT: 'android.permission.BLUETOOTH_CONNECT',
      },
      requestMultiple: (jest.fn() as any).mockResolvedValue({
        'android.permission.ACCESS_FINE_LOCATION': 'granted',
        'android.permission.ACCESS_COARSE_LOCATION': 'granted',
        'android.permission.BLUETOOTH_SCAN': 'granted',
        'android.permission.BLUETOOTH_CONNECT': 'granted',
        'android.permission.ACCESS_WIFI_STATE': 'granted',
        'android.permission.ACCESS_NETWORK_STATE': 'granted',
      }),
      check: (jest.fn() as any).mockResolvedValue(true),
      RESULTS: { GRANTED: 'granted' },
    },
    Platform: { OS: 'android' },
  };
});

describe('Permissions utility', () => {
  it('should resolve all permissions as granted on Android mock', async () => {
    const results = await requestAllPermissions();
    expect(results.location).toBe(true);
    expect(results.bluetooth).toBe(true);
    expect(results.network).toBe(true);
  });
});