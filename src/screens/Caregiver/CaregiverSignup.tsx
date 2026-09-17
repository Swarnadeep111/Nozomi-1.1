import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { auth, db } from '../../services/firebase';
import { doc, setDoc } from 'firebase/firestore';
import { useAuth } from '../../context/AuthContext';

export default function CaregiverSignup() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { signInCaregiver } = useAuth();

  const handleSignup = async () => {
    if (!email || password.length < 6) {
      Alert.alert('Check details', 'Valid email and 6+ character password needed.');
      return;
    }
    setLoading(true);
    try {
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      await setDoc(doc(db, 'users', cred.user.uid), {
        role: 'caregiver',
        email,
        createdAt: Date.now(),
      });
      await signInCaregiver(cred.user.uid);
    } catch (e: any) {
      Alert.alert('Signup failed', e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <TextInput style={styles.input} placeholder="Email" autoCapitalize="none" keyboardType="email-address" value={email} onChangeText={setEmail} />
      <TextInput style={styles.input} placeholder="Password (min 6 chars)" secureTextEntry value={password} onChangeText={setPassword} />
      <TouchableOpacity style={styles.button} onPress={handleSignup} disabled={loading}>
        <Text style={styles.buttonText}>{loading ? 'Creating...' : 'Create Account'}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, justifyContent: 'center', backgroundColor: '#FDF6EC' },
  input: { borderWidth: 2, borderColor: '#4A7C59', borderRadius: 12, padding: 16, fontSize: 18, marginBottom: 16, backgroundColor: '#fff' },
  button: { backgroundColor: '#4A7C59', padding: 18, borderRadius: 12, alignItems: 'center' },
  buttonText: { color: '#fff', fontSize: 18, fontWeight: '600' },
});