import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { getRecentSessions, insertGameSession } from '../services/db';
import { nextDifficulty, pairsForDifficulty } from '../utils/difficulty';

const EMOJIS = ['🌸', '🦋', '🐟', '🍃', '🌾', '🪷']; // nature theme — culturally gentle

export default function MemoryPairs({ navigation }: any) {
  const { patientId } = useAuth();
  const [difficulty, setDifficulty] = useState(1);
  const [deck, setDeck] = useState<string[]>([]);
  const [flipped, setFlipped] = useState<number[]>([]);
  const [matched, setMatched] = useState<number[]>([]);
  const [attempts, setAttempts] = useState(0);
  const [startTime, setStartTime] = useState(0);

  useEffect(() => {
    (async () => {
      if (!patientId) return;
      const history = await getRecentSessions(patientId, 'memory', 3);
      const d = nextDifficulty(history, 1);
      setDifficulty(d);
      startRound(pairsForDifficulty(d));
    })();
  }, [patientId]);

  const startRound = (pairs: number) => {
    const chosen = EMOJIS.slice(0, pairs);
    const cards = [...chosen, ...chosen].sort(() => Math.random() - 0.5);
    setDeck(cards); setFlipped([]); setMatched([]); setAttempts(0);
    setStartTime(Date.now());
  };

  const flip = (idx: number) => {
    if (flipped.length === 2 || flipped.includes(idx) || matched.includes(idx)) return;
    const next = [...flipped, idx];
    setFlipped(next);
    if (next.length === 2) {
      setAttempts((a) => a + 1);
      const isMatch = deck[next[0]] === deck[next[1]];
      setTimeout(() => {
        if (isMatch) setMatched((m) => [...m, ...next]);
        setFlipped([]);
      }, isMatch ? 300 : 800);
    }
  };

  // Win check + logging
  useEffect(() => {
    if (deck.length > 0 && matched.length === deck.length) finishGame();
  }, [matched]);

  const finishGame = async () => {
    const pairs = deck.length / 2;
    const accuracy = pairs / attempts;               // correct matches / total flips
    const elapsed = Date.now() - startTime;
    const score = Math.round(accuracy * 100);
    await insertGameSession({
      id: `mem_${Date.now()}`, patientId: patientId!, gameType: 'memory',
      score, accuracy, avgResponseTimeMs: Math.round(elapsed / attempts),
      attempts, difficulty, timestamp: Date.now(), synced: false, updatedAt: Date.now(),
    });
    Alert.alert('Well done! 🎉', `Score: ${score}`, [
      { text: 'Play again', onPress: () => startRound(pairsForDifficulty(difficulty)) },
      { text: 'Home', onPress: () => navigation.goBack() },
    ]);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Find the Matching Pairs</Text>
      <Text style={styles.meta}>Level {difficulty} · Attempts: {attempts}</Text>
      <View style={styles.grid}>
        {deck.map((card, i) => {
          const show = flipped.includes(i) || matched.includes(i);
          return (
            <TouchableOpacity key={i} style={[styles.card, matched.includes(i) && styles.matched]}
              onPress={() => flip(i)} disabled={matched.includes(i)}>
              <Text style={styles.cardText}>{show ? card : '❓'}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#FDF6EC' },
  header: { fontSize: 30, fontWeight: 'bold', marginTop: 30, textAlign: 'center' },
  meta: { fontSize: 18, textAlign: 'center', marginBottom: 20, color: '#666' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 12 },
  card: { width: 90, height: 110, backgroundColor: '#4A7C59', borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  matched: { backgroundColor: '#CDE3D2', opacity: 0.7 },
  cardText: { fontSize: 44 },
});