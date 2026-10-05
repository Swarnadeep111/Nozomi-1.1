import type { GameSession } from '../types';

export function engagementScore(sessions: GameSession[]): number {
  if (sessions.length === 0) return 0;
  const recent = sessions.slice(0, 10);
  const avgAccuracy = recent.reduce((s, x) => s + x.accuracy, 0) / recent.length;
  // consistency = how close recent accuracies are to each other (0-1)
  const variance = recent.reduce((s, x) => s + (x.accuracy - avgAccuracy) ** 2, 0) / recent.length;
  const consistency = Math.max(0, 1 - variance * 4);
  // frequency: sessions in last 7 days (max ~2/day → cap at 1)
  const weekAgo = Date.now() - 7 * 86400000;
  const freq = Math.min(1, sessions.filter((s) => s.timestamp > weekAgo).length / 14);
  return Math.round((avgAccuracy * 0.5 + consistency * 0.3 + freq * 0.2) * 100);
}

export function trend(sessions: GameSession[]): 'improving' | 'stable' | 'declining' {
  if (sessions.length < 4) return 'stable';
  const older = sessions.slice(2, 4).reduce((s, x) => s + x.accuracy, 0) / 2;
  const newer = sessions.slice(0, 2).reduce((s, x) => s + x.accuracy, 0) / 2;
  if (newer - older > 0.1) return 'improving';
  if (older - newer > 0.1) return 'declining';
  return 'stable';
}