import React, { useState, useCallback, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { useAuth } from '../../context/AuthContext';
import { insertGameSession, getRoutineItems } from '../../services/db';
import { useSync } from '../../context/SyncContext';
import type { RoutineItem } from '../../types';

export default function PatientHome() {
  const { patientId, signOutAll } = useAuth();
  const { triggerSync, isOnline, isSyncing } = useSync();
  const navigation = useNavigation<any>();

  const [dueNow, setDueNow] = useState<RoutineItem | null>(null);

  // null = still checking, false = pending/unknown, true = approved
  const [active, setActive] = useState<boolean | null>(null);

  // Live listener: the screen unlocks the moment the caregiver approves,
  // with no need to reopen the app.
  useEffect(() => {
    if (!patientId) return;
    const unsub = onSnapshot(
      doc(db, 'patients', patientId),
      (snap) => setActive(snap.data()?.status === 'active'),
      (err) => {
        console.warn('Patient status listener failed:', err.message);
        // Fail closed: if we can't verify approval, don't unlock
        setActive(false);
      }
    );
    return unsub;
  }, [patientId]);

  useFocusEffect(
    useCallback(() => {
      if (!patientId || active !== true) return;
      (async () => {
        const items = await getRoutineItems(patientId);
        const t = new Date();
        const cur = `${String(t.getHours()).padStart(2, '0')}:${String(t.getMinutes()).padStart(2, '0')}`;
        setDueNow(items.find((i) => !i.completed && i.time <= cur) ?? null);
      })();
    }, [patientId, active])
  );

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

  // ── Still checking status ──
  if (active === null) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color="#B85C38" />
      </View>
    );
  }

  // ── Not approved yet ──
  if (active === false) {
    return (
      <View style={[styles.container, styles.centered]}>
        <Text style={styles.waitEmoji}>⏳</Text>
        <Text style={styles.waitTitle}>Waiting for approval</Text>
        <Text style={styles.waitBody}>
          Waiting for your caregiver to approve. Ask them to confirm your registration.
        </Text>
        <TouchableOpacity onPress={signOutAll}>
          <Text style={styles.logout}>Use a different code</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ── Approved ──
  return (
    <View style={styles.container}>
      <Text style={styles.greeting}>Hello!</Text>
      <Text style={styles.subheading}>Welcome to Nozomi</Text>

      {dueNow && (
        <TouchableOpacity
          style={styles.dueBanner}
          onPress={() => navigation.navigate('TodayRoutine' as never)}
        >
          <Text style={styles.dueText}>
            ⏰ Time for: {dueNow.title} ({dueNow.time})
          </Text>
        </TouchableOpacity>
      )}

      <TouchableOpacity style={styles.card} onPress={() => navigation.navigate('TodayRoutine')}>
        <Text style={styles.cardTitle}>Today's Routine</Text>
        <Text style={styles.cardBody}>{dueNow ? 'You have something due!' : 'Tap to view'}</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.card} onPress={() => navigation.navigate('GameHub')}>
        <Text style={styles.cardTitle}>Games</Text>
        <Text style={styles.cardBody}>Tap to play</Text>
      </TouchableOpacity>

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

      <TouchableOpacity style={styles.debugBtn} onPress={() => navigation.navigate('BtServer')}>
      <Text style={styles.debugText}>[BT] Start Bluetooth Sync Server</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={signOutAll}>
        <Text style={styles.logout}>Log out</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, backgroundColor: '#FDF6EC' },
  centered: { justifyContent: 'center', alignItems: 'center' },
  greeting: { fontSize: 40, fontWeight: 'bold', marginTop: 40 },
  subheading: { fontSize: 20, color: '#666', marginBottom: 32 },
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 24, marginBottom: 16 },
  cardTitle: { fontSize: 24, fontWeight: '600', marginBottom: 8 },
  cardBody: { fontSize: 16, color: '#999' },
  dueBanner: { backgroundColor: '#B85C38', borderRadius: 14, padding: 20, marginBottom: 20 },
  dueText: { color: '#fff', fontSize: 20, fontWeight: '600' },
  debugBtn: { backgroundColor: '#E8E4DA', padding: 14, borderRadius: 10, alignItems: 'center', marginTop: 12 },
  debugText: { color: '#555', fontSize: 14 },
  logout: { color: '#B85C38', textAlign: 'center', marginTop: 40, fontSize: 16 },
  waitEmoji: { fontSize: 64, marginBottom: 16 },
  waitTitle: { fontSize: 30, fontWeight: 'bold', textAlign: 'center', marginBottom: 12 },
  waitBody: { fontSize: 18, color: '#666', textAlign: 'center', lineHeight: 26, paddingHorizontal: 12 },
});