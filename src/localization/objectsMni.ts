/**
 * ⚠️ VALIDATION REQUIRED: Meitei Mayek strings below are best-effort.
 * Have a native Manipuri speaker verify BEFORE user testing.
 * Romanization included as fallback display + for TTS attempt.
 */
export interface LocalizedObject {
  id: string;
  emoji: string;
  en: string;
  mniMayek: string;
  mniRoman: string;
}

export const GAME_OBJECTS: LocalizedObject[] = [
  { id: 'water',  emoji: '💧', en: 'Water',  mniMayek: 'ꯏꯁꯤꯡ',   mniRoman: 'Ising' },
  { id: 'sun',    emoji: '☀️', en: 'Sun',    mniMayek: 'ꯅꯨꯃꯤꯠ',   mniRoman: 'Numit' },
  { id: 'moon',   emoji: '🌙', en: 'Moon',   mniMayek: 'ꯊꯋꯥ',     mniRoman: 'Thawa' },
  { id: 'fish',   emoji: '🐟', en: 'Fish',   mniMayek: 'ꯉꯥ',       mniRoman: 'Ngaa' },
  { id: 'fire',   emoji: '🔥', en: 'Fire',   mniMayek: 'ꯃꯩ',       mniRoman: 'Mei' },
  { id: 'flower', emoji: '🌸', en: 'Flower', mniMayek: 'ꯂꯩ',       mniRoman: 'Lei' },
];

export const UI_STRINGS = {
  tapThe:    { en: 'Tap the',   mniMayek: 'ꯇꯥꯞ ꯇꯨ',  mniRoman: 'Tap tu' },  // placeholder — validate!
  wellDone:  { en: 'Well done!', mniMayek: 'ꯆꯥꯎꯕꯥ!',  mniRoman: 'Chaoba!' }, // validate!
  tryAgain:  { en: 'Try again',  mniMayek: 'ꯑꯃꯨꯛ ꯍꯨꯟꯅ', mniRoman: 'Amuk hunna' }, // validate!
};