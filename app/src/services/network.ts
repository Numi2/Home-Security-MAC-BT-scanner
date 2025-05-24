import { Platform } from 'react-native';
import * as Network from 'expo-network';

interface NetworkDevice {
  ip: string;
  mac: string;
  hostname?: string;
  lastSeen: number;
}

const knownDevices = new Map<string, NetworkDevice>();

export async function scanLAN(): Promise<NetworkDevice[]> {
  try {
    // Get network info
    const networkState = await Network.getNetworkStateAsync();
    if (!networkState.isConnected || networkState.type !== Network.NetworkStateType.WIFI) {
      return [];
    }

    const ipInfo = await Network.getIpAddressAsync();
    if (!ipInfo) return [];

    // Extract network range (assuming /24 subnet)
    const networkBase = ipInfo.substring(0, ipInfo.lastIndexOf('.'));
    const devices: NetworkDevice[] = [];

    // Ping sweep of the network
    const pingPromises = [];
    for (let i = 1; i <= 254; i++) {
      const targetIP = `${networkBase}.${i}`;
      pingPromises.push(pingDevice(targetIP));
    }

    const results = await Promise.allSettled(pingPromises);
    
    for (let i = 0; i < results.length; i++) {
      if (results[i].status === 'fulfilled') {
        const result = (results[i] as PromiseFulfilledResult<NetworkDevice | null>).value;
        if (result) {
          devices.push(result);
          knownDevices.set(result.mac, result);
        }
      }
    }

    return devices;
  } catch (error) {
    console.error('Network scan error:', error);
    return [];
  }
}

async function pingDevice(ip: string): Promise<NetworkDevice | null> {
  try {
    // Simulate device detection - in real implementation, you would use:
    // - ARP table inspection
    // - UDP ping
    // - Wake-on-LAN detection
    
    // For now, we'll simulate some common device detection
    const isReachable = await simulatePing(ip);
    if (!isReachable) return null;

    // Generate a simulated MAC address (in real app, this would come from ARP table)
    const mac = generateMACForIP(ip);
    
    return {
      ip,
      mac,
      hostname: await getHostname(ip),
      lastSeen: Date.now()
    };
  } catch {
    return null;
  }
}

async function simulatePing(ip: string): Promise<boolean> {
  // Simulate ping response - replace with actual network ping
  return new Promise((resolve) => {
    const delay = Math.random() * 100;
    setTimeout(() => {
      // Simulate some devices being present (for demo)
      const random = Math.random();
      resolve(random > 0.85); // ~15% of IPs will respond
    }, delay);
  });
}

function generateMACForIP(ip: string): string {
  // Generate a consistent MAC address for demo purposes
  // In real implementation, this would come from ARP table
  const lastOctet = ip.split('.').pop() || '0';
  const num = parseInt(lastOctet);
  const hex = num.toString(16).padStart(2, '0');
  return `00:1a:2b:3c:4d:${hex}`;
}

async function getHostname(ip: string): Promise<string | undefined> {
  // In a real implementation, you would do reverse DNS lookup
  // For demo, we'll return some common device names
  const commonNames = ['iPhone', 'MacBook', 'Android', 'Router', 'iPad', 'Laptop'];
  return Math.random() > 0.7 ? commonNames[Math.floor(Math.random() * commonNames.length)] : undefined;
}

export function getKnownDevices(): NetworkDevice[] {
  return Array.from(knownDevices.values());
}

export function addKnownDevice(device: NetworkDevice) {
  knownDevices.set(device.mac, device);
}

export function isDeviceKnown(mac: string): boolean {
  return knownDevices.has(mac);
}
