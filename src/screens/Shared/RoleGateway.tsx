import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';

export default function RoleGateway() {
  const navigation = useNavigation<any>();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Nozomi</Text>
      <Text style={styles.subtitle}>Cognitive care, made simple</Text>

      <TouchableOpacity
        style={[styles.button, styles.caregiverBtn]}
        onPress={() => navigation.navigate('CaregiverAuth')}
      >
        <Text style={styles.buttonText}>I am a Caregiver</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.button, styles.patientBtn]}
        onPress={() => navigation.navigate('PatientPair')}
      >
        <Text style={styles.buttonText}>I am a Patient</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 24, backgroundColor: '#FDF6EC' },
  title: { fontSize: 42, fontWeight: 'bold', textAlign: 'center', marginBottom: 8 },
  subtitle: { fontSize: 16, textAlign: 'center', marginBottom: 60, color: '#666' },
  button: { paddingVertical: 22, borderRadius: 16, alignItems: 'center', marginBottom: 20 },
  caregiverBtn: { backgroundColor: '#4A7C59' },
  patientBtn: { backgroundColor: '#B85C38' },
  buttonText: { color: '#fff', fontSize: 20, fontWeight: '600' },
});