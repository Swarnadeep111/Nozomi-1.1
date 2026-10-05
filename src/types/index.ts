export type Role = 'caregiver' | 'patient';

export interface User {
  id: string;
  role: Role;
  pairedWith?: string;        // patientId ←→ caregiverId
  language: 'en' | 'bn' | 'as' | 'mni' | 'kha';
  createdAt: number;
}

export interface RoutineItem {
  id: string;
  patientId: string;
  type: 'medicine' | 'hydration' | 'appointment' | 'activity';
  title: string;
  time: string;               // "09:30"
  recurrence: 'daily' | 'weekly' | 'once';
  completed: boolean;
  completedAt?: number;
  synced: boolean;
  updatedAt: number;          // ← add this! You'll need it for last-write-wins sync
}

export interface GameSession {
  id: string;
  patientId: string;
  gameType: 'memory' | 'attention' | 'pattern' | 'recognition';
  score: number;
  accuracy: number;           // 0–1
  avgResponseTimeMs: number;
  attempts: number;
  difficulty: number;         // 1–5 tier
  timestamp: number;
  synced: boolean;
  updatedAt: number;
}

export interface CognitiveProfile {
  patientId: string;
  baselineScore: number | null;
  baselineCompletedAt?: number;
  currentDifficulty: Record<string, number>; // per gameType
  engagementScore: number;
  trend: 'improving' | 'stable' | 'declining';
  updatedAt: number;
}

export interface Alert {
  id: string;
  patientId: string;
  type: 'missed_routine' | 'accuracy_drop' | 'inactivity';
  message: string;
  timestamp: number;
  seen: boolean;
}