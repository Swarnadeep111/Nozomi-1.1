import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import RNBluetoothClassic from 'react-native-bluetooth-classic';
import { SERVICE_UUID } from '../../direct/config';

export default function BtServerScreen() {
  const [status, setStatus] = useState('Starting...');
  const [connections, setConnections] = useState(0);

  useEffect(() => {
    let accepting = true;

    (async () => {
      const ok = await RNBluetoothClassic.isBluetoothEnabled();
      if (!ok) { setStatus('Bluetooth is OFF — please enable it'); return; }
      setStatus('Advertising — waiting for caregiver...');
      while (accepting) {
        try {
          const device = await RNBluetoothClassic.acceptFromRemoteDevice(SERVICE_UUID);
          setStatus(`Connected: ${device.name ?? device.address}`);
          setConnections((c) => c + 1);
          // B4 will handle data exchange here — for now, hold & close
          await RNBluetoothClassic.disconnectFromDevice(device.address);
          setStatus('Sync complete — waiting again...');
        } catch (e) {
          if (!accepting) break;
          console.warn('Accept error:', e);
        }
      }
    })();

    return () => { accepting = false; RNBluetoothClassic.cancelAccept(); };
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Bluetooth Sync</Text>
      <Text style={styles.status}>{status}</Text>
      <Text style={styles.meta}>Connections handled: {connections}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#FDF6EC', padding: 24,
  },
  title: { fontSize: 34, fontWeight: 'bold', marginBottom: 20 },
  status: {
    fontSize: 20, color: '#4A7C59', fontWeight: '600',
    textAlign: 'center', marginBottom: 16, minHeight: 30,
  },
  meta: { fontSize: 15, color: '#888' },
});