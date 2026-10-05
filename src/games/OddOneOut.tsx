import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, Vibration } from 'react-native';
import * as Speech from 'expo-speech';
import { useAuth } from '../context/AuthContext';
import { logSession, getRecentSessions } from '../services/db';
import { MAX_LEVEL } from '../utils/difficulty';

interface Puzzle { items: string[]; odd: string; } // odd is index-agnostic

// ── FIX 1 & 2: pools cleaned so that no "odd" item can ever appear inside its main group ──
const POOL = {
  fruit: ['🍎','🍌','🍇','🍊','🍉','🍓','🥭','🍍'],
  animal: ['🐘','🐶','🐱','🐮','🐔','🦜'],    // land/domestic only — 🐟 and 🦌 removed (they are used as odds)
  vehicle: ['🚗','🚌','🚂','🛵','🚜','🛺'],  // road/motor only — ✈️ and 🚲 removed (used as odds)
  household: ['🍲','🫖','🧺','🛶','🎣','🍚'], // 🪔 removed (used as odd)
};

// Easy odds — removed 🍎🍌🍇 (they were fruits, so a fruit main-group had no odd!)
const EASY_ODDS = ['🚗','🐘','🫖','🚌','🐟','🛵','🐶','🍇','🪔','✈️'];

// ── FIX 2: hard puzzles are now explicit (main-group, odd) PAIRS.
// The main group is always the correct sibling family, so the odd is truly
// subtle-but-correct (e.g. water animal among LAND animals, never among fruit).
const HARD_PUZZLES = [
  { main: 'animal',    odd: '🐟', note: 'water animal among land animals' },
  { main: 'vehicle',   odd: '✈️', note: 'air among road vehicles' },
  { main: 'household', odd: '🪔', note: 'light among containers' },
  { main: 'animal',    odd: '🦌', note: 'wild among domestic' },
  { main: 'vehicle',   odd: '🚲', note: 'human-powered among motor' },
] as const;

function buildPuzzle(level: number, qNum: number): Puzzle {
  const count = Math.min(6, 3 + Math.floor(level / 4)); // 4 → 7 cards total (gentle for seniors)
  const mainKey = Object.keys(POOL)[(level + qNum) % Object.keys(POOL).length] as keyof typeof POOL;
  const main = POOL[mainKey];

  if (level <= 10) {
    // ── FIX 1: safety filter — the odd can NEVER be a member of the main group
    const candidates = EASY_ODDS.filter(o => !main.includes(o));
    const odd = candidates[(level * 3 + qNum) % candidates.length];
    return { items: shuffle([...main.slice(0, count), odd]), odd };
  }

  const hard = HARD_PUZZLES[(level + qNum) % HARD_PUZZLES.length];
  const mainGroup = POOL[hard.main];
  // odd is guaranteed NOT in mainGroup by construction (pools were cleaned)
  return { items: shuffle([...mainGroup.slice(0, count), hard.odd]), odd: hard.odd };
}

const shuffle = (a: string[]) => [...a].sort(() => Math.random() - 0.5);

// ── NEW FEATURE: "Try again" sound + gentle vibration on a wrong tap
const playTryAgain = () => {
  try {
    Speech.speak('Try again', { language: 'en', rate: 0.85, pitch: 1.0 });
  } catch { /* speech unavailable — vibration still gives feedback */ }
  Vibration.vibrate(250);
};

export default function OddOneOut({ navigation }: any) {
  const { patientId } = useAuth();
  const [level, setLevel] = useState(1);
  const [qNum, setQNum] = useState(0);
  const [puzzle, setPuzzle] = useState<Puzzle | null>(null);
  const [mistakes, setMistakes] = useState(0);
  const [startAt, setStartAt] = useState(0);
  const [ready, setReady] = useState(false);
  const [wrongItem, setWrongItem] = useState<string | null>(null); // red flash feedback
  const TOTAL_Q = 10;

  React.useEffect(() => {
    (async () => {
      if (!patientId) { setReady(true); return; }
      const history = await getRecentSessions(patientId, 'recognition', 1);
      const saved = Math.min(MAX_LEVEL, Math.max(1, history[0]?.difficulty ?? 1));
      setLevel(saved);
      setPuzzle(buildPuzzle(saved, 0));
      setStartAt(Date.now());
      setReady(true);
    })();
  }, [patientId]);

  React.useEffect(() => {
    if (ready && !puzzle) {
      setPuzzle(buildPuzzle(level, qNum));
      setStartAt(Date.now());
    }
  }, [puzzle, level, qNum, ready]);

  const tap = async (item: string) => {
    if (item !== puzzle!.odd) {
      setMistakes((m) => m + 1);
      setWrongItem(item);
      playTryAgain();
      setTimeout(() => setWrongItem(null), 800); // brief red flash, then reset
      return;
    }
    const elapsed = (Date.now() - startAt) / 1000;
    if (qNum + 1 >= TOTAL_Q) {
      const accuracy = TOTAL_Q / (TOTAL_Q + mistakes);
      const leveledUp = accuracy >= 0.8 && elapsed / TOTAL_Q < 8 && level < MAX_LEVEL;
      const newLevel = leveledUp ? level + 1 : accuracy < 0.4 ? Math.max(1, level - 1) : level;
      await logSession(patientId!, 'recognition', accuracy,
        Math.round((elapsed / TOTAL_Q) * 1000), TOTAL_Q + mistakes, newLevel);
      Alert.alert('Great job! 🎉', `Level ${level} done${leveledUp ? ` → Level ${newLevel}!` : ''}`,
        [{ text: 'Next ▶', onPress: () => { setLevel(newLevel); setQNum(0); setPuzzle(null); setMistakes(0); } },
         { text: 'Home', onPress: () => navigation.goBack() }]);
    } else {
      setQNum((q) => q + 1); setPuzzle(null);
    }
  };

  if (!ready || !puzzle) return null;

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Odd One Out</Text>
      <Text style={styles.meta}>Question {qNum + 1}/{TOTAL_Q} · Level {level}/{MAX_LEVEL} · Mistakes: {mistakes}</Text>
      <Text style={styles.instruction}>Tap the one that does NOT belong</Text>
      <View style={styles.grid}>
        {puzzle.items.map((item, i) => (
          <TouchableOpacity
            key={`${qNum}-${i}`}
            style={[styles.card, wrongItem === item && styles.cardWrong]}
            onPress={() => tap(item)}
            activeOpacity={0.7}
          >
            <Text style={styles.emoji}>{item}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', backgroundColor: '#FDF6EC', padding: 16 },
  header: { fontSize: 30, fontWeight: 'bold', marginTop: 40 },
  meta: { fontSize: 16, color: '#666', marginTop: 6 },
  instruction: { fontSize: 22, fontWeight: '600', marginVertical: 24, color: '#4A7C59', textAlign: 'center' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 12 },
  card: { width: 96, height: 96, backgroundColor: '#fff', borderRadius: 16, justifyContent: 'center', alignItems: 'center', elevation: 2 },
  cardWrong: { backgroundColor: '#FDECEA', borderWidth: 3, borderColor: '#E05B5B' }, // gentle red flash on wrong tap
  emoji: { fontSize: 46 },
});