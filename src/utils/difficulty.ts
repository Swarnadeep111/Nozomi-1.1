import type { GameSession } from '../types';

export function nextDifficulty(history: GameSession[], current: number): number {
  if (history.length < 3) return current; // need 3 sessions before adapting
  const avgAccuracy = history.slice(0, 3).reduce((s, x) => s + x.accuracy, 0) / 3;
  if (avgAccuracy > 0.8) return Math.min(5, current + 1);   // too easy → harder
  if (avgAccuracy < 0.4) return Math.max(1, current - 1);   // too hard → easier
  return current;
}

export function pairsForDifficulty(difficulty: number): number {
  return difficulty + 1; // tier 1 = 2 pairs ... tier 5 = 6 pairs
}

export const MAX_LEVEL = 20;

export function levelConfig(level: number) {
  const pairs = Math.min(18, 2 + Math.floor(level * 0.85));   // 2 → 18 pairs
  const parTimePerMatch = Math.max(3.0, 5.0 - level * 0.1);   // 5.0s → 3.0s
  return { level, pairs, parTimePerMatch };
}

export function levelFromPerformance(
  avgTimePerMatch: number, accuracy: number, currentLevel: number
): number {
  const { parTimePerMatch } = levelConfig(currentLevel);
  if (accuracy < 0.4) return Math.max(1, currentLevel - 1);           // protect
  if (avgTimePerMatch < parTimePerMatch && accuracy >= 0.7)
    return Math.min(MAX_LEVEL, currentLevel + 1);                     // earned it
  return currentLevel;
}