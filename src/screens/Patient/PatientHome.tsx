import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { insertGameSession } from '../../services/db';
import { useSync } from '../../context/SyncContext';

export default function PatientHome() {
  const { patientId, signOutAll } = useAuth();
  const { triggerSync, isOnline, isSyncing } = useSync();

  const seedTestSessions = async () => {
    if (!patientId) return;
    const now = Date.now();
    await insertGameSession({
      id: `test_${now}_1`,
      patientId,
      gameType: 'memory',
      score: 70 + Math.floor(Math.random() * 30),
      accuracy: 0.7 + Math.random() * 0.3,
      avgResponseTimeMs: 1500 + Math.floor(Math.random() * 1000),
      attempts: 2,
      difficulty: 2,
      timestamp: now,
      synced: false,
      updatedAt: now,
    });
    await insertGameSession({
      id: `test_${now}_2`,
      patientId,
      gameType: 'attention',
      score: 60 + Math.floor(Math.random() * 30),
      accuracy: 0.6 + Math.random() * 0.3,
      avgResponseTimeMs: 1800 + Math.floor(Math.random() * 1000),
      attempts: 3,
      difficulty: 1,
      timestamp: now + 1,
      synced: false,
      updatedAt: now + 1,
    });
    console.log('Seeded 2 test sessions — check sync');
  };

  return (
    <View style={styles.container}>
      <Text style={styles.greeting}>Hello!</Text>
      <Text style={styles.subheading}>Welcome to Nozomi</Text>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Today's Routine</Text>
        <Text style={styles.cardBody}>Coming in Phase 3</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Games</Text>
        <Text style={styles.cardBody}>Coming in Phase 4</Text>
      </View>

      {/* ─── DEBUG CONTROLS — remove before Phase 7 polish ─── */}
      <TouchableOpacity style={styles.debugBtn} onPress={seedTestSessions}>
        <Text style={styles.debugText}>[DEBUG] Seed 2 test sessions</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.debugBtn} onPress={triggerSync}>
        <Text style={styles.debugText}>
          [DEBUG] Sync now {isSyncing ? '...(syncing)' : isOnline ? '' : '(offline)'}
        </Text>
      </TouchableOpacity>
      {/* ─── END DEBUG ─── */}

      <TouchableOpacity onPress={signOutAll}>
        <Text style={styles.logout}>Log out</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, backgroundColor: '#FDF6EC' },
  greeting: { fontSize: 40, fontWeight: 'bold', marginTop: 40 },
  subheading: { fontSize: 20, color: '#666', marginBottom: 32 },
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 24, marginBottom: 16 },
  cardTitle: { fontSize: 24, fontWeight: '600', marginBottom: 8 },
  cardBody: { fontSize: 16, color: '#999' },
  debugBtn: { backgroundColor: '#E8E4DA', padding: 14, borderRadius: 10, alignItems: 'center', marginTop: 12 },
  debugText: { color: '#555', fontSize: 14 },
  logout: { color: '#B85C38', textAlign: 'center', marginTop: 40, fontSize: 16 },
});