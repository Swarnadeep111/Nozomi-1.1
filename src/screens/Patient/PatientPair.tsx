import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { collection, query, where, getDocs, updateDoc, doc, setDoc } from 'firebase/firestore';
import { signInAnonymously } from 'firebase/auth';
import { db, auth } from '../../services/firebase';
import { useAuth } from '../../context/AuthContext';

export default function PatientPair() {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const { signInPatient } = useAuth();

  const handlePair = async () => {
    if (code.length !== 6) {
      Alert.alert('Wrong code', 'Please enter the 6-digit code from your caregiver.');
      return;
    }
    setLoading(true);
    try {
      const q = query(collection(db, 'pairingCodes'), where('code', '==', code), where('used', '==', false));
      const snapshot = await getDocs(q);

      if (snapshot.empty) {
        Alert.alert('Not found', 'That code is not valid. Check with your caregiver.');
        return;
      }

      const pairing = snapshot.docs[0];
      const patientId = pairing.data().patientId as string;

      // Atomically claim the code
      await updateDoc(doc(db, 'pairingCodes', pairing.id), { used: true });

      // Give the patient device an anonymous Firebase session
      // so sync pushes pass security rules
      const anonCred = await signInAnonymously(auth);
      await setDoc(doc(db, 'users', anonCred.user.uid), {
        role: 'patient',
        pairedPatientId: patientId,
        pairedCaregiver: pairing.data().caregiverUid,
        createdAt: Date.now(),
      });

      await signInPatient(patientId);
    } catch (e: any) {
      Alert.alert('Pairing failed', e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Enter Pairing Code</Text>
      <Text style={styles.hint}>Ask your family member for the 6-digit number</Text>
      <TextInput
        style={styles.codeInput}
        placeholder="000000"
        keyboardType="number-pad"
        maxLength={6}
        value={code}
        onChangeText={(t) => setCode(t.replace(/[^0-9]/g, ''))}
      />
      <TouchableOpacity style={styles.button} onPress={handlePair} disabled={loading}>
        <Text style={styles.buttonText}>{loading ? 'Connecting...' : 'Start'}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, justifyContent: 'center', backgroundColor: '#FDF6EC' },
  title: { fontSize: 32, fontWeight: 'bold', textAlign: 'center' },
  hint: { fontSize: 18, textAlign: 'center', color: '#666', marginVertical: 24 },
  codeInput: { fontSize: 40, letterSpacing: 12, textAlign: 'center', borderWidth: 3, borderColor: '#B85C38', borderRadius: 16, padding: 16, marginBottom: 24, backgroundColor: '#fff' },
  button: { backgroundColor: '#B85C38', padding: 20, borderRadius: 16, alignItems: 'center' },
  buttonText: { color: '#fff', fontSize: 20, fontWeight: '600' },
});