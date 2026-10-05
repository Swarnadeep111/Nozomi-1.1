import { createAudioPlayer, setAudioModeAsync } from 'expo-audio';
import { Vibration } from 'react-native';

type SoundName = 'ping' | 'pop' | 'wrong';

const FILES: Record<SoundName, any> = {
  ping: require('../../assets/sounds/ping.mp3'),
  pop: require('../../assets/sounds/pop.mp3'),
  wrong: require('../../assets/sounds/wrong.mp3'),
};

// Create players once (expo-audio uses players, not Sound objects)
const players = {
  ping: createAudioPlayer(FILES.ping),
  pop: createAudioPlayer(FILES.pop),
  wrong: createAudioPlayer(FILES.wrong),
};

export async function initSounds() {
  try {
    await setAudioModeAsync({ playsInSilentMode: true });
  } catch { /* vibration fallback still works */ }
}

export function playSound(name: SoundName) {
  try {
    const p = players[name];
    p.seekTo(0);     // rewind
    p.play();        // play — sync API, no await needed
  } catch {
    Vibration.vibrate(name === 'wrong' ? 300 : 80);
  }
}