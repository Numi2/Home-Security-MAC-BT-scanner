import * as Notifications from 'expo-notifications';
import { getRecentEvents } from '../storage/logger';
import { getKnownDevices, isDeviceKnown } from './network';
import { getNearbyDevices, isDeviceNearby, getKnownBLEDevices } from './ble';
import { logEvent } from '../storage/logger';

export async function evaluateAndAlert() {
  const events = await getRecentEvents();
  // TODO: cross-check events → trigger notification
  await Notifications.scheduleNotificationAsync({
    content: { title: '⚠️ Home Alert', body: 'Check your sensors!' },
    trigger: null,
  });
}

interface PersonProfile {
  id: string;
  name: string;
  devices: {
    mac: string[];    // Known MAC addresses
    ble: string[];    // Known BLE device IDs
  };
  isHome: boolean;
  lastSeen: number;
  confidence: number; // 0-1, how confident we are they're home
}

interface HomeStatus {
  peopleHome: PersonProfile[];
  unknownDevices: {
    network: Array<{ip: string, mac: string, hostname?: string}>;
    ble: Array<{id: string, name?: string, rssi: number}>;
  };
  securityStatus: 'secure' | 'alert' | 'unknown';
  lastUpdate: number;
}

type SecurityAlert = {
  type: 'unknown_device' | 'unusual_time' | 'multiple_unknowns';
  severity: 'low' | 'medium' | 'high';
  details: any;
};

const knownPeople = new Map<string, PersonProfile>();

// Default profiles - in production, these would be configured by the user
const initializeDefaultProfiles = () => {
  // Example profiles - these would be set up during app configuration
  addPerson('user1', 'Primary User', {
    mac: ['00:1a:2b:3c:4d:10', '00:1a:2b:3c:4d:11'], // Phone, laptop
    ble: ['iPhone_1234', 'AirPods_5678']
  });
  
  addPerson('user2', 'Partner', {
    mac: ['00:1a:2b:3c:4d:20', '00:1a:2b:3c:4d:21'],
    ble: ['Samsung_9876', 'Buds_4321']
  });
};

export function addPerson(id: string, name: string, devices: {mac: string[], ble: string[]}): void {
  knownPeople.set(id, {
    id,
    name,
    devices,
    isHome: false,
    lastSeen: 0,
    confidence: 0
  });
}

export function analyzeHomeStatus(): HomeStatus {
  const now = Date.now();
  const networkDevices = getKnownDevices();
  const bleDevices = getNearbyDevices();
  
  // Initialize if needed
  if (knownPeople.size === 0) {
    initializeDefaultProfiles();
  }

  const peopleHome: PersonProfile[] = [];
  const unknownNetworkDevices: Array<{ip: string, mac: string, hostname?: string}> = [];
  const unknownBLEDevices: Array<{id: string, name?: string, rssi: number}> = [];

  // Update people's home status based on their devices
  for (const [personId, person] of knownPeople) {
    let networkConfidence = 0;
    let bleConfidence = 0;
    let lastSeenTime = 0;

    // Check network devices
    for (const mac of person.devices.mac) {
      const networkDevice = networkDevices.find(d => d.mac === mac);
      if (networkDevice) {
        networkConfidence = Math.max(networkConfidence, 0.8);
        lastSeenTime = Math.max(lastSeenTime, networkDevice.lastSeen);
      }
    }

    // Check BLE devices  
    for (const bleId of person.devices.ble) {
      if (isDeviceNearby(bleId, 120000)) { // 2 minutes threshold
        bleConfidence = Math.max(bleConfidence, 0.9);
        const bleDevice = getKnownBLEDevices().find(d => d.id === bleId);
        if (bleDevice) {
          lastSeenTime = Math.max(lastSeenTime, bleDevice.lastSeen);
        }
      }
    }

    // Calculate overall confidence
    const overallConfidence = Math.max(networkConfidence, bleConfidence);
    const isCurrentlyHome = overallConfidence > 0.5 && (now - lastSeenTime) < 300000; // 5 minutes

    // Update person's status
    person.isHome = isCurrentlyHome;
    person.lastSeen = lastSeenTime;
    person.confidence = overallConfidence;

    if (isCurrentlyHome) {
      peopleHome.push({ ...person });
    }
  }

  // Identify unknown devices
  for (const device of networkDevices) {
    const isKnownDevice = Array.from(knownPeople.values()).some(
      person => person.devices.mac.includes(device.mac)
    );
    
    if (!isKnownDevice) {
      unknownNetworkDevices.push({
        ip: device.ip,
        mac: device.mac,
        hostname: device.hostname
      });
    }
  }

  for (const device of bleDevices) {
    const isKnownDevice = Array.from(knownPeople.values()).some(
      person => person.devices.ble.includes(device.id)
    );
    
    if (!isKnownDevice) {
      unknownBLEDevices.push({
        id: device.id,
        name: device.name,
        rssi: device.rssi
      });
    }
  }

  // Determine security status
  let securityStatus: 'secure' | 'alert' | 'unknown' = 'secure';
  
  if (unknownNetworkDevices.length > 0 || unknownBLEDevices.length > 0) {
    securityStatus = 'alert'; // Unknown devices detected
  } else if (peopleHome.length === 0) {
    securityStatus = 'unknown'; // No one appears to be home
  }

  const homeStatus: HomeStatus = {
    peopleHome,
    unknownDevices: {
      network: unknownNetworkDevices,
      ble: unknownBLEDevices
    },
    securityStatus,
    lastUpdate: now
  };

  // Log the analysis
  logEvent('home_analysis', {
    peopleHomeCount: peopleHome.length,
    peopleHome: peopleHome.map(p => ({ name: p.name, confidence: p.confidence })),
    unknownDeviceCount: unknownNetworkDevices.length + unknownBLEDevices.length,
    securityStatus
  });

  return homeStatus;
}

export function getKnownPeople(): PersonProfile[] {
  return Array.from(knownPeople.values());
}

export function getPersonById(id: string): PersonProfile | undefined {
  return knownPeople.get(id);
}

export function updatePersonDevices(personId: string, devices: {mac: string[], ble: string[]}): void {
  const person = knownPeople.get(personId);
  if (person) {
    person.devices = devices;
  }
}

export function detectSuspiciousActivity(): SecurityAlert[] {
  const homeStatus = analyzeHomeStatus();
  const alerts: SecurityAlert[] = [];

  // Check for unknown devices
  const totalUnknown = homeStatus.unknownDevices.network.length + homeStatus.unknownDevices.ble.length;
  if (totalUnknown > 0) {
    alerts.push({
      type: 'unknown_device',
      severity: totalUnknown > 2 ? 'high' : 'medium',
      details: {
        unknownCount: totalUnknown,
        devices: homeStatus.unknownDevices
      }
    });
  }

  // Check for unusual time patterns (example: activity when no one should be home)
  const hour = new Date().getHours();
  if (homeStatus.peopleHome.length === 0 && totalUnknown > 0 && (hour < 6 || hour > 23)) {
    alerts.push({
      type: 'unusual_time',
      severity: 'high',
      details: {
        hour,
        unknownDevices: totalUnknown
      }
    });
  }

  return alerts;
}
