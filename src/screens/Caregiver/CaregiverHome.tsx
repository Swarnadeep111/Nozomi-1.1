import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';        // ← ADD
import { db } from '../../services/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { useAuth } from '../../context/AuthContext';
import * as Clipboard from 'expo-clipboard';

export default function CaregiverHome() {
  const [code, setCode] = useState<string | null>(null);
  const [pairedPatientId, setPairedPatientId] = useState<string | null>(null);  // ← ADD
  const { caregiverUid, signOutAll } = useAuth();
  const navigation = useNavigation<any>();                                      // ← ADD

  const generateRegistrationCode = async () => {
  const sixDigit = Math.floor(100000 + Math.random() * 900000).toString();
  const patientId = `patient_${caregiverUid!.slice(0, 6)}_${Date.now()}`;
  try {
    await addDoc(collection(db, 'pairingCodes'), {
      code: sixDigit,
      caregiverUid,
      patientId,
      status: 'pending',        // ← the production flow: claimed ≠ approved
      createdAt: serverTimestamp(),
    });
    setCode(sixDigit);
  } catch (e: any) {
    Alert.alert('Failed to create code', e.message);
  }
  };



  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Caregiver Dashboard</Text>

      {/* Register New Patient — generates a 6-digit registration code */}
<TouchableOpacity style={styles.button} onPress={generateRegistrationCode}>
  <Text style={styles.buttonText}>Register New Patient</Text>
</TouchableOpacity>

{/* Shows the code after generation — give it to the patient to enter */}
{code && (
  <View style={styles.codeBox}>
    <Text style={styles.codeLabel}>Patient should enter this code on their device:</Text>
    <Text style={styles.code}>{code}</Text>

    <TouchableOpacity
      style={styles.copyBtn}
      onPress={async () => {
        await Clipboard.setStringAsync(code);
        Alert.alert('Copied ✅', 'Pairing code copied to clipboard');
      }}
    >
      <Text style={styles.copyText}>📋 Copy Code</Text>
    </TouchableOpacity>

    <Text style={styles.codeHint}>
      Registration stays PENDING until you approve it in "Pending Approvals"
    </Text>
  </View>
)}

      {/* NEW — replaces the old pairedPatientId-only buttons */}
      <TouchableOpacity style={styles.button}
        onPress={() => navigation.navigate('PatientList')}>
        <Text style={styles.buttonText}>My Patients</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.button}
        onPress={() => navigation.navigate('PatientApprovals')}>
        <Text style={styles.buttonText}>Pending Approvals</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.button} onPress={() => navigation.navigate('BtHub')}>
      <Text style={styles.buttonText}>📡 Nearby Sync (Bluetooth)</Text>
      </TouchableOpacity>
      

      <TouchableOpacity onPress={signOutAll}>
        <Text style={styles.logout}>Log out</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, backgroundColor: '#FDF6EC' },
  heading: { fontSize: 28, fontWeight: 'bold', marginTop: 40 },
  codeBox: { backgroundColor: '#fff', borderRadius: 16, padding: 24, alignItems: 'center', marginBottom: 24 },
  codeLabel: { fontSize: 16, textAlign: 'center', marginBottom: 12 },
  code: { fontSize: 48, fontWeight: 'bold', letterSpacing: 8, color: '#4A7C59' },
  button: { backgroundColor: '#4A7C59', padding: 18, borderRadius: 12, alignItems: 'center', marginTop: 16 },
  buttonText: { color: '#fff', fontSize: 18, fontWeight: '600' },
  logout: { color: '#B85C38', textAlign: 'center', marginTop: 40, fontSize: 16 },
  codeHint: { fontSize: 13, color: '#888', textAlign: 'center', marginTop: 10 },
  copyBtn: {
    backgroundColor: '#E8F0EA', paddingVertical: 12, paddingHorizontal: 24,
    borderRadius: 10, marginTop: 16, alignSelf: 'center',
  },
  copyText: { color: '#4A7C59', fontSize: 16, fontWeight: '600' },
});