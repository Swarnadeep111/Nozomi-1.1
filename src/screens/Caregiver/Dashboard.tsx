import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { engagementScore, trend } from '../../utils/scoreEngine';
import type { GameSession } from '../../types';
import { ActivityIndicator } from 'react-native';


export default function Dashboard({ route }: any) {
  const { patientId } = route.params;
  const [sessions, setSessions] = useState<GameSession[]>([]);

  useEffect(() => {
    const q = query(collection(db, 'gameSessions'),
      where('patientId', '==', patientId), orderBy('timestamp', 'desc'));
    return onSnapshot(q, (snap) =>  // LIVE listener — updates in real time on sync!
      setSessions(snap.docs.map((d) => d.data() as GameSession)));
  }, [patientId]);

  const score = engagementScore(sessions);
  const tr = trend(sessions);
  const last8 = [...sessions].slice(0, 8).reverse();

  const [listenerKey, setListenerKey] = useState(0);

  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
  const q = query(collection(db, 'gameSessions'),
    where('patientId', '==', patientId), orderBy('timestamp', 'desc'));
  const unsub = onSnapshot(q, (snap) =>
    setSessions(snap.docs.map((d) => d.data() as GameSession)));
  return unsub;
  }, [patientId, listenerKey]);   // ← listenerKey added: bumping it re-subscribes

  const manualRefresh = async () => {
  setRefreshing(true);
  // Re-establish the listener: unsubscribe + resubscribe forces a fresh read
  // Simplest reliable approach: bump a key that re-runs the useEffect
  setListenerKey((k) => k + 1);
  setTimeout(() => setRefreshing(false), 1200); // brief visual feedback
};

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.heading}>Patient Progress</Text>

      <View style={styles.scoreCard}>
        <Text style={styles.scoreLabel}>Cognitive Engagement Score</Text>
        <Text style={styles.score}>{score}<Text style={styles.scoreMax}> /100</Text></Text>
        <Text style={styles.trend}>Trend: {tr === 'improving' ? '📈 improving' : tr === 'declining' ? '📉 declining' : '➖ stable'}</Text>
      </View>

      <Text style={styles.section}>Last 8 Games (accuracy %)</Text>
      <View style={styles.chart}>
        {last8.map((s) => (
          <View key={s.id} style={styles.barWrap}>
            <View style={[styles.bar, { height: Math.max(6, s.accuracy * 100) },
              s.accuracy > 0.8 ? { backgroundColor: '#4A7C59' } :
              s.accuracy < 0.4 ? { backgroundColor: '#B85C38' } : { backgroundColor: '#D9A648' }]} />
            <Text style={styles.barLabel}>{s.gameType.slice(0, 4)}</Text>
          </View>
        ))}
      </View>
      <View style={styles.headerRow}>
      <Text style={styles.heading}>Patient Progress</Text>
      <TouchableOpacity style={styles.syncBtn} onPress={manualRefresh} disabled={refreshing}>
      {refreshing
      ? <ActivityIndicator size="small" color="#4A7C59" />
      : <Text style={styles.syncBtnText}>⟳ Sync Now</Text>}
       </TouchableOpacity>
      </View>

      <Text style={styles.section}>Sessions logged: {sessions.length}</Text>
      <Text style={styles.section}>Current memory difficulty: {sessions[0]?.difficulty ?? '—'}</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, backgroundColor: '#FDF6EC' },
  heading: { fontSize: 30, fontWeight: 'bold', marginTop: 30, marginBottom: 16 },
  scoreCard: { backgroundColor: '#fff', borderRadius: 16, padding: 24, alignItems: 'center', marginBottom: 24 },
  scoreLabel: { fontSize: 16, color: '#666' },
  score: { fontSize: 64, fontWeight: 'bold', color: '#4A7C59' },
  scoreMax: { fontSize: 20, color: '#999' },
  trend: { fontSize: 18 },
  section: { fontSize: 18, fontWeight: '600', marginBottom: 12 },
  chart: { flexDirection: 'row', alignItems: 'flex-end', height: 130, gap: 10, marginBottom: 24 },
  barWrap: { alignItems: 'center' },
  bar: { width: 28, borderRadius: 4 },
  barLabel: { fontSize: 11, color: '#666', marginTop: 4 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 30, marginBottom: 16 },
  syncBtn: { backgroundColor: '#E8F0EA', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10 },
  syncBtnText: { color: '#4A7C59', fontWeight: '600', fontSize: 15 },
});