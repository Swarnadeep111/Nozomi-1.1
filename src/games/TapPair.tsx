import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Alert, ScrollView,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { getRecentSessions, insertGameSession } from '../services/db';
import { levelConfig, levelFromPerformance, MAX_LEVEL } from '../utils/difficulty';

const EMOJIS = ['🌸','🦋','🐟','🍃','🌾','🪷','🍒','🍄','🐢','🪁','🥭','🌈',
                '🐘','🦜','🌻','🌴','🛶','🎹'];

export default function TapPair({ navigation }: any) {
  const { patientId } = useAuth();
  const [level, setLevel] = useState(1);
  const [deck, setDeck] = useState<string[]>([]);
  const [selected, setSelected] = useState<number[]>([]);
  const [matched, setMatched] = useState<number[]>([]);
  const [mistakes, setMistakes] = useState(0);
  const [matchTimes, setMatchTimes] = useState<number[]>([]);
  const [lastMatchAt, setLastMatchAt] = useState(0);
  const [startedAt, setStartedAt] = useState(0);

  useEffect(() => {
    (async () => {
      if (!patientId) return;
      const history = await getRecentSessions(patientId, 'recognition', 1);
      const saved = history[0]?.difficulty ?? 1;
      setLevel(saved);
      startRound(saved);
    })();
  }, [patientId]);

  const startRound = (lvl: number) => {
    const { pairs } = levelConfig(lvl);
    const cards = [...EMOJIS.slice(0, pairs), ...EMOJIS.slice(0, pairs)]
      .sort(() => Math.random() - 0.5);
    setDeck(cards);
    setSelected([]);
    setMatched([]);
    setMistakes(0);
    setMatchTimes([]);
    setStartedAt(Date.now());
    setLastMatchAt(Date.now());
  };

  const tap = (idx: number) => {
    if (matched.includes(idx) || selected.includes(idx) || selected.length === 2) return;

    if (selected.length === 0) {
      setSelected([idx]);
      return;
    }

    const now = Date.now();
    const isMatch = deck[selected[0]] === deck[idx];

    if (isMatch) {
      setMatchTimes((t) => [...t, now - lastMatchAt]);
      setLastMatchAt(now);
      setMatched((m) => [...m, ...selected, idx]);
      setSelected([]);
    } else {
      setMistakes((m) => m + 1);
      setSelected([...selected, idx]);
      setTimeout(() => setSelected([]), 700);
    }
  };

  useEffect(() => {
    if (deck.length > 0 && matched.length === deck.length) finish();
  }, [matched]);

  const finish = async () => {
    const totalMatches = deck.length / 2;
    const attempts = totalMatches + mistakes;
    const accuracy = totalMatches / attempts;
    const avgT = matchTimes.reduce((a, b) => a + b, 0) / matchTimes.length / 1000;
    const newLevel = levelFromPerformance(avgT, accuracy, level);

    await insertGameSession({
      id: `tap_${Date.now()}`,
      patientId: patientId!,
      gameType: 'recognition',
      score: Math.round(accuracy * 100),
      accuracy,
      avgResponseTimeMs: Math.round(avgT * 1000),
      attempts,
      difficulty: newLevel,
      timestamp: Date.now(),
      synced: false,
      updatedAt: Date.now(),
    });

    const leveledUp = newLevel > level;
    Alert.alert(
      leveledUp ? 'Level Up! 🎉' : 'Well done!',
      `Level ${level} done · Avg ${avgT.toFixed(1)}s per match` +
        (leveledUp ? ` → Level ${newLevel}` : ''),
      [
        {
          text: 'Next Level ▶',
          onPress: () => { setLevel(newLevel); startRound(newLevel); },
        },
        ...(level < MAX_LEVEL
          ? [{
              text: 'Manual Level Up ⬆',
              onPress: () => {
                const l = Math.min(MAX_LEVEL, level + 1);
                setLevel(l);
                startRound(l);
              },
            }]
          : []),
        { text: 'Home', onPress: () => navigation.goBack() },
      ]
    );
  };

  const { pairs } = levelConfig(level);
  const cols = pairs <= 3 ? 2 : pairs <= 6 ? 3 : pairs <= 12 ? 3 : 4;

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Tap the Matching Pairs</Text>
      <Text style={styles.meta}>
        Level {level} of {MAX_LEVEL} · Mistakes: {mistakes}
      </Text>

      <ScrollView
        contentContainerStyle={styles.gridWrap}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.grid, { maxWidth: cols * 108 }]}>
          {deck.map((card, i) => {
            const isMatched = matched.includes(i);
            const isSelected = selected.includes(i);
            return (
              <TouchableOpacity
                key={i}
                style={[styles.card, isSelected && styles.selected, isMatched && styles.matched]}
                onPress={() => tap(i)}
                disabled={isMatched}
              >
                <Text style={styles.cardText}>{card}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', padding: 16, backgroundColor: '#111' },
  header: { fontSize: 26, fontWeight: 'bold', marginTop: 40, color: '#FFD54F', textAlign: 'center' },
  meta: { fontSize: 17, color: '#ccc', marginVertical: 16, textAlign: 'center' },
  gridWrap: { alignItems: 'center', paddingBottom: 40 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8 },
  card: {
    width: 100, height: 100, backgroundColor: '#fff', borderRadius: 14,
    justifyContent: 'center', alignItems: 'center', margin: 2,
  },
  selected: { backgroundColor: '#FFD54F', borderWidth: 4, borderColor: '#fff' },
  matched: { backgroundColor: '#A5D6A7', opacity: 0.5 },
  cardText: { fontSize: 42 },
});