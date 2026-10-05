import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { logSession } from '../services/db';
import { speak, stopSpeaking, GameLang } from '../services/speech';
import { GAME_OBJECTS, UI_STRINGS, LocalizedObject } from '../localization/objectsMni';
import { MAX_LEVEL } from '../utils/difficulty';

const TOTAL_ROUNDS = 8;

export default function ObjectHunt({ navigation }: any) {
  const { patientId } = useAuth();
  const [lang, setLang] = useState<GameLang>('en');
  const [level, setLevel] = useState(1);
  const [round, setRound] = useState(0);
  const [target, setTarget] = useState<LocalizedObject | null>(null);
  const [choices, setChoices] = useState<LocalizedObject[]>([]);
  const [mistakes, setMistakes] = useState(0);
  const [startAt, setStartAt] = useState(0);

  useEffect(() => { setLevel(1); nextRound(1, 0); return stopSpeaking; }, []);

  const nextRound = (lvl: number, r: number) => {
    const distractorCount = Math.min(7, 3 + Math.floor(lvl / 4)); // 4 → 8 items on screen
    const shuffledPool = [...GAME_OBJECTS].sort(() => Math.random() - 0.5);
    const t = shuffledPool[0];
    setTarget(t);
    setChoices(shuffle([t, ...shuffledPool.slice(1, distractorCount)]));
    setStartAt(Date.now());
    // Auto-voice the prompt (text-only prompt at higher levels = real recall)
    const promptText = lang === 'mni' ? `${t.mniRoman}` : t.en;
    speak(promptText, lang);
  };
  const shuffle = <T,>(a: T[]) => [...a].sort(() => Math.random() - 0.5);

  const promptIsTextOnly = level > 10; // L1-10: emoji prompt shown; L11+: word→object recall

  const tap = async (obj: LocalizedObject) => {
    if (obj.id !== target!.id) { setMistakes((m) => m + 1); speak(UI_STRINGS.tryAgain[lang === 'mni' ? 'mniRoman' : 'en'], lang); return; }
    if (round + 1 >= TOTAL_ROUNDS) {
      const elapsed = (Date.now() - startAt) / 1000;
      const accuracy = TOTAL_ROUNDS / (TOTAL_ROUNDS + mistakes);
      const leveledUp = accuracy >= 0.8 && level < MAX_LEVEL;
      const newLevel = leveledUp ? level + 1 : accuracy < 0.4 ? Math.max(1, level - 1) : level;
      await logSession(patientId!, 'attention', accuracy,
        Math.round((elapsed / TOTAL_ROUNDS) * 1000), TOTAL_ROUNDS + mistakes, newLevel);
      Alert.alert('Well done! 🎉', `Level ${level} done${leveledUp ? ` → Level ${newLevel}!` : ''}`,
        [{ text: 'Next ▶', onPress: () => { setLevel(newLevel); setRound(0); nextRound(newLevel, 0); } },
         { text: 'Home', onPress: () => navigation.goBack() }]);
    } else {
      setRound((r) => r + 1);
      nextRound(level, round + 1);
    }
  };

  const s = (k: keyof typeof UI_STRINGS) => lang === 'mni' ? UI_STRINGS[k].mniMayek : UI_STRINGS[k].en;
  const targetLabel = lang === 'mni' ? `${target?.mniMayek} (${target?.mniRoman})` : target?.en;

  return (
    <View style={styles.container}>
      {/* Language toggle — caregiver/patient switches anytime */}
      <View style={styles.langRow}>
        <TouchableOpacity style={[styles.langBtn, lang === 'en' && styles.langActive]}
          onPress={() => { stopSpeaking(); setLang('en'); }}>
          <Text style={styles.langText}>English</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.langBtn, lang === 'mni' && styles.langActive]}
          onPress={() => { stopSpeaking(); setLang('mni'); }}>
          <Text style={styles.langText}>ꯃꯩꯇꯩꯂꯣꯟ (Manipuri)</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.header}>{s('tapThe')}</Text>
      <View style={styles.promptBox}>
        {promptIsTextOnly ? (
          <Text style={styles.promptText}>{targetLabel}</Text>
        ) : (
          <Text style={styles.promptEmoji}>{target?.emoji}</Text>
        )}
        <TouchableOpacity style={styles.speakBtn}
          onPress={() => speak(lang === 'mni' ? target!.mniRoman : target!.en, lang)}>
          <Text style={styles.speakText}>🔊 Hear it</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.grid}>
        {choices.map((o) => (
          <TouchableOpacity key={o.id} style={styles.card} onPress={() => tap(o)}>
            <Text style={styles.emoji}>{o.emoji}</Text>
            <Text style={styles.label}>{lang === 'mni' ? o.mniMayek : o.en}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <Text style={styles.meta}>Round {round + 1}/{TOTAL_ROUNDS} · Level {level}/{MAX_LEVEL}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', backgroundColor: '#FDF6EC', padding: 16 },
  langRow: { flexDirection: 'row', gap: 10, marginTop: 40 },
  langBtn: { paddingVertical: 10, paddingHorizontal: 16, borderRadius: 12, backgroundColor: '#E8E4DA' },
  langActive: { backgroundColor: '#4A7C59' },
  langText: { fontSize: 15, color: '#fff', fontWeight: '600' },
  header: { fontSize: 30, fontWeight: 'bold', marginTop: 16 },
  promptBox: { alignItems: 'center', marginVertical: 16 },
  promptEmoji: { fontSize: 72 },
  promptText: { fontSize: 40, fontWeight: 'bold', color: '#B85C38' },
  speakBtn: { backgroundColor: '#D9A648', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20, marginTop: 8 },
  speakText: { fontSize: 18, fontWeight: '600' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 12 },
  card: { width: 100, height: 116, backgroundColor: '#fff', borderRadius: 16, justifyContent: 'center', alignItems: 'center', elevation: 2 },
  emoji: { fontSize: 44 },
  label: { fontSize: 15, marginTop: 4, color: '#555' },
  meta: { fontSize: 15, color: '#666', marginTop: 16 },
});