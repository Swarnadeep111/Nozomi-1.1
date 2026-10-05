import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, Alert } from 'react-native';
import { collection, query, where, onSnapshot, updateDoc, doc } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { useAuth } from '../../context/AuthContext';

export default function PatientApprovals({ navigation }: any) {
  const { caregiverUid } = useAuth();
  const [pending, setPending] = useState<any[]>([]);

  // LIVE listener — pending requests appear the moment a patient pairs
  useEffect(() => {
    if (!caregiverUid) return;
    const q = query(
      collection(db, 'patients'),
      where('caregiverUid', '==', caregiverUid),
      where('status', '==', 'pending')
    );
    return onSnapshot(q, (snap) =>
      setPending(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
    );
  }, [caregiverUid]);

  const approve = async (patientId: string) => {
    try {
      await updateDoc(doc(db, 'patients', patientId), {
        status: 'active',
        approvedAt: Date.now(),
        approvedBy: caregiverUid,
      });
      Alert.alert('Approved ✅', 'Patient now has full access.');
    } catch (e: any) {
      Alert.alert('Approval failed', e.message);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Pending Approvals ({pending.length})</Text>

      <FlatList
        data={pending}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <Text style={styles.name}>{item.id}</Text>
              <Text style={styles.sub}>
                Requested: {new Date(item.createdAt).toLocaleString()}
              </Text>
            </View>
            <TouchableOpacity style={styles.approveBtn} onPress={() => approve(item.id)}>
              <Text style={styles.btnText}>✓ Approve</Text>
            </TouchableOpacity>
          </View>
        )}
        ListEmptyComponent={
          <Text style={styles.empty}>
            No pending requests.{'\n'}
            When a patient enters your registration code, they appear here.
          </Text>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, backgroundColor: '#FDF6EC' },
  heading: { fontSize: 26, fontWeight: 'bold', marginTop: 40, marginBottom: 20 },
  row: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff',
    borderRadius: 14, padding: 18, marginBottom: 12,
  },
  name: { fontSize: 16, fontWeight: '600' },
  sub: { fontSize: 13, color: '#888', marginTop: 4 },
  approveBtn: { backgroundColor: '#4A7C59', paddingVertical: 12, paddingHorizontal: 18, borderRadius: 10 },
  btnText: { color: '#fff', fontWeight: '600', fontSize: 15 },
  empty: { textAlign: 'center', color: '#666', fontSize: 16, marginTop: 60, lineHeight: 24 },
});