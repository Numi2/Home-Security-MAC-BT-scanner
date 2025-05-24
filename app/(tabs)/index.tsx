import { BLEProximity } from '@/app/src/components/BLEProximity';
import { NetworkScanner } from '@/app/src/components/NetworkScanner';
import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useEffect, useState } from 'react';
import { Alert, AppState, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

// Inline interfaces and types
interface NetworkDevice {
  ip: string;
  mac: string;
  hostname?: string;
  lastSeen: number;
}

interface BLEDevice {
  id: string;
  name?: string;
  rssi: number;
  lastSeen: number;
  isNearby: boolean;
}

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
}

interface HomeStatusState {
  peopleHome: PersonProfile[];
  unknownDevices: {
    network: NetworkDevice[];
    ble: BLEDevice[];
  };
  securityStatus: 'secure' | 'alert' | 'unknown';
  lastUpdate: number;
}

interface LogEvent {
  type: string;
  data: any;
  timestamp: string;
}

interface SecurityAlert {
  type: 'unknown_device' | 'unusual_time' | 'multiple_unknowns';
  severity: 'low' | 'medium' | 'high';
  details: any;
}

export default function SecurityDashboard() {
  const [homeStatus, setHomeStatus] = useState<HomeStatusState>({
    peopleHome: [],
    unknownDevices: { network: [], ble: [] },
    securityStatus: 'unknown',
    lastUpdate: 0
  });
  
  const [refreshing, setRefreshing] = useState(false);
  const [alerts, setAlerts] = useState<SecurityAlert[]>([]);
  const [recentEvents, setRecentEvents] = useState<LogEvent[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [networkDevices, setNetworkDevices] = useState<NetworkDevice[]>([]);
  const [bleDevices, setBleDevices] = useState<BLEDevice[]>([]);
  const [knownPeople] = useState<PersonProfile[]>([
    // Demo data - in real app this would come from storage
    {
      id: 'user1',
      name: 'Primary User',
      devices: {
        mac: ['00:1a:2b:3c:4d:10', '00:1a:2b:3c:4d:11'],
        ble: ['iPhone_1234', 'AirPods_5678']
      },
      isHome: false,
      lastSeen: 0,
      confidence: 0
    },
    {
      id: 'user2', 
      name: 'Partner',
      devices: {
        mac: ['00:1a:2b:3c:4d:20', '00:1a:2b:3c:4d:21'],
        ble: ['Samsung_9876', 'Buds_4321']
      },
      isHome: false,
      lastSeen: 0,
      confidence: 0
    }
  ]);

  // Simulated network scanning
  const performNetworkScan = useCallback(async () => {
    try {
      setIsScanning(true);
      
      // Simulate network scan with delay
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Generate some demo devices
      const demoDevices: NetworkDevice[] = [
        {
          ip: '192.168.1.101',
          mac: '00:1a:2b:3c:4d:10',
          hostname: 'iPhone-12',
          lastSeen: Date.now()
        },
        {
          ip: '192.168.1.102', 
          mac: '00:1a:2b:3c:4d:15',
          hostname: 'MacBook-Pro',
          lastSeen: Date.now() - 60000
        },
        {
          ip: '192.168.1.103',
          mac: '00:1a:2b:3c:4d:99',
          hostname: 'Unknown-Device',
          lastSeen: Date.now() - 30000
        }
      ];
      
      setNetworkDevices(demoDevices);
      
      // Log the scan event
      const event: LogEvent = {
        type: 'network_scan',
        data: { deviceCount: demoDevices.length, devices: demoDevices },
        timestamp: Date.now().toString()
      };
      
      setRecentEvents(prev => [event, ...prev.slice(0, 9)]);
      
    } catch (error) {
      console.error('Network scan failed:', error);
    } finally {
      setIsScanning(false);
    }
  }, []);

  // Simulated BLE scanning
  const performBLEScan = useCallback(async () => {
    try {
      // Generate some demo BLE devices
      const demoBLEDevices: BLEDevice[] = [
        {
          id: 'AirPods_5678',
          name: 'AirPods Pro',
          rssi: -45,
          lastSeen: Date.now(),
          isNearby: true
        },
        {
          id: 'Unknown_BLE_123',
          name: 'Unknown Device',
          rssi: -65,
          lastSeen: Date.now() - 45000,
          isNearby: true
        }
      ];
      
      setBleDevices(demoBLEDevices);
      
      // Log the scan event
      const event: LogEvent = {
        type: 'ble_scan',
        data: { deviceCount: demoBLEDevices.length, devices: demoBLEDevices },
        timestamp: Date.now().toString()
      };
      
      setRecentEvents(prev => [event, ...prev.slice(0, 9)]);
      
    } catch (error) {
      console.error('BLE scan failed:', error);
    }
  }, []);

  // Analyze home status based on detected devices
  const analyzeHomeStatus = useCallback(() => {
    const now = Date.now();
    const peopleHome: PersonProfile[] = [];
    const unknownNetworkDevices: NetworkDevice[] = [];
    const unknownBLEDevices: BLEDevice[] = [];

    // Check each person's devices
    knownPeople.forEach(person => {
      let networkConfidence = 0;
      let bleConfidence = 0;
      let lastSeenTime = 0;

      // Check network devices
      person.devices.mac.forEach(mac => {
        const networkDevice = networkDevices.find(d => d.mac === mac);
        if (networkDevice && (now - networkDevice.lastSeen) < 300000) { // 5 minutes
          networkConfidence = Math.max(networkConfidence, 0.8);
          lastSeenTime = Math.max(lastSeenTime, networkDevice.lastSeen);
        }
      });

      // Check BLE devices
      person.devices.ble.forEach(bleId => {
        const bleDevice = bleDevices.find(d => d.id === bleId);
        if (bleDevice && bleDevice.isNearby && (now - bleDevice.lastSeen) < 120000) { // 2 minutes
          bleConfidence = Math.max(bleConfidence, 0.9);
          lastSeenTime = Math.max(lastSeenTime, bleDevice.lastSeen);
        }
      });

      // Calculate overall confidence
      const overallConfidence = Math.max(networkConfidence, bleConfidence);
      const isCurrentlyHome = overallConfidence > 0.5;

      if (isCurrentlyHome) {
        peopleHome.push({
          ...person,
          isHome: true,
          lastSeen: lastSeenTime,
          confidence: overallConfidence
        });
      }
    });

    // Identify unknown devices
    networkDevices.forEach(device => {
      const isKnown = knownPeople.some(person => person.devices.mac.includes(device.mac));
      if (!isKnown) {
        unknownNetworkDevices.push(device);
      }
    });

    bleDevices.forEach(device => {
      const isKnown = knownPeople.some(person => person.devices.ble.includes(device.id));
      if (!isKnown) {
        unknownBLEDevices.push(device);
      }
    });

    // Determine security status
    let securityStatus: 'secure' | 'alert' | 'unknown' = 'secure';
    if (unknownNetworkDevices.length > 0 || unknownBLEDevices.length > 0) {
      securityStatus = 'alert';
    } else if (peopleHome.length === 0) {
      securityStatus = 'unknown';
    }

    const newHomeStatus: HomeStatusState = {
      peopleHome,
      unknownDevices: {
        network: unknownNetworkDevices,
        ble: unknownBLEDevices
      },
      securityStatus,
      lastUpdate: now
    };

    setHomeStatus(newHomeStatus);

    // Generate alerts
    const newAlerts: SecurityAlert[] = [];
    const totalUnknown = unknownNetworkDevices.length + unknownBLEDevices.length;
    
    if (totalUnknown > 0) {
      newAlerts.push({
        type: 'unknown_device',
        severity: totalUnknown > 2 ? 'high' : 'medium',
        details: {
          unknownCount: totalUnknown,
          devices: { network: unknownNetworkDevices, ble: unknownBLEDevices }
        }
      });
    }

    const hour = new Date().getHours();
    if (peopleHome.length === 0 && totalUnknown > 0 && (hour < 6 || hour > 23)) {
      newAlerts.push({
        type: 'unusual_time',
        severity: 'high',
        details: { hour, unknownDevices: totalUnknown }
      });
    }

    setAlerts(newAlerts);

    // Log analysis
    const event: LogEvent = {
      type: 'home_analysis',
      data: {
        peopleHomeCount: peopleHome.length,
        unknownDeviceCount: totalUnknown,
        securityStatus
      },
      timestamp: Date.now().toString()
    };
    
    setRecentEvents(prev => [event, ...prev.slice(0, 9)]);

  }, [networkDevices, bleDevices, knownPeople]);

  // Perform full update
  const updateStatus = useCallback(async () => {
    await performNetworkScan();
    await performBLEScan();
    analyzeHomeStatus();
  }, [performNetworkScan, performBLEScan, analyzeHomeStatus]);

  // Refresh handler
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await updateStatus();
    setRefreshing(false);
  }, [updateStatus]);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(updateStatus, 30000);
    updateStatus(); // Initial update
    return () => clearInterval(interval);
  }, [updateStatus]);

  // Handle app state changes
  useEffect(() => {
    const handleAppStateChange = (nextAppState: string) => {
      if (nextAppState === 'active') {
        updateStatus();
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription?.remove();
  }, [updateStatus]);

  const getStatusIcon = () => {
    switch (homeStatus.securityStatus) {
      case 'secure': return 'shield-checkmark';
      case 'alert': return 'warning';
      case 'unknown': return 'help-circle';
      default: return 'help-circle';
    }
  };

  const getStatusColor = () => {
    switch (homeStatus.securityStatus) {
      case 'secure': return '#4CAF50';
      case 'alert': return '#FF9800';
      case 'unknown': return '#9E9E9E';
      default: return '#9E9E9E';
    }
  };

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString();
  };

  return (
    <View style={styles.container}>
      {/* Background components for scanning */}
      <NetworkScanner />
      <BLEProximity />
      
      <ScrollView 
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Home Security Hub</Text>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor() }]}>
            <Ionicons name={getStatusIcon()} size={20} color="white" />
            <Text style={styles.statusText}>{homeStatus.securityStatus.toUpperCase()}</Text>
          </View>
        </View>

        {/* Scanning Status */}
        {isScanning && (
          <View style={styles.scanningStatus}>
            <Ionicons name="radar" size={16} color="#2196F3" />
            <Text style={styles.scanningText}>Scanning network...</Text>
          </View>
        )}

        {/* People Home Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            <Ionicons name="people" size={20} color="#666" /> Who&apos;s Home ({homeStatus.peopleHome.length})
          </Text>
          {homeStatus.peopleHome.length === 0 ? (
            <Text style={styles.emptyText}>No one detected at home</Text>
          ) : (
            homeStatus.peopleHome.map((person, index) => (
              <View key={index} style={styles.personCard}>
                <View style={styles.personInfo}>
                  <Text style={styles.personName}>{person.name}</Text>
                  <Text style={styles.personStatus}>
                    Home • {Math.round(person.confidence * 100)}% confidence
                  </Text>
                  <Text style={styles.personLastSeen}>
                    Last seen: {formatTime(person.lastSeen)}
                  </Text>
                </View>
                <View style={[styles.confidenceBadge, { 
                  backgroundColor: person.confidence > 0.8 ? '#4CAF50' : '#FF9800' 
                }]}>
                  <Text style={styles.confidenceText}>{Math.round(person.confidence * 100)}%</Text>
                </View>
              </View>
            ))
          )}
        </View>

        {/* Alerts Section */}
        {alerts.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              <Ionicons name="alert-circle" size={20} color="#FF5722" /> Security Alerts ({alerts.length})
            </Text>
            {alerts.map((alert, index) => (
              <View key={index} style={[styles.alertCard, { 
                borderLeftColor: alert.severity === 'high' ? '#F44336' : '#FF9800' 
              }]}>
                <Text style={styles.alertType}>{alert.type.replace('_', ' ').toUpperCase()}</Text>
                <Text style={styles.alertSeverity}>Severity: {alert.severity}</Text>
                <Text style={styles.alertDetails}>
                  {alert.type === 'unknown_device' ? 
                    `${alert.details.unknownCount} unknown device(s) detected` :
                    `Unusual activity at ${alert.details.hour}:00`}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* Unknown Devices Section */}
        {(homeStatus.unknownDevices.network.length > 0 || homeStatus.unknownDevices.ble.length > 0) && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              <Ionicons name="help-circle" size={20} color="#FF9800" /> Unknown Devices
            </Text>
            
            {homeStatus.unknownDevices.network.length > 0 && (
              <View style={styles.deviceCategory}>
                <Text style={styles.deviceCategoryTitle}>Network Devices ({homeStatus.unknownDevices.network.length})</Text>
                {homeStatus.unknownDevices.network.map((device, index) => (
                  <View key={index} style={styles.deviceCard}>
                    <Text style={styles.deviceName}>{device.hostname || 'Unknown Device'}</Text>
                    <Text style={styles.deviceDetails}>IP: {device.ip} • MAC: {device.mac}</Text>
                    <Text style={styles.deviceTime}>Last seen: {formatTime(device.lastSeen)}</Text>
                  </View>
                ))}
              </View>
            )}

            {homeStatus.unknownDevices.ble.length > 0 && (
              <View style={styles.deviceCategory}>
                <Text style={styles.deviceCategoryTitle}>Bluetooth Devices ({homeStatus.unknownDevices.ble.length})</Text>
                {homeStatus.unknownDevices.ble.map((device, index) => (
                  <View key={index} style={styles.deviceCard}>
                    <Text style={styles.deviceName}>{device.name || 'Unknown BLE Device'}</Text>
                    <Text style={styles.deviceDetails}>RSSI: {device.rssi}dBm • ID: {device.id.substring(0, 8)}...</Text>
                    <Text style={styles.deviceTime}>Last seen: {formatTime(device.lastSeen)}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}

        {/* Device Status Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            <Ionicons name="devices" size={20} color="#666" /> Device Status
          </Text>
          
          <View style={styles.statusRow}>
            <View style={styles.statusItem}>
              <Ionicons name="wifi" size={24} color="#2196F3" />
              <Text style={styles.statusLabel}>Network</Text>
              <Text style={styles.statusValue}>{networkDevices.length} devices</Text>
            </View>
            
            <View style={styles.statusItem}>
              <Ionicons name="bluetooth" size={24} color="#2196F3" />
              <Text style={styles.statusLabel}>Bluetooth</Text>
              <Text style={styles.statusValue}>{bleDevices.length} devices</Text>
            </View>
            
            <View style={styles.statusItem}>
              <Ionicons name="time" size={24} color="#2196F3" />
              <Text style={styles.statusLabel}>Last Scan</Text>
              <Text style={styles.statusValue}>
                {homeStatus.lastUpdate > 0 ? formatTime(homeStatus.lastUpdate) : 'Never'}
              </Text>
            </View>
          </View>
        </View>

        {/* Recent Activity Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            <Ionicons name="time" size={20} color="#666" /> Recent Activity
          </Text>
          {recentEvents.length === 0 ? (
            <Text style={styles.emptyText}>No recent activity</Text>
          ) : (
            recentEvents.map((event, index) => (
              <View key={index} style={styles.eventCard}>
                <View style={styles.eventHeader}>
                  <Text style={styles.eventType}>{event.type}</Text>
                  <Text style={styles.eventTime}>{formatTime(parseInt(event.timestamp))}</Text>
                </View>
                <Text style={styles.eventData} numberOfLines={2}>
                  {typeof event.data === 'object' ? 
                    JSON.stringify(event.data).substring(0, 100) + '...' : 
                    event.data}
                </Text>
              </View>
            ))
          )}
        </View>

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            <Ionicons name="flash" size={20} color="#666" /> Quick Actions
          </Text>
          
          <View style={styles.actionButtons}>
            <TouchableOpacity style={styles.actionButton} onPress={updateStatus}>
              <Ionicons name="refresh" size={20} color="#2196F3" />
              <Text style={styles.actionButtonText}>Refresh</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.actionButton} 
              onPress={() => Alert.alert('Info', 'Emergency mode would send alerts to all contacts')}
            >
              <Ionicons name="alert" size={20} color="#F44336" />
              <Text style={styles.actionButtonText}>Emergency</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Status Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            🔒 All data processed locally on device
          </Text>
          <Text style={styles.footerText}>
            Pull down to refresh • Updates every 30 seconds
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollView: {
    flex: 1,
  },
  header: {
    backgroundColor: '#2196F3',
    padding: 20,
    paddingTop: 60,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  statusText: {
    color: 'white',
    fontWeight: 'bold',
    marginLeft: 5,
    fontSize: 12,
  },
  scanningStatus: {
    backgroundColor: '#E3F2FD',
    padding: 10,
    margin: 10,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  scanningText: {
    marginLeft: 8,
    color: '#1976D2',
    fontWeight: '600',
  },
  section: {
    backgroundColor: 'white',
    margin: 10,
    padding: 15,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#333',
  },
  emptyText: {
    color: '#999',
    fontStyle: 'italic',
    textAlign: 'center',
    padding: 20,
  },
  personCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  personInfo: {
    flex: 1,
  },
  personName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  personStatus: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  personLastSeen: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
  confidenceBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  confidenceText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  alertCard: {
    padding: 12,
    borderLeftWidth: 4,
    backgroundColor: '#FFEBEE',
    marginBottom: 8,
    borderRadius: 4,
  },
  alertType: {
    fontWeight: 'bold',
    color: '#D32F2F',
    fontSize: 14,
  },
  alertSeverity: {
    color: '#666',
    fontSize: 12,
    marginTop: 2,
  },
  alertDetails: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  deviceCategory: {
    marginBottom: 15,
  },
  deviceCategoryTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#555',
    marginBottom: 8,
  },
  deviceCard: {
    backgroundColor: '#FFF8E1',
    padding: 10,
    borderRadius: 6,
    marginBottom: 5,
  },
  deviceName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
  deviceDetails: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
    fontFamily: 'monospace',
  },
  deviceTime: {
    fontSize: 10,
    color: '#999',
    marginTop: 2,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statusItem: {
    alignItems: 'center',
    flex: 1,
  },
  statusLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  statusValue: {
    fontSize: 10,
    color: '#999',
    marginTop: 2,
    textAlign: 'center',
  },
  eventCard: {
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  eventHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  eventType: {
    fontSize: 12,
    fontWeight: '600',
    color: '#2196F3',
  },
  eventTime: {
    fontSize: 10,
    color: '#999',
  },
  eventData: {
    fontSize: 10,
    color: '#666',
    fontFamily: 'monospace',
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  actionButton: {
    alignItems: 'center',
    padding: 15,
    backgroundColor: '#f8f8f8',
    borderRadius: 8,
    flex: 1,
    marginHorizontal: 5,
  },
  actionButtonText: {
    marginTop: 5,
    fontSize: 12,
    color: '#333',
    fontWeight: '600',
  },
  footer: {
    padding: 20,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 12,
    color: '#999',
    marginVertical: 2,
    textAlign: 'center',
  },
});
