import * as Speech from 'expo-speech';

export type GameLang = 'en' | 'mni';

/**
 * Voice layer for games.
 * - English: expo-speech 'en-IN' — works on all Android/iOS devices today.
 * - Manipuri: attempts 'mni-IN' (rarely available on-device).
 *   UPGRADE PATH (Phase 6): Bhashini TTS API returns audio for Meitei.
 *   Replace the mni branch with a Bhashini fetch + expo-audio playback.
 */
export async function speak(text: string, lang: GameLang = 'en') {
  try {
    if (lang === 'mni') {
      // Try device voice; if none exists, expo-speech silently uses default
      // (imperfect pronunciation). Bhashini replaces this branch.
      Speech.speak(text, { language: 'mni-IN', rate: 0.8 });
    } else {
      Speech.speak(text, { language: 'en-IN', rate: 0.85 }); // slow & clear for elders
    }
  } catch (e) {
    console.warn('Speech failed:', e);
  }
}

export function stopSpeaking() {
  Speech.stop();
}