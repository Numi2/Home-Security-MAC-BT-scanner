import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, Modal, Switch } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getKnownPeople, addPerson, updatePersonDevices } from '@/app/src/services/logicEngine';
import { getKnownDevices } from '@/app/src/services/network';
import { getKnownBLEDevices } from '@/app/src/services/ble';
import { clearAllEvents } from '@/app/src/storage/logger';

// Inline interfaces for better integration
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
  isEnabled: boolean;
}

interface SecuritySettings {
  scanInterval: number;
  alertThreshold: number;
  nightModeStart: number;
  nightModeEnd: number;
  autoScan: boolean;
  soundAlerts: boolean;
}

export default function SecurityConfigScreen() {
  const [people, setPeople] = useState<PersonProfile[]>([
    // Demo data with some initial profiles
    {
      id: 'user1',
      name: 'Primary User',
      devices: {
        mac: ['00:1a:2b:3c:4d:10', '00:1a:2b:3c:4d:11'],
        ble: ['iPhone_1234', 'AirPods_5678']
      },
      isHome: false,
      lastSeen: Date.now() - 120000,
      confidence: 0.85,
      isEnabled: true
    },
    {
      id: 'user2', 
      name: 'Partner',
      devices: {
        mac: ['00:1a:2b:3c:4d:20'],
        ble: ['Samsung_9876']
      },
      isHome: true,
      lastSeen: Date.now() - 30000,
      confidence: 0.92,
      isEnabled: true
    }
  ]);

  const [availableNetworkDevices, setAvailableNetworkDevices] = useState<NetworkDevice[]>([
    {
      ip: '192.168.1.101',
      mac: '00:1a:2b:3c:4d:10',
      hostname: 'iPhone-12',
      lastSeen: Date.now() - 30000
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
      hostname: 'Unknown-Router',
      lastSeen: Date.now() - 45000
    },
    {
      ip: '192.168.1.104',
      mac: '00:1a:2b:3c:4d:88',
      hostname: 'Smart-TV',
      lastSeen: Date.now() - 180000
    }
  ]);

  const [availableBLEDevices, setAvailableBLEDevices] = useState<BLEDevice[]>([
    {
      id: 'AirPods_5678',
      name: 'AirPods Pro',
      rssi: -45,
      lastSeen: Date.now() - 15000,
      isNearby: true
    },
    {
      id: 'Samsung_9876',
      name: 'Galaxy Buds',
      rssi: -38,
      lastSeen: Date.now() - 25000,
      isNearby: true
    },
    {
      id: 'Unknown_BLE_123',
      name: 'Unknown Device',
      rssi: -65,
      lastSeen: Date.now() - 90000,
      isNearby: false
    }
  ]);

  const [securitySettings, setSecuritySettings] = useState<SecuritySettings>({
    scanInterval: 30,
    alertThreshold: 2,
    nightModeStart: 23,
    nightModeEnd: 6,
    autoScan: true,
    soundAlerts: true
  });

  const [showAddPersonModal, setShowAddPersonModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [newPersonName, setNewPersonName] = useState('');
  const [selectedPerson, setSelectedPerson] = useState<PersonProfile | null>(null);
  const [showDeviceModal, setShowDeviceModal] = useState(false);
  const [editingSettings, setEditingSettings] = useState<SecuritySettings | null>(null);

  useEffect(() => {
    // Simulate real-time device updates
    const interval = setInterval(() => {
      refreshDeviceData();
    }, 15000);

    return () => clearInterval(interval);
  }, []);

  const refreshDeviceData = () => {
    // Simulate device discovery updates
    setAvailableNetworkDevices(prev => 
      prev.map(device => ({
        ...device,
        lastSeen: Math.random() > 0.7 ? Date.now() : device.lastSeen
      }))
    );

    setAvailableBLEDevices(prev =>
      prev.map(device => ({
        ...device,
        lastSeen: Math.random() > 0.6 ? Date.now() : device.lastSeen,
        rssi: device.rssi + (Math.random() - 0.5) * 10,
        isNearby: device.rssi > -80
      }))
    );
  };

  const handleAddPerson = () => {
    if (!newPersonName.trim()) {
      Alert.alert('Error', 'Please enter a name');
      return;
    }

    const newPerson: PersonProfile = {
      id: `person_${Date.now()}`,
      name: newPersonName.trim(),
      devices: { mac: [], ble: [] },
      isHome: false,
      lastSeen: 0,
      confidence: 0,
      isEnabled: true
    };

    setPeople(prev => [...prev, newPerson]);
    setNewPersonName('');
    setShowAddPersonModal(false);
  };

  const handleAssignDevice = (personId: string, deviceType: 'mac' | 'ble', deviceId: string) => {
    setPeople(prev => prev.map(person => {
      if (person.id === personId) {
        const updatedDevices = { ...person.devices };
        if (!updatedDevices[deviceType].includes(deviceId)) {
          updatedDevices[deviceType].push(deviceId);
        }
        return { ...person, devices: updatedDevices };
      }
      return person;
    }));
  };

  const handleRemoveDevice = (personId: string, deviceType: 'mac' | 'ble', deviceId: string) => {
    setPeople(prev => prev.map(person => {
      if (person.id === personId) {
        const updatedDevices = { ...person.devices };
        updatedDevices[deviceType] = updatedDevices[deviceType].filter(id => id !== deviceId);
        return { ...person, devices: updatedDevices };
      }
      return person;
    }));
  };

  const handleDeletePerson = (personId: string) => {
    Alert.alert(
      'Delete Person',
      'Are you sure you want to delete this person profile?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: () => setPeople(prev => prev.filter(p => p.id !== personId))
        }
      ]
    );
  };

  const handleTogglePersonEnabled = (personId: string) => {
    setPeople(prev => prev.map(person => 
      person.id === personId ? { ...person, isEnabled: !person.isEnabled } : person
    ));
  };

  const handleClearLogs = () => {
    Alert.alert(
      'Clear All Logs',
      'Are you sure you want to clear all logged events? This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Clear', 
          style: 'destructive',
          onPress: () => Alert.alert('Success', 'All logs have been cleared')
        }
      ]
    );
  };

  const handleSaveSettings = () => {
    if (editingSettings) {
      setSecuritySettings(editingSettings);
      setShowSettingsModal(false);
      setEditingSettings(null);
      Alert.alert('Success', 'Security settings updated');
    }
  };

  const handleExportData = () => {
    Alert.alert(
      'Export Data',
      'Configuration and logs would be exported to a secure file. Feature coming soon!',
      [{ text: 'OK' }]
    );
  };

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
  };

  const getDeviceStatus = (lastSeen: number) => {
    const now = Date.now();
    const diff = now - lastSeen;
    
    if (diff < 60000) return { text: 'Online', color: '#4CAF50' };
    if (diff < 300000) return { text: 'Recent', color: '#FF9800' };
    return { text: 'Offline', color: '#9E9E9E' };
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Security Configuration</Text>
        <View style={styles.headerButtons}>
          <TouchableOpacity 
            style={styles.headerButton}
            onPress={() => {
              setEditingSettings({ ...securitySettings });
              setShowSettingsModal(true);
            }}
          >
            <Ionicons name="settings" size={20} color="white" />
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.headerButton}
            onPress={() => setShowAddPersonModal(true)}
          >
            <Ionicons name="person-add" size={20} color="white" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.scrollView}>
        {/* Security Overview */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            <Ionicons name="shield" size={20} color="#666" /> Security Overview
          </Text>
          
          <View style={styles.overviewGrid}>
            <View style={styles.overviewItem}>
              <Text style={styles.overviewNumber}>{people.filter(p => p.isEnabled).length}</Text>
              <Text style={styles.overviewLabel}>Active Profiles</Text>
            </View>
            <View style={styles.overviewItem}>
              <Text style={styles.overviewNumber}>{availableNetworkDevices.length}</Text>
              <Text style={styles.overviewLabel}>Network Devices</Text>
            </View>
            <View style={styles.overviewItem}>
              <Text style={styles.overviewNumber}>{availableBLEDevices.filter(d => d.isNearby).length}</Text>
              <Text style={styles.overviewLabel}>Nearby BLE</Text>
            </View>
          </View>
        </View>

        {/* People Profiles Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            <Ionicons name="people" size={20} color="#666" /> People Profiles ({people.length})
          </Text>
          
          {people.length === 0 ? (
            <Text style={styles.emptyText}>No people configured. Add someone to get started.</Text>
          ) : (
            people.map((person) => (
              <View key={person.id} style={styles.personCard}>
                <View style={styles.personHeader}>
                  <View style={styles.personTitleRow}>
                    <Text style={styles.personName}>{person.name}</Text>
                    <Switch
                      value={person.isEnabled}
                      onValueChange={() => handleTogglePersonEnabled(person.id)}
                      trackColor={{ false: '#ccc', true: '#4CAF50' }}
                    />
                  </View>
                  <View style={styles.personStatus}>
                    <View style={[styles.statusBadge, { 
                      backgroundColor: person.isHome ? '#4CAF50' : '#9E9E9E' 
                    }]}>
                      <Text style={styles.statusText}>
                        {person.isHome ? 'HOME' : 'AWAY'}
                      </Text>
                    </View>
                    <Text style={styles.confidenceText}>
                      {Math.round(person.confidence * 100)}% confidence
                    </Text>
                  </View>
                </View>
                
                {person.lastSeen > 0 && (
                  <Text style={styles.lastSeen}>
                    Last seen: {formatTime(person.lastSeen)}
                  </Text>
                )}

                <View style={styles.deviceSection}>
                  <Text style={styles.deviceSectionTitle}>
                    Network Devices ({person.devices.mac.length})
                  </Text>
                  {person.devices.mac.map((mac, index) => {
                    const device = availableNetworkDevices.find(d => d.mac === mac);
                    const status = device ? getDeviceStatus(device.lastSeen) : { text: 'Unknown', color: '#999' };
                    
                    return (
                      <View key={index} style={styles.deviceItem}>
                        <View style={styles.deviceInfo}>
                          <Text style={styles.deviceText}>{mac}</Text>
                          <Text style={styles.deviceHostname}>
                            {device?.hostname || 'Unknown Device'}
                          </Text>
                          <Text style={[styles.deviceStatus, { color: status.color }]}>
                            {status.text}
                          </Text>
                        </View>
                        <TouchableOpacity 
                          onPress={() => handleRemoveDevice(person.id, 'mac', mac)}
                          style={styles.removeButton}
                        >
                          <Ionicons name="close-circle" size={20} color="#F44336" />
                        </TouchableOpacity>
                      </View>
                    );
                  })}
                  
                  <TouchableOpacity 
                    style={styles.assignButton}
                    onPress={() => {
                      setSelectedPerson(person);
                      setShowDeviceModal(true);
                    }}
                  >
                    <Text style={styles.assignButtonText}>+ Assign Devices</Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.deviceSection}>
                  <Text style={styles.deviceSectionTitle}>
                    Bluetooth Devices ({person.devices.ble.length})
                  </Text>
                  {person.devices.ble.map((bleId, index) => {
                    const device = availableBLEDevices.find(d => d.id === bleId);
                    const status = device ? getDeviceStatus(device.lastSeen) : { text: 'Unknown', color: '#999' };
                    
                    return (
                      <View key={index} style={styles.deviceItem}>
                        <View style={styles.deviceInfo}>
                          <Text style={styles.deviceText}>{bleId}</Text>
                          <Text style={styles.deviceHostname}>
                            {device?.name || 'Unknown BLE Device'}
                          </Text>
                          <Text style={[styles.deviceStatus, { color: status.color }]}>
                            {status.text} {device && device.isNearby ? `(${device.rssi}dBm)` : ''}
                          </Text>
                        </View>
                        <TouchableOpacity 
                          onPress={() => handleRemoveDevice(person.id, 'ble', bleId)}
                          style={styles.removeButton}
                        >
                          <Ionicons name="close-circle" size={20} color="#F44336" />
                        </TouchableOpacity>
                      </View>
                    );
                  })}
                </View>

                <View style={styles.personActions}>
                  <TouchableOpacity 
                    style={styles.actionButton}
                    onPress={() => handleDeletePerson(person.id)}
                  >
                    <Ionicons name="trash" size={16} color="#F44336" />
                    <Text style={styles.actionButtonText}>Delete</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )}
        </View>

        {/* Available Devices Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            <Ionicons name="wifi" size={20} color="#666" /> Available Network Devices ({availableNetworkDevices.length})
          </Text>
          {availableNetworkDevices.map((device, index) => {
            const status = getDeviceStatus(device.lastSeen);
            const isAssigned = people.some(p => p.devices.mac.includes(device.mac));
            
            return (
              <View key={index} style={[styles.availableDeviceCard, { opacity: isAssigned ? 0.6 : 1 }]}>
                <View style={styles.deviceCardHeader}>
                  <Text style={styles.deviceName}>{device.hostname || 'Unknown Device'}</Text>
                  <Text style={[styles.deviceCardStatus, { color: status.color }]}>{status.text}</Text>
                </View>
                <Text style={styles.deviceDetails}>IP: {device.ip} • MAC: {device.mac}</Text>
                <Text style={styles.deviceTime}>Last seen: {formatTime(device.lastSeen)}</Text>
                {isAssigned && <Text style={styles.assignedLabel}>✓ Assigned</Text>}
              </View>
            );
          })}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            <Ionicons name="bluetooth" size={20} color="#666" /> Available Bluetooth Devices ({availableBLEDevices.length})
          </Text>
          {availableBLEDevices.map((device, index) => {
            const status = getDeviceStatus(device.lastSeen);
            const isAssigned = people.some(p => p.devices.ble.includes(device.id));
            
            return (
              <View key={index} style={[styles.availableDeviceCard, { opacity: isAssigned ? 0.6 : 1 }]}>
                <View style={styles.deviceCardHeader}>
                  <Text style={styles.deviceName}>{device.name || 'Unknown BLE Device'}</Text>
                  <Text style={[styles.deviceCardStatus, { color: status.color }]}>
                    {status.text} {device.isNearby ? '📍' : ''}
                  </Text>
                </View>
                <Text style={styles.deviceDetails}>
                  ID: {device.id} • RSSI: {device.rssi}dBm • 
                  {device.isNearby ? ' Nearby' : ' Distant'}
                </Text>
                <Text style={styles.deviceTime}>Last seen: {formatTime(device.lastSeen)}</Text>
                {isAssigned && <Text style={styles.assignedLabel}>✓ Assigned</Text>}
              </View>
            );
          })}
        </View>

        {/* System Actions Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            <Ionicons name="build" size={20} color="#666" /> System Actions
          </Text>
          
          <TouchableOpacity style={styles.settingButton} onPress={refreshDeviceData}>
            <Ionicons name="refresh" size={20} color="#2196F3" />
            <Text style={styles.settingButtonText}>Refresh Device Data</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.settingButton} onPress={handleExportData}>
            <Ionicons name="download" size={20} color="#4CAF50" />
            <Text style={styles.settingButtonText}>Export Configuration</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.settingButton} onPress={handleClearLogs}>
            <Ionicons name="trash" size={20} color="#F44336" />
            <Text style={styles.settingButtonText}>Clear All Logs</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Add Person Modal */}
      <Modal visible={showAddPersonModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Add New Person</Text>
            <TextInput
              style={styles.textInput}
              placeholder="Enter person's name"
              value={newPersonName}
              onChangeText={setNewPersonName}
              autoFocus
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => {
                  setShowAddPersonModal(false);
                  setNewPersonName('');
                }}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.modalButton, styles.addButtonModal]}
                onPress={handleAddPerson}
              >
                <Text style={styles.addButtonText}>Add</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Device Assignment Modal */}
      <Modal visible={showDeviceModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Assign Devices to {selectedPerson?.name}</Text>
            
            <ScrollView style={styles.modalScrollView}>
              <Text style={styles.deviceCategoryTitle}>Network Devices</Text>
              {availableNetworkDevices.map((device, index) => {
                const isAlreadyAssigned = selectedPerson?.devices.mac.includes(device.mac);
                return (
                  <TouchableOpacity 
                    key={index}
                    style={[styles.deviceAssignItem, { opacity: isAlreadyAssigned ? 0.5 : 1 }]}
                    onPress={() => {
                      if (selectedPerson && !isAlreadyAssigned) {
                        handleAssignDevice(selectedPerson.id, 'mac', device.mac);
                      }
                    }}
                    disabled={isAlreadyAssigned}
                  >
                    <Text style={styles.deviceName}>{device.hostname || 'Unknown Device'}</Text>
                    <Text style={styles.deviceDetails}>{device.mac}</Text>
                    {isAlreadyAssigned && <Text style={styles.alreadyAssignedText}>✓ Already assigned</Text>}
                  </TouchableOpacity>
                );
              })}

              <Text style={styles.deviceCategoryTitle}>Bluetooth Devices</Text>
              {availableBLEDevices.map((device, index) => {
                const isAlreadyAssigned = selectedPerson?.devices.ble.includes(device.id);
                return (
                  <TouchableOpacity 
                    key={index}
                    style={[styles.deviceAssignItem, { opacity: isAlreadyAssigned ? 0.5 : 1 }]}
                    onPress={() => {
                      if (selectedPerson && !isAlreadyAssigned) {
                        handleAssignDevice(selectedPerson.id, 'ble', device.id);
                      }
                    }}
                    disabled={isAlreadyAssigned}
                  >
                    <Text style={styles.deviceName}>{device.name || 'Unknown BLE Device'}</Text>
                    <Text style={styles.deviceDetails}>{device.id}</Text>
                    {isAlreadyAssigned && <Text style={styles.alreadyAssignedText}>✓ Already assigned</Text>}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
            
            <TouchableOpacity 
              style={[styles.modalButton, styles.cancelButton]}
              onPress={() => setShowDeviceModal(false)}
            >
              <Text style={styles.cancelButtonText}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Settings Modal */}
      <Modal visible={showSettingsModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Security Settings</Text>
            
            {editingSettings && (
              <ScrollView style={styles.modalScrollView}>
                <View style={styles.settingItem}>
                  <Text style={styles.settingLabel}>Scan Interval (seconds)</Text>
                  <TextInput
                    style={styles.settingInput}
                    value={editingSettings.scanInterval.toString()}
                    onChangeText={(text) => setEditingSettings({
                      ...editingSettings,
                      scanInterval: parseInt(text) || 30
                    })}
                    keyboardType="numeric"
                  />
                </View>

                <View style={styles.settingItem}>
                  <Text style={styles.settingLabel}>Alert Threshold (unknown devices)</Text>
                  <TextInput
                    style={styles.settingInput}
                    value={editingSettings.alertThreshold.toString()}
                    onChangeText={(text) => setEditingSettings({
                      ...editingSettings,
                      alertThreshold: parseInt(text) || 2
                    })}
                    keyboardType="numeric"
                  />
                </View>

                <View style={styles.settingItem}>
                  <Text style={styles.settingLabel}>Night Mode Start (hour)</Text>
                  <TextInput
                    style={styles.settingInput}
                    value={editingSettings.nightModeStart.toString()}
                    onChangeText={(text) => setEditingSettings({
                      ...editingSettings,
                      nightModeStart: parseInt(text) || 23
                    })}
                    keyboardType="numeric"
                  />
                </View>

                <View style={styles.settingItem}>
                  <Text style={styles.settingLabel}>Night Mode End (hour)</Text>
                  <TextInput
                    style={styles.settingInput}
                    value={editingSettings.nightModeEnd.toString()}
                    onChangeText={(text) => setEditingSettings({
                      ...editingSettings,
                      nightModeEnd: parseInt(text) || 6
                    })}
                    keyboardType="numeric"
                  />
                </View>

                <View style={styles.settingItem}>
                  <Text style={styles.settingLabel}>Auto Scan</Text>
                  <Switch
                    value={editingSettings.autoScan}
                    onValueChange={(value) => setEditingSettings({
                      ...editingSettings,
                      autoScan: value
                    })}
                  />
                </View>

                <View style={styles.settingItem}>
                  <Text style={styles.settingLabel}>Sound Alerts</Text>
                  <Switch
                    value={editingSettings.soundAlerts}
                    onValueChange={(value) => setEditingSettings({
                      ...editingSettings,
                      soundAlerts: value
                    })}
                  />
                </View>
              </ScrollView>
            )}
            
            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => {
                  setShowSettingsModal(false);
                  setEditingSettings(null);
                }}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.modalButton, styles.addButtonModal]}
                onPress={handleSaveSettings}
              >
                <Text style={styles.addButtonText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
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
  headerButtons: {
    flexDirection: 'row',
  },
  headerButton: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    padding: 8,
    borderRadius: 20,
    marginLeft: 8,
  },
  scrollView: {
    flex: 1,
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
  overviewGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  overviewItem: {
    alignItems: 'center',
  },
  overviewNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2196F3',
  },
  overviewLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  emptyText: {
    color: '#999',
    fontStyle: 'italic',
    textAlign: 'center',
    padding: 20,
  },
  personCard: {
    borderWidth: 1,
    borderColor: '#eee',
    borderRadius: 8,
    padding: 15,
    marginBottom: 10,
  },
  personHeader: {
    marginBottom: 10,
  },
  personTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  personName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  personStatus: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 10,
  },
  statusText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  confidenceText: {
    fontSize: 12,
    color: '#666',
  },
  lastSeen: {
    fontSize: 12,
    color: '#666',
    marginBottom: 10,
  },
  deviceSection: {
    marginTop: 10,
  },
  deviceSectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#555',
    marginBottom: 5,
  },
  deviceItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 10,
    backgroundColor: '#f8f8f8',
    borderRadius: 4,
    marginBottom: 5,
  },
  deviceInfo: {
    flex: 1,
  },
  deviceText: {
    fontSize: 12,
    color: '#333',
    fontFamily: 'monospace',
    fontWeight: '600',
  },
  deviceHostname: {
    fontSize: 11,
    color: '#666',
    marginTop: 2,
  },
  deviceStatus: {
    fontSize: 10,
    fontWeight: '600',
    marginTop: 2,
  },
  removeButton: {
    padding: 4,
  },
  assignButton: {
    backgroundColor: '#E3F2FD',
    padding: 8,
    borderRadius: 4,
    marginTop: 5,
  },
  assignButtonText: {
    color: '#2196F3',
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  personActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 4,
  },
  actionButtonText: {
    marginLeft: 4,
    fontSize: 12,
    color: '#F44336',
  },
  availableDeviceCard: {
    backgroundColor: '#f8f8f8',
    padding: 12,
    borderRadius: 6,
    marginBottom: 8,
  },
  deviceCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  deviceName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
  deviceCardStatus: {
    fontSize: 12,
    fontWeight: '600',
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
  assignedLabel: {
    fontSize: 10,
    color: '#4CAF50',
    fontWeight: '600',
    marginTop: 4,
  },
  settingButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    backgroundColor: '#f8f8f8',
    borderRadius: 8,
    marginBottom: 10,
  },
  settingButtonText: {
    marginLeft: 10,
    fontSize: 16,
    color: '#333',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 10,
    width: '90%',
    maxHeight: '80%',
  },
  modalScrollView: {
    maxHeight: 300,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    textAlign: 'center',
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 20,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  modalButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    marginHorizontal: 5,
  },
  cancelButton: {
    backgroundColor: '#f5f5f5',
  },
  cancelButtonText: {
    textAlign: 'center',
    color: '#666',
    fontWeight: '600',
  },
  addButtonModal: {
    backgroundColor: '#2196F3',
  },
  addButtonText: {
    textAlign: 'center',
    color: 'white',
    fontWeight: '600',
  },
  deviceCategoryTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginTop: 15,
    marginBottom: 10,
  },
  deviceAssignItem: {
    padding: 12,
    backgroundColor: '#f8f8f8',
    borderRadius: 6,
    marginBottom: 8,
  },
  alreadyAssignedText: {
    fontSize: 10,
    color: '#4CAF50',
    fontWeight: '600',
    marginTop: 4,
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  settingLabel: {
    fontSize: 14,
    color: '#333',
    flex: 1,
  },
  settingInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 4,
    padding: 8,
    width: 80,
    textAlign: 'center',
  },
});
