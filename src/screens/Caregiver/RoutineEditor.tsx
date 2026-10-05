import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, FlatList } from 'react-native';
import { collection, addDoc } from 'firebase/firestore';
import { db } from '../../services/firebase';

const TYPES = ['medicine', 'hydration', 'appointment', 'activity'] as const;

export default function RoutineEditor({ route }: any) {
  const { patientId } = route.params;
  const [title, setTitle] = useState('');
  const [time, setTime] = useState('');       // "HH:MM" — keep simple for prototype
  const [type, setType] = useState<(typeof TYPES)[number]>('medicine');

  const save = async () => {
    if (!title || !/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) {
      Alert.alert('Check input', 'Need a title and time like 09:30');
      return;
    }
    await addDoc(collection(db, 'routineItems'), {
      patientId, type, title, time,
      recurrence: 'daily',
      completed: false,
      completedAt: null,
      updatedAt: Date.now(),
    });
    setTitle(''); setTime('');
    Alert.alert('Saved', `"${title}" added at ${time}`);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Add Routine for Patient</Text>

      <Text style={styles.label}>Title</Text>
      <TextInput style={styles.input} placeholder="e.g. Blood pressure tablet"
        value={title} onChangeText={setTitle} />

      <Text style={styles.label}>Time (24h, e.g. 09:30)</Text>
      <TextInput style={styles.input} placeholder="09:30" keyboardType="numbers-with-punctuation"
        value={time} onChangeText={setTime} maxLength={5} />

      <Text style={styles.label}>Type</Text>
      <View style={styles.typeRow}>
        {TYPES.map((t) => (
          <TouchableOpacity key={t} style={[styles.typeBtn, type === t && styles.typeBtnActive]}
            onPress={() => setType(t)}>
            <Text style={[styles.typeText, type === t && { color: '#fff' }]}>{t}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity style={styles.saveBtn} onPress={save}>
        <Text style={styles.saveText}>Save Routine</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, backgroundColor: '#FDF6EC' },
  heading: { fontSize: 26, fontWeight: 'bold', marginTop: 20, marginBottom: 20 },
  label: { fontSize: 16, marginBottom: 6, color: '#444' },
  input: { borderWidth: 2, borderColor: '#4A7C59', borderRadius: 12, padding: 14, fontSize: 18, marginBottom: 16, backgroundColor: '#fff' },
  typeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 24 },
  typeBtn: { paddingVertical: 10, paddingHorizontal: 14, borderRadius: 10, backgroundColor: '#E8E4DA' },
  typeBtnActive: { backgroundColor: '#4A7C59' },
  typeText: { fontSize: 15, textTransform: 'capitalize' },
  saveBtn: { backgroundColor: '#4A7C59', padding: 18, borderRadius: 12, alignItems: 'center' },
  saveText: { color: '#fff', fontSize: 18, fontWeight: '600' },
});