import * as Speech from 'expo-speech';

const BHASHINI_AUTH = process.env.EXPO_PUBLIC_BHASHINI_AUTH_TOKEN!; // dev only — move to proxy for prod
const BHASHINI_USER_ID = process.env.EXPO_PUBLIC_BHASHINI_USER_ID!;
const PROXY_URL = process.env.EXPO_PUBLIC_VOICE_PROXY_URL; // optional Cloud Function URL

export type VoiceLang = 'en' | 'mni' | 'bn' | 'hi';

// Bhashini language codes: Meitei = 'mni', Bengali = 'bn', Hindi = 'hi'
const TTS_SOURCE_LANG: Record<VoiceLang, string> = {
  en: 'en', mni: 'mni', bn: 'bn', hi: 'hi',
};

/**
 * TIER 1: cached proxy (prod) → TIER 2: direct Bhashini (dev) →
 * TIER 3: expo-speech device voice (always works for en/bn/hi,
 * best-effort for mni) → TIER 4: vibration/silent
 */
export async function speak(text: string, lang: VoiceLang = 'en') {
  // English never needs Bhashini — device voice is reliable
  if (lang === 'en') {
    Speech.speak(text, { language: 'en-IN', rate: 0.85 });
    return;
  }

  try {
    const audioUri = await fetchTtsAudio(text, lang);
    if (audioUri) {
      await playRemoteAudio(audioUri);   // expo-audio player
      return;
    }
  } catch (e) {
    console.warn('Bhashini TTS failed, falling back to device voice:', e);
  }

  // Fallback — imperfect for Meitei but never silent
  Speech.speak(text, { language: lang === 'mni' ? 'mni-IN' : `${lang}-IN`, rate: 0.8 });
}

async function fetchTtsAudio(text: string, lang: VoiceLang): Promise<string | null> {
  // Tier 1: your caching proxy
  if (PROXY_URL) {
    const res = await fetch(`${PROXY_URL}/tts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, lang }),
    });
    if (!res.ok) throw new Error(`Proxy ${res.status}`);
    const { audioUrl } = await res.json();
    return audioUrl;
  }

  // Tier 2: direct Bhashini pipeline call (DEV ONLY)
  const res = await fetch(
    'https://meity-auth.ulcaconfig.org.ulca.in/ulca/apis/v0/model/getModelsPipeline', // confirm exact URL in your Bhashini dashboard
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: BHASHINI_AUTH,
        'User-ID': BHASHINI_USER_ID,
      },
      body: JSON.stringify({
        pipelineTasks: [{
          taskType: 'tts',
          config: [{
            language: { sourceLanguage: TTS_SOURCE_LANG[lang] },
            serviceId: '<your-tts-service-id>',   // from Bhashini dashboard
          }],
        }],
        inputData: {
          input: [{ source: text }],
        },
      }),
    }
  );
  if (!res.ok) throw new Error(`Bhashini ${res.status}`);
  const data = await res.json();
  // Response shape: pipelineResponse[0].output[0].audio — a base64 string
  const b64 = data?.pipelineResponse?.[0]?.output?.[0]?.audio;
  if (!b64) return null;
  return `data:audio/wav;base64,${b64}`;
}

// expo-audio plays base64 data URIs via createAudioPlayer(source)
import { createAudioPlayer } from 'expo-audio';
async function playRemoteAudio(uri: string) {
  const player = createAudioPlayer(uri);
  player.play();
}