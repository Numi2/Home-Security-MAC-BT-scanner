import React, { useEffect } from 'react';
import { startBLEScan, stopBLEScan } from '../services/ble';
import { logEvent } from '../storage/logger';

export function BLEProximity() {
  useEffect(() => {
    let isActive = true;

    const initBLE = async () => {
      const success = await startBLEScan((device, rssi) => {
        if (isActive) {
          logEvent('ble', { 
            id: device.id, 
            name: device.name, 
            rssi,
            isNearby: device.isNearby,
            proximity: rssi > -50 ? 'very-close' : rssi > -70 ? 'close' : 'far'
          });
        }
      });

      if (!success) {
        console.warn('Failed to start BLE scanning');
      }
    };

    initBLE();

    return () => {
      isActive = false;
      stopBLEScan();
    };
  }, []);

  return null;
}
