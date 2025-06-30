import { jest } from '@jest/globals';

jest.mock('expo-notifications', () => ({
  scheduleNotificationAsync: jest.fn(),
}));

// mock services before importing logicEngine
jest.mock('../app/src/services/network', () => ({
  getKnownDevices: () => [
    { ip: '192.168.1.2', mac: '00:1a:2b:3c:4d:10', lastSeen: Date.now() },
    { ip: '192.168.1.50', mac: '11:22:33:44:55:66', lastSeen: Date.now() }, // unknown device
  ],
}));

jest.mock('../app/src/services/ble', () => ({
  getNearbyDevices: () => [
    { id: 'iPhone_1234', rssi: -40, lastSeen: Date.now(), isNearby: true },
  ],
  isDeviceNearby: () => true,
  getKnownBLEDevices: () => [
    { id: 'iPhone_1234', rssi: -40, lastSeen: Date.now(), isNearby: true },
  ],
}));

import { analyzeHomeStatus } from '../app/src/services/logicEngine';

describe('LogicEngine analyzeHomeStatus', () => {
  it('should detect one person home and one unknown device', () => {
    const status = analyzeHomeStatus();
    expect(status.peopleHome.length).toBe(1);
    expect(status.unknownDevices.network.length + status.unknownDevices.ble.length).toBe(1);
    expect(status.securityStatus).toBe('alert');
  });
});