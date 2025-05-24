import React, { useEffect } from 'react';
import { scanLAN } from '../services/network';
import { logEvent } from '../storage/logger';

export function NetworkScanner() {
  useEffect(() => {
    const performScan = async () => {
      try {
        const devices = await scanLAN();
        if (devices.length > 0) {
          logEvent('network', {
            deviceCount: devices.length,
            devices: devices.map(d => ({
              ip: d.ip,
              mac: d.mac,
              hostname: d.hostname,
              lastSeen: d.lastSeen
            }))
          });
        }
      } catch (error) {
        console.error('Network scan failed:', error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        logEvent('network_error', { error: errorMessage });
      }
    };

    // Initial scan
    performScan();

    // Set up interval for regular scanning
    const interval = setInterval(performScan, 30000); // Scan every 30 seconds

    return () => clearInterval(interval);
  }, []);

  return null;
}
