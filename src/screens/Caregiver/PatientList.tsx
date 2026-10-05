import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList } from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { useAuth } from '../../context/AuthContext';

export default function PatientList() {
  const { caregiverUid } = useAuth();
  const navigation = useNavigation<any>();
  const [patients, setPatients] = useState<any[]>([]);

  const load = async () => {
    if (!caregiverUid) return;
    const q = query(
      collection(db, 'patients'),
      where('caregiverUid', '==', caregiverUid),
      where('status', '==', 'active')
    );
    const snap = await getDocs(q);
    setPatients(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
  };

  // Reload every time screen comes into focus (fresh approvals show up)
  useFocusEffect(
    React.useCallback(() => { load(); }, [])
  );

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>My Patients ({patients.length})</Text>

      <FlatList
        data={patients}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
  <View style={styles.card}>
    <TouchableOpacity
      style={{ flex: 1 }}
      onPress={() => navigation.navigate('Dashboard', { patientId: item.id })}
    >
      <Text style={styles.name}>👤 {item.id.slice(0, 24)}</Text>
      <Text style={styles.sub}>Tap for dashboard ›</Text>
    </TouchableOpacity>

    <View style={styles.actions}>
      <TouchableOpacity
        style={[styles.actionBtn, { backgroundColor: '#4A7C59' }]}
        onPress={() => navigation.navigate('RoutineEditor', { patientId: item.id })}
      >
        <Text style={styles.actionText}>+ Routine</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.actionBtn, { backgroundColor: '#B85C38' }]}
        onPress={() => navigation.navigate('Dashboard', { patientId: item.id })}
      >
        <Text style={styles.actionText}>Progress</Text>
      </TouchableOpacity>
    </View>
  </View>
)}
        ListEmptyComponent={
          <Text style={styles.empty}>
            No active patients yet.{'\n'}
            Approve a pending registration first.
          </Text>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, backgroundColor: '#FDF6EC' },
  heading: { fontSize: 26, fontWeight: 'bold', marginTop: 40, marginBottom: 20 },
  name: { fontSize: 18, fontWeight: '600' },
  sub: { fontSize: 14, color: '#888', marginTop: 6 },
  empty: { textAlign: 'center', color: '#666', fontSize: 16, marginTop: 60, lineHeight: 24 },
  card: {
  flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff',
  borderRadius: 14, padding: 16, marginBottom: 14,
  borderLeftWidth: 6, borderLeftColor: '#4A7C59',
  },
actions: { flexDirection: 'row', gap: 8 },
actionBtn: { paddingVertical: 10, paddingHorizontal: 12, borderRadius: 10 },
actionText: { color: '#fff', fontSize: 13, fontWeight: '600' },
});