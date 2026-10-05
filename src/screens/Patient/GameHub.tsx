import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList } from 'react-native';
import { useNavigation } from '@react-navigation/native';

const GAMES = [
  { id: 'tappair', name: 'Tap the Pairs', desc: 'Find matching pairs', emoji: '🍄', route: 'TapPair', color: '#4A7C59' },
  { id: 'simon', name: 'Simon Says', desc: 'Repeat the color pattern', emoji: '🎨', route: 'SequenceSimon', color: '#5B7DB1' },
  { id: 'odd', name: 'Odd One Out', desc: 'Tap what does not belong', emoji: '🧩', route: 'OddOneOut', color: '#D9A648' },
  { id: 'hunt', name: 'Object Hunt', desc: 'English · ꯃꯩꯇꯩꯂꯣꯟ', emoji: '🔍', route: 'ObjectHunt', color: '#B85C38' },
  { id: 'memtest', name: 'Memory Test', desc: 'Listen and remember', emoji: '🎵', route: 'MemoryTest', color: '#2E86AB' },
];

export default function GameHub() {
  const navigation = useNavigation<any>();
  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Choose a Game</Text>
      <FlatList data={GAMES} keyExtractor={(g) => g.id}
        renderItem={({ item }) => (
          <TouchableOpacity style={[styles.card, { borderLeftColor: item.color }]}
            onPress={() => navigation.navigate(item.route)}>
            <Text style={styles.emoji}>{item.emoji}</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.name}>{item.name}</Text>
              <Text style={styles.desc}>{item.desc}</Text>
            </View>
            <Text style={styles.arrow}>›</Text>
          </TouchableOpacity>
        )} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, backgroundColor: '#FDF6EC' },
  heading: { fontSize: 36, fontWeight: 'bold', marginTop: 40, marginBottom: 20 },
  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff',
    borderRadius: 16, padding: 20, marginBottom: 14, borderLeftWidth: 6 },
  emoji: { fontSize: 40, marginRight: 16 },
  name: { fontSize: 22, fontWeight: '600' },
  desc: { fontSize: 15, color: '#777' },
  arrow: { fontSize: 30, color: '#bbb' },
});