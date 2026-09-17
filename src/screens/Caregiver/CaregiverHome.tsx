import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { db } from '../../services/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { useAuth } from '../../context/AuthContext';

export default function CaregiverHome() {
  const [code, setCode] = useState<string | null>(null);
  const { caregiverUid, signOutAll } = useAuth();

  const generatePairingCode = async () => {
    const sixDigit = Math.floor(100000 + Math.random() * 900000).toString();
    await addDoc(collection(db, 'pairingCodes'), {
      code: sixDigit,
      caregiverUid,
      patientId: `patient_${caregiverUid.slice(0, 6)}_${Date.now()}`,
      createdAt: serverTimestamp(),
      used: false,
      // NOTE: expiry enforcement comes in the Security Rules pass (Phase 7)
    });
    setCode(sixDigit);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Caregiver Dashboard</Text>
      <Text style={styles.sub}>Placeholder — charts arrive in Phase 5</Text>

      {code ? (
        <View style={styles.codeBox}>
          <Text style={styles.codeLabel}>Enter this code on the patient's phone:</Text>
          <Text style={styles.code}>{code}</Text>
        </View>
      ) : (
        <TouchableOpacity style={styles.button} onPress={generatePairingCode}>
          <Text style={styles.buttonText}>Generate Pairing Code</Text>
        </TouchableOpacity>
      )}

      <TouchableOpacity onPress={signOutAll}><Text style={styles.logout}>Log out</Text></TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, backgroundColor: '#FDF6EC' },
  heading: { fontSize: 28, fontWeight: 'bold', marginTop: 40 },
  sub: { color: '#666', marginBottom: 32 },
  codeBox: { backgroundColor: '#fff', borderRadius: 16, padding: 24, alignItems: 'center' },
  codeLabel: { fontSize: 16, textAlign: 'center', marginBottom: 12 },
  code: { fontSize: 48, fontWeight: 'bold', letterSpacing: 8, color: '#4A7C59' },
  button: { backgroundColor: '#4A7C59', padding: 18, borderRadius: 12, alignItems: 'center' },
  buttonText: { color: '#fff', fontSize: 18, fontWeight: '600' },
  logout: { color: '#B85C38', textAlign: 'center', marginTop: 40, fontSize: 16 },
});