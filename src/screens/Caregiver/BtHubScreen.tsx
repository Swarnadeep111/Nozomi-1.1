import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList } from 'react-native';
import RNBluetoothClassic from 'react-native-bluetooth-classic';
import { SERVICE_UUID } from '../../direct/config';

export default function BtHubScreen() {
  const [devices, setDevices] = useState<any[]>([]);
  const [status, setStatus] = useState('');

  // List BONDED devices — both phones must be paired once in
  // Android Bluetooth settings (app-layer crypto removes this later)
  const scanBonded = async () => {
  try {
    const bonded = await RNBluetoothClassic.getBondedDevices();
    setDevices(bonded);
    setStatus(`Found ${bonded.length} paired device(s)`);
    React.useEffect(() => {
    console.log('BT API methods:', Object.keys(RNBluetoothClassic));
    }, []);
  } catch (e: any) {
    setStatus(`Scan failed: ${e.message}`);   // will tell you if BT is off
  }
};

  const connectTo = async (address: string) => {
  try {
    setStatus(`Connecting to ${address}...`);
    const connected = await RNBluetoothClassic.connectToRemoteDevice(
      address,
      { uuid: SERVICE_UUID }        // ← options object, not a bare string
    );
    setStatus(connected ? '✅ Connected!' : '❌ Connection failed');
  } catch (e: any) {
    setStatus(`Connect failed: ${e.message}`);
  }
};

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Nearby Patient Sync</Text>
      <TouchableOpacity style={styles.button} onPress={scanBonded}>
        <Text style={styles.btnText}>Scan for Paired Devices</Text>
      </TouchableOpacity>

      
      <Text style={styles.status}>{status}</Text>
      <FlatList
        data={devices}
        keyExtractor={(d) => d.address}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.card} onPress={() => connectTo(item.address)}>
            <Text style={styles.name}>{item.name ?? 'Unknown device'}</Text>
            <Text style={styles.sub}>{item.address}</Text>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <Text style={styles.empty}>No paired devices. Pair the phones in Android Settings first.</Text>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, backgroundColor: '#FDF6EC' },
  heading: { fontSize: 26, fontWeight: 'bold', marginTop: 40, marginBottom: 20 },
  button: { backgroundColor: '#4A7C59', padding: 18, borderRadius: 12, alignItems: 'center' },
  btnText: { color: '#fff', fontSize: 18, fontWeight: '600' },
  status: { fontSize: 16, color: '#444', marginVertical: 16, minHeight: 22 },
  card: {
    backgroundColor: '#fff', borderRadius: 14, padding: 18, marginBottom: 12,
    borderLeftWidth: 6, borderLeftColor: '#4A7C59',
  },
  name: { fontSize: 17, fontWeight: '600' },
  sub: { fontSize: 13, color: '#888', marginTop: 4 },
  empty: { textAlign: 'center', color: '#666', fontSize: 15, marginTop: 40, lineHeight: 22 },
});