import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Alert,
  Animated, Vibration,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { logSession, getRecentSessions } from '../services/db';
import { MAX_LEVEL } from '../utils/difficulty';
import { initSounds, playSound } from '../utils/sounds';

// Memory Test has its own 40-level curve, independent of the shared MAX_LEVEL cap
const GAME_MAX_LEVEL = Math.max(MAX_LEVEL ?? 0, 40);

const OBJECTS = ['📺','👕','🍉','⚽','🌅','📷','🫖','🪔','🧺','🍲','⏰','🌂','🔑','📻','🥘','🪑','🧢','🕯️','🛒','🧴'];
const TOTAL_Q = 5; // questions per session

// ⚠️ Manipuri (Meitei) strings are best-effort — please verify with a native speaker before release.
const STRINGS = {
  en:  { memorize: 'Memorize these!',  watch: 'Watch carefully…',   whereWas: 'Where was I?',       hint: '💡 Hint',      correct: 'Correct! Well done!', answer: 'It was here',   level: 'Level', q: 'Question', mistakes: 'Mistakes', next: 'Next ▶', done: 'Session complete!', home: 'Home', up: '⬆️ Level Up', down: '⬇️' },
  mni: { memorize: 'মশক মনম্বিরো',       watch: 'কন্ননা চাবিয়ু…',        whereWas: 'কইদমক্তা লেইবানো?',     hint: '💡 মতাং পীবা',   correct: 'হৈ! মরম ওইবনি!',      answer: 'মসিদা লেইরিবনি',  level: 'লেভেল', q: 'মশিং',     mistakes: 'অরোইবা',    next: 'অরুবা ▶', done: 'তাক্পনি!',          home: 'হোম', up: '⬆️ লেভেল',  down: '⬇️' },
  bn:  { memorize: 'এগুলো মনে রাখুন',   watch: 'মন দিয়ে দেখুন…',      whereWas: 'আমি কোথায় ছিলাম?',    hint: '💡 ইঙ্গিত',     correct: 'সঠিক! খুব ভালো!',     answer: 'এটা এখানেই ছিল',  level: 'লেভেল', q: 'প্রশ্ন',    mistakes: 'ভুল',       next: 'পরের ▶',  done: 'সেশন শেষ!',        home: 'হোম', up: '⬆️ লেভেল বাড়ান', down: '⬇️' },
  as:  { memorize: 'এইবোৰ মনত ৰাখিব',   watch: 'মন দি চাওক…',        whereWas: 'মই ক\'ত আছিলোঁ?',     hint: '💡 ইঙ্গিত',     correct: 'শুদ্ধ! বহুত ভাল!',    answer: 'ইয়াতেই আছিল',    level: 'স্তৰ',  q: 'প্ৰশ্ন',    mistakes: 'ভুল',       next: 'পৰৱৰ্তী ▶', done: 'অধিবেশন শেষ!',   home: 'ঘৰ', up: '⬆️ স্তৰ বঢ়াওক', down: '⬇️' },
} as const;
type Lang = keyof typeof STRINGS;
const LANG_CHIPS: { code: Lang; label: string }[] = [
  { code: 'en', label: 'EN' }, { code: 'mni', label: 'ꯃꯤꯇꯩ' },
  { code: 'bn', label: 'বাংলা' }, { code: 'as', label: 'অসমীয়া' },
];

// ── 40-level curve: cards 2→12, generous timing for elderly users ──
function levelConfig(level: number) {
  const cards = Math.min(12, 2 + Math.floor((level - 1) / 3));      // L1-3:2 … L31+:12
  const memorizeMs = Math.max(2500, 3200 + cards * 1300 - level * 60);
  const thinkMs = Math.max(3500, 7000 - level * 80);                // auto-reveal wait
  return { cards, memorizeMs, thinkMs };
}

interface Round { objects: string[]; target: number; }
function buildRound(level: number): Round {
  const { cards } = levelConfig(level);
  const pool = [...OBJECTS].sort(() => Math.random() - 0.5);
  return { objects: pool.slice(0, cards), target: Math.floor(Math.random() * cards) };
}

type Phase = 'memorize' | 'question' | 'reveal';

export default function MemoryTest({ navigation }: any) {
  const { patientId } = useAuth();
  const [ready, setReady] = useState(false);
  const [level, setLevel] = useState(1);
  const [lang, setLang] = useState<Lang>('en');
  const [qNum, setQNum] = useState(0);
  const [phase, setPhase] = useState<Phase>('memorize');
  const [round, setRound] = useState<Round | null>(null);
  const [eliminated, setEliminated] = useState<number[]>([]);
  const [wrongIdx, setWrongIdx] = useState<number | null>(null);
  const [mistakes, setMistakes] = useState(0);
  const [hints, setHints] = useState(0);
  const [startAt, setStartAt] = useState(0);

  const t = STRINGS[lang];
  const s = useRef<ReturnType<typeof setTimeout> | null>(null);
  const clearT = () => { if (s.current) clearTimeout(s.current); };

  const pulse = useRef(new Animated.Value(1)).current;
  const pop = useRef(new Animated.Value(1)).current;
  const bar = useRef(new Animated.Value(1)).current;
  const fade = useRef(new Animated.Value(0)).current;

  // Load saved difficulty + init sounds once
  React.useEffect(() => {
    (async () => {
      initSounds();
      if (!patientId) { setReady(true); return; }
      const history = await getRecentSessions(patientId, 'memory', 1);
      // FIX: clamp against GAME_MAX_LEVEL (40), not the shared MAX_LEVEL
      const saved = Math.min(GAME_MAX_LEVEL, Math.max(1, history[0]?.difficulty ?? 1));
      setLevel(saved);
      setRound(buildRound(saved));
      setStartAt(Date.now());
      setReady(true);
    })();
  }, [patientId]);

  // Pulse loop while the question is on screen
  useEffect(() => {
    if (phase !== 'question') { pulse.setValue(1); return; }
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(pulse, { toValue: 1.25, duration: 550, useNativeDriver: true }),
      Animated.timing(pulse, { toValue: 1, duration: 550, useNativeDriver: true }),
    ]));
    loop.start();
    return () => loop.stop();
  }, [phase]);

  // Grid entrance + countdown bar + phase timers
  useEffect(() => {
    if (!round) return;
    const cfg = levelConfig(level);
    fade.setValue(0);
    Animated.timing(fade, { toValue: 1, duration: 350, useNativeDriver: true }).start();
    if (phase === 'memorize') {
      bar.setValue(1);
      Animated.timing(bar, { toValue: 0, duration: cfg.memorizeMs, useNativeDriver: true }).start();
      clearT();
      s.current = setTimeout(() => { playSound('ping'); setPhase('question'); }, cfg.memorizeMs);
    } else if (phase === 'question') {
      clearT();
      s.current = setTimeout(() => {
        setMistakes((m) => m + 1);
        revealCard();
      }, cfg.thinkMs);
    } else if (phase === 'reveal') {
      pop.setValue(0.4);
      Animated.spring(pop, { toValue: 1, friction: 4, useNativeDriver: true }).start();
      clearT();
      s.current = setTimeout(nextQuestion, 2200);
    }
    return clearT;
  }, [phase, round]);

  const revealCard = () => {
    Vibration.vibrate(60);
    setPhase('reveal');
  };

  const nextQuestion = () => {
    if (qNum + 1 >= TOTAL_Q) { finishSession(); return; }
    setQNum((q) => q + 1);
    setEliminated([]);
    setWrongIdx(null);
    setRound(buildRound(level));
    setPhase('memorize');
  };

  const finishSession = async () => {
    const elapsed = (Date.now() - startAt) / 1000;
    const accuracy = TOTAL_Q / (TOTAL_Q + mistakes + hints);
    // FIX: removed the harsh 10s/question time gate — elderly users were never
    // leveling up because of it. Now: at most 1 mistake in the session → level up.
    const leveledUp = mistakes <= 1 && level < GAME_MAX_LEVEL;
    const newLevel = leveledUp ? level + 1 : accuracy < 0.4 ? Math.max(1, level - 1) : level;
    await logSession(patientId!, 'memory', accuracy,
      Math.round((elapsed / TOTAL_Q) * 1000), TOTAL_Q + mistakes, newLevel);
    Alert.alert('Memory Test 🧠',
      `${t.done} ${t.level} ${level}${leveledUp ? ` → ${t.level} ${newLevel}! 🎉` : ''}`,
      [{ text: t.next, onPress: () => {
          setLevel(newLevel); setQNum(0); setMistakes(0); setHints(0);
          setEliminated([]); setStartAt(Date.now());
          setRound(buildRound(newLevel)); setPhase('memorize');
        }},
       { text: t.home, onPress: () => navigation.goBack() }]);
  };

  // ── NEW: manual level change (mid-session, applies to the next round) ──
  const manualLevel = (delta: number) => {
    const nl = Math.min(GAME_MAX_LEVEL, Math.max(1, level + delta));
    if (nl === level) return;
    clearT();
    setLevel(nl);
    setEliminated([]);
    setWrongIdx(null);
    setRound(buildRound(nl));   // fresh round at the new difficulty
    setPhase('memorize');
    playSound('ping');
  };

  const tapCard = (idx: number) => {
    if (phase !== 'question' || !round || eliminated.includes(idx)) return;
    if (idx === round.target) {
      playSound('pop');
      revealCard();
    } else {
      playSound('wrong');
      setMistakes((m) => m + 1);
      setWrongIdx(idx);
      setTimeout(() => setWrongIdx(null), 700);
    }
  };

  const useHint = () => {
    if (phase !== 'question' || !round) return;
    const maxHints = levelConfig(level).cards > 6 ? 2 : 1;
    if (eliminated.length >= maxHints) return;
    const wrongs = round.objects.map((_, i) => i)
      .filter((i) => i !== round.target && !eliminated.includes(i));
    if (!wrongs.length) return;
    setEliminated((e) => [...e, wrongs[Math.floor(Math.random() * wrongs.length)]]);
    setHints((h) => h + 1);
    playSound('ping');
  };

  if (!ready || !round) return null;
  const { cards } = levelConfig(level);
  const cols = cards <= 4 ? 2 : cards <= 9 ? 3 : 4;
  const CARD = { 2: 128, 3: 102, 4: 86 }[cols as 2 | 3 | 4];
  const asked = round.objects[round.target];

  const renderGrid = () =>
    round!.objects.map((obj, i) => {
      const isAnswer = phase === 'reveal' && i === round!.target;
      const isWrong = wrongIdx === i;
      const dimmed = eliminated.includes(i) && phase === 'question';
      return (
        <Animated.View
          key={`${qNum}-${phase}-${i}`}
          style={[styles.cell, { transform: isAnswer ? [{ scale: pop }] : undefined }, dimmed && styles.dim]}
        >
          <TouchableOpacity
            style={[
              styles.card, { width: CARD, height: CARD },
              phase !== 'memorize' && styles.cardBlue,
              isAnswer && styles.cardAnswer,
              isWrong && styles.cardWrong,
            ]}
            onPress={() => tapCard(i)}
            activeOpacity={0.7}
            disabled={phase !== 'question' || dimmed}
          >
            {(phase === 'memorize' || isAnswer)
              ? <Text style={{ fontSize: CARD * 0.5 }}>{obj}</Text>
              : <Text style={[styles.num, { fontSize: CARD * 0.42 }, isAnswer && styles.numWhite]}>{i + 1}</Text>}
            {phase === 'memorize' && (
              <View style={styles.badge}><Text style={styles.badgeTxt}>{i + 1}</Text></View>
            )}
          </TouchableOpacity>
        </Animated.View>
      );
    });

  return (
    <View style={styles.container}>
      {/* Language switcher */}
      <View style={styles.langRow}>
        {LANG_CHIPS.map((c) => (
          <TouchableOpacity key={c.code} style={[styles.chip, lang === c.code && styles.chipOn]} onPress={() => setLang(c.code)}>
            <Text style={[styles.chipTxt, lang === c.code && styles.chipTxtOn]}>{c.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.header}>Memory Test 🧠</Text>
      <Text style={styles.meta}>{t.q} {qNum + 1}/{TOTAL_Q} · {t.level} {level}/{GAME_MAX_LEVEL} · {t.mistakes}: {mistakes}</Text>

      {/* ── NEW: manual level up / down buttons ── */}
      <View style={styles.levelRow}>
        <TouchableOpacity style={styles.levelUpBtn} onPress={() => manualLevel(1)}>
          <Text style={styles.levelUpTxt}>{t.up}</Text>
        </TouchableOpacity>
        {/* Down button so a struggling elder isn't stuck — remove if unwanted */}
        <TouchableOpacity style={styles.levelDownBtn} onPress={() => manualLevel(-1)}>
          <Text style={styles.levelDownTxt}>{t.down}</Text>
        </TouchableOpacity>
      </View>

      {phase === 'memorize' && (
        <>
          <Text style={styles.instruction}>{t.watch}</Text>
          <View style={styles.barWrap}>
            <Animated.View style={[styles.bar, { transform: [{ scaleX: bar }] }]} />
          </View>
        </>
      )}

      {phase === 'question' && (
        <View style={styles.qRow}>
          <Text style={styles.instruction}>{t.whereWas}</Text>
          <Animated.Text style={[styles.qEmoji, { transform: [{ scale: pulse }] }]}>{asked}</Animated.Text>
        </View>
      )}

      {phase === 'reveal' && (
        <View style={styles.qRow}>
          <Text style={styles.revealTxt}>{mistakes > qNum ? t.answer : t.correct}</Text>
          <Text style={styles.qEmoji}>{asked}</Text>
        </View>
      )}

      <Animated.View style={[styles.grid, { opacity: fade }]}>
        {renderGrid()}
      </Animated.View>

      {phase === 'question' && (
        <TouchableOpacity style={styles.hintBtn} onPress={useHint}>
          <Text style={styles.hintTxt}>{t.hint}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', backgroundColor: '#FDF6EC', padding: 16 },
  langRow: { flexDirection: 'row', marginTop: 34, gap: 8 },
  chip: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, backgroundColor: '#EEE3D0' },
  chipOn: { backgroundColor: '#4A7C59' },
  chipTxt: { fontSize: 16, color: '#555', fontWeight: '600' },
  chipTxtOn: { color: '#fff' },
  header: { fontSize: 30, fontWeight: 'bold', marginTop: 10 },
  meta: { fontSize: 16, color: '#666', marginTop: 6 },
  levelRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 8 },
  levelUpBtn: { backgroundColor: '#4A7C59', paddingHorizontal: 20, paddingVertical: 8, borderRadius: 20, elevation: 2 },
  levelUpTxt: { fontSize: 17, fontWeight: '700', color: '#fff' },
  levelDownBtn: { backgroundColor: '#EEE3D0', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, elevation: 1 },
  levelDownTxt: { fontSize: 17, fontWeight: '700', color: '#7A6A55' },
  instruction: { fontSize: 24, fontWeight: '600', color: '#4A7C59', textAlign: 'center' },
  barWrap: { width: '70%', height: 10, borderRadius: 5, backgroundColor: '#EEE3D0', marginTop: 12, overflow: 'hidden' },
  bar: { flex: 1, backgroundColor: '#4A7C59', borderRadius: 5 },
  qRow: { flexDirection: 'row', alignItems: 'center', marginTop: 18, gap: 12 },
  qEmoji: { fontSize: 44 },
  revealTxt: { fontSize: 22, fontWeight: '700', color: '#4A7C59' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', alignItems: 'center', gap: 12, marginTop: 24 },
  cell: { justifyContent: 'center', alignItems: 'center' },
  dim: { opacity: 0.25 },
  card: { borderRadius: 16, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff', elevation: 3 },
  cardBlue: { backgroundColor: '#3B9BE9' },
  cardAnswer: { backgroundColor: '#7ED491', borderWidth: 4, borderColor: '#2E8B57' },
  cardWrong: { backgroundColor: '#FDECEA', borderWidth: 3, borderColor: '#E05B5B' },
  num: { color: '#EAF4FF', fontWeight: 'bold', textShadowRadius: 2, textShadowColor: 'rgba(0,0,0,0.25)', textShadowOffset: { width: 0, height: 2 } },
  numWhite: { color: '#fff' },
  badge: { position: 'absolute', bottom: 6, right: 6, width: 24, height: 24, borderRadius: 12, backgroundColor: '#4A7C59', justifyContent: 'center', alignItems: 'center' },
  badgeTxt: { color: '#fff', fontSize: 13, fontWeight: 'bold' },
  hintBtn: { marginTop: 26, backgroundColor: '#E8A33D', paddingHorizontal: 28, paddingVertical: 12, borderRadius: 24, elevation: 2 },
  hintTxt: { fontSize: 20, fontWeight: '700', color: '#fff' },
});