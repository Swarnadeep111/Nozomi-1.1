import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { collection, query, where, getDocs, doc, setDoc, updateDoc } from 'firebase/firestore';
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
      // 1. Look up a PENDING pairing code (patient is unauthenticated here)
      const q = query(
        collection(db, 'pairingCodes'),
        where('code', '==', code),
        where('status', '==', 'pending')
      );
      const snapshot = await getDocs(q);

      if (snapshot.empty) {
        Alert.alert('Not found', 'That code is not valid. Check with your caregiver.');
        return;
      }

      const pairing = snapshot.docs[0];
      const patientId = pairing.data().patientId as string;
      const caregiverUid = pairing.data().caregiverUid as string;

      // 2. Claim the code (prevents reuse by anyone else)
      await updateDoc(doc(db, 'pairingCodes', pairing.id), {
        status: 'claimed',
      });

      // 3. Anonymous auth — the patient device becomes an authenticated
      //    user so later syncs pass security rules
      const anonCred = await signInAnonymously(auth);

      // 4. Create PENDING patient — caregiver must approve before
      //    routines/games become available
      await setDoc(doc(db, 'patients', patientId), {
        caregiverUid,
        status: 'pending',
        createdAt: Date.now(),
        deviceUid: anonCred.user.uid,
      });

      // 5. Register the device identity
      await setDoc(doc(db, 'users', anonCred.user.uid), {
        role: 'patient',
        status: 'pending',
        pairedPatientId: patientId,
        pairedCaregiver: caregiverUid,
        createdAt: Date.now(),
      });

      // 6. Device remembers the pairing — but PatientHome gates the
      //    core loop on approval status
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