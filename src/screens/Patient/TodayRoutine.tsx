import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { getRoutineItems, markRoutineComplete } from '../../services/db';
import { useAuth } from '../../context/AuthContext';
import { useSync } from '../../context/SyncContext';
import type { RoutineItem } from '../../types';

export default function TodayRoutine() {
  const { patientId } = useAuth();
  const { triggerSync } = useSync();
  const [items, setItems] = useState<RoutineItem[]>([]);

  const load = useCallback(async () => {
    if (!patientId) return;
    setItems(await getRoutineItems(patientId));
  }, [patientId]);

  // Reload + pull fresh data every time the screen is focused
  useFocusEffect(useCallback(() => {
    load();
    triggerSync(); // pulls caregiver's latest routines (only works online)
  }, [load]));

  const complete = async (item: RoutineItem) => {
    await markRoutineComplete(item.id, Date.now()); // synced=0 → auto-pushes later
    load();
  };

  const now = new Date();
  const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Today</Text>
      <FlatList
        data={items}
        keyExtractor={(i) => i.id}
        refreshControl={<RefreshControl refreshing={false} onRefresh={triggerSync} />}
        renderItem={({ item }) => {
          const overdue = !item.completed && item.time < currentTime;
          return (
            <TouchableOpacity
              style={[styles.card, item.completed && styles.done, overdue && styles.overdue]}
              onPress={() => !item.completed && complete(item)}>
              <Text style={styles.time}>{item.time}</Text>
              <Text style={[styles.title, item.completed && styles.doneText]}>{item.title}</Text>
              <Text style={styles.type}>{item.type}</Text>
              <Text style={styles.action}>{item.completed ? '✓ Done' : 'Tap when done'}</Text>
            </TouchableOpacity>
          );
        }}
        ListEmptyComponent={<Text style={styles.empty}>No routines yet — they appear when your family member adds them (needs internet once).</Text>}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, backgroundColor: '#FDF6EC' },
  heading: { fontSize: 40, fontWeight: 'bold', marginTop: 40, marginBottom: 20 },
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 20, marginBottom: 14 },
  done: { opacity: 0.55 },
  overdue: { borderWidth: 3, borderColor: '#B85C38' },
  time: { fontSize: 28, fontWeight: 'bold', color: '#4A7C59' },
  title: { fontSize: 22, marginTop: 4 },
  doneText: { textDecorationLine: 'line-through' },
  type: { fontSize: 14, color: '#999', textTransform: 'capitalize' },
  action: { fontSize: 15, color: '#B85C38', marginTop: 8 },
  empty: { textAlign: 'center', color: '#666', fontSize: 16, marginTop: 40 },
});