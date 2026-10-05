import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { getRecentSessions, logSession } from '../services/db';
import { MAX_LEVEL } from '../utils/difficulty';

const PADS = [
  { color: '#4A7C59', off: '#2E5238' },
  { color: '#B85C38', off: '#7A3D26' },
  { color: '#D9A648', off: '#8F6E2F' },
  { color: '#5B7DB1', off: '#3C5478' },
];

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export default function SequenceSimon({ navigation }: any) {
  const { patientId } = useAuth();
  const [level, setLevel] = useState(1);
  const [sequence, setSequence] = useState<number[]>([]);
  const [showing, setShowing] = useState(false);
  const [litPad, setLitPad] = useState<number | null>(null);
  const [inputIdx, setInputIdx] = useState(0);
  const [status, setStatus] = useState('Watch...'); // Watch / Your turn / ...
  const [mistakes, setMistakes] = useState(0);
  const [roundDone, setRoundDone] = useState(false);
  const [tapTimes, setTapTimes] = useState<number[]>([]);
  const lastTapRef = useRef(0);
  const mounted = useRef(true);

  useEffect(() => () => { mounted.current = false; }, []);

  useEffect(() => { (async () => {
    if (!patientId) return;
    const history = await getRecentSessions(patientId, 'pattern', 1);
    const saved = Math.min(MAX_LEVEL, history[0]?.difficulty ?? 1);
    setLevel(saved);
    startRound(saved);
  })(); }, [patientId]);

  const seqLenForLevel = (lvl: number) => Math.min(10, 2 + Math.floor(lvl / 3));
  const flashMs = (lvl: number) => Math.max(600, 1000 - lvl * 20);

  const startRound = async (lvl: number) => {
    const len = seqLenForLevel(lvl);
    const seq = Array.from({ length: len }, () => Math.floor(Math.random() * 4));
    setSequence(seq); setInputIdx(0); setRoundDone(false);
    setTapTimes([]); setStatus('Watch carefully...');

    // Playback (cancellable on unmount)
    setShowing(true);
    await sleep(1200);
    for (const pad of seq) {
      if (!mounted.current) return;
      setLitPad(pad);
      await sleep(flashMs(lvl));
      if (!mounted.current) return;
      setLitPad(null);
      await sleep(350);
    }
    if (!mounted.current) return;
    setShowing(false);
    setStatus('Your turn!');
    lastTapRef.current = Date.now();
  };

  const tapPad = (pad: number) => {
    if (showing || roundDone) return;
    const now = Date.now();
    setTapTimes((t) => [...t, now - lastTapRef.current]);
    lastTapRef.current = now;

    if (sequence[inputIdx] === pad) {
      const next = inputIdx + 1;
      if (next === sequence.length) {
        setRoundDone(true);
        finishRound();
      } else {
        setInputIdx(next);
      }
    } else {
      setMistakes((m) => m + 1);
      setStatus('Oops — watch again!');
      setTimeout(() => { setInputIdx(0); startRound(level); }, 1200);
    }
  };

  const finishRound = async () => {
    const avgT = tapTimes.reduce((a, b) => a + b, 0) / Math.max(1, tapTimes.length) / 1000;
    const accuracy = sequence.length / (sequence.length + mistakes);
    const leveledUp = avgT < 6 && accuracy >= 0.8 && level < MAX_LEVEL;
    const newLevel = leveledUp ? level + 1 : mistakes > sequence.length ? Math.max(1, level - 1) : level;

    await logSession(patientId!, 'pattern', accuracy, Math.round(avgT * 1000),
      sequence.length + mistakes, newLevel);

    setStatus('🎉 Perfect!');
    Alert.alert(
      'Sequence Complete!',
      `Length: ${sequence.length} · Mistakes: ${mistakes}` +
      (leveledUp ? ` → Level ${newLevel}!` : ''),
      [
        { text: 'Next ▶', onPress: () => { setLevel(newLevel); startRound(newLevel); } },
        ...(level < MAX_LEVEL ? [{ text: 'Manual Level Up ⬆', onPress: () => {
          const l = Math.min(MAX_LEVEL, level + 1); setLevel(l); startRound(l);
        }}] : []),
        { text: 'Home', onPress: () => navigation.goBack() },
      ]
    );
  };

  const cols = level < 8 ? 2 : 2; // 2×2 pads always — elders need big targets
  return (
    <View style={styles.container}>
      <Text style={styles.header}>Simon Says</Text>
      <Text style={styles.meta}>Level {level}/{MAX_LEVEL} · {status}</Text>
      <Text style={styles.hint}>{showing ? '👁 Watch the colors' : '👆 Repeat the pattern'}</Text>
      <View style={styles.grid}>
        {PADS.map((p, i) => (
          <TouchableOpacity key={i}
            style={[styles.pad, { backgroundColor: litPad === i ? p.color : p.off },
              litPad === i && styles.lit]}
            onPress={() => tapPad(i)}
            disabled={showing || roundDone} />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', backgroundColor: '#111', padding: 16 },
  header: { fontSize: 28, fontWeight: 'bold', marginTop: 40, color: '#FFD54F' },
  meta: { fontSize: 17, color: '#ccc', marginTop: 8 },
  hint: { fontSize: 20, color: '#fff', marginVertical: 20, minHeight: 28 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 16, marginTop: 10 },
  pad: { width: 140, height: 140, borderRadius: 20 },
  lit: { shadowOpacity: 1, elevation: 12 },
});