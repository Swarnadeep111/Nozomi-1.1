import * as SQLite from 'expo-sqlite';
import type { GameSession, RoutineItem } from '../types';

let db: SQLite.SQLiteDatabase;

export async function initDatabase() {
  db = await SQLite.openDatabaseAsync('nozomi.db');
  await db.execAsync(`
    PRAGMA journal_mode = WAL;

    CREATE TABLE IF NOT EXISTS routine_items (
      id TEXT PRIMARY KEY NOT NULL,
      patient_id TEXT NOT NULL,
      type TEXT NOT NULL,
      title TEXT NOT NULL,
      time TEXT NOT NULL,
      recurrence TEXT NOT NULL,
      completed INTEGER DEFAULT 0,
      completed_at INTEGER,
      synced INTEGER DEFAULT 0,
      updated_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS game_sessions (
      id TEXT PRIMARY KEY NOT NULL,
      patient_id TEXT NOT NULL,
      game_type TEXT NOT NULL,
      score REAL NOT NULL,
      accuracy REAL NOT NULL,
      avg_response_time_ms INTEGER NOT NULL,
      attempts INTEGER NOT NULL,
      difficulty INTEGER NOT NULL,
      timestamp INTEGER NOT NULL,
      synced INTEGER DEFAULT 0,
      updated_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS cognitive_profile (
      patient_id TEXT PRIMARY KEY NOT NULL,
      baseline_score INTEGER,
      current_difficulty TEXT NOT NULL DEFAULT '{}',
      engagement_score REAL DEFAULT 0,
      trend TEXT DEFAULT 'stable',
      synced INTEGER DEFAULT 0,
      updated_at INTEGER NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_sessions_synced ON game_sessions(synced);
    CREATE INDEX IF NOT EXISTS idx_routine_synced ON routine_items(synced);

    CREATE TABLE IF NOT EXISTS alerts (
      id TEXT PRIMARY KEY NOT NULL,
      patient_id TEXT NOT NULL,
      type TEXT NOT NULL,
      message TEXT NOT NULL,
      timestamp INTEGER NOT NULL,
      seen INTEGER DEFAULT 0,
      synced INTEGER DEFAULT 0,
      updated_at INTEGER NOT NULL
    );
  `);
  return db;
}

export function getDb() {
  if (!db) throw new Error('Database not initialized — call initDatabase() first');
  return db;
}

export async function insertGameSession(s: GameSession) {
  const d = getDb();
  await d.runAsync(
    `INSERT OR REPLACE INTO game_sessions
     (id, patient_id, game_type, score, accuracy, avg_response_time_ms, attempts, difficulty, timestamp, synced, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?)`,
    [s.id, s.patientId, s.gameType, s.score, s.accuracy, s.avgResponseTimeMs, s.attempts, s.difficulty, s.timestamp, s.updatedAt]
  );
}

export async function getUnsyncedSessions(): Promise<GameSession[]> {
  const d = getDb();
  const rows = await d.getAllAsync<any>('SELECT * FROM game_sessions WHERE synced = 0');
  return rows.map(mapSessionRow);
}

export async function markSessionSynced(id: string) {
  const d = getDb();
  await d.runAsync('UPDATE game_sessions SET synced = 1 WHERE id = ?', [id]);
}

function mapSessionRow(r: any): GameSession {
  return {
    id: r.id, patientId: r.patient_id, gameType: r.game_type, score: r.score,
    accuracy: r.accuracy, avgResponseTimeMs: r.avg_response_time_ms, attempts: r.attempts,
    difficulty: r.difficulty, timestamp: r.timestamp, synced: !!r.synced, updatedAt: r.updated_at,
  };
}

export async function insertRoutineItem(item: RoutineItem) {
  const d = getDb();
  await d.runAsync(
    `INSERT OR REPLACE INTO routine_items
     (id, patient_id, type, title, time, recurrence, completed, completed_at, synced, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?)`,
    [item.id, item.patientId, item.type, item.title, item.time, item.recurrence,
     item.completed ? 1 : 0, item.completedAt ?? null, item.updatedAt]
  );
}

export async function getRoutineItems(patientId: string): Promise<RoutineItem[]> {
  const d = getDb();
  const rows = await d.getAllAsync<any>(
    'SELECT * FROM routine_items WHERE patient_id = ? ORDER BY time ASC',
    [patientId]
  );
  return rows.map(mapRoutineRow);
}

export async function markRoutineComplete(id: string, completedAt: number) {
  const d = getDb();
  await d.runAsync(
    `UPDATE routine_items SET completed = 1, completed_at = ?, synced = 0, updated_at = ? WHERE id = ?`,
    [completedAt, completedAt, id]
  );
}

export async function getUnsyncedRoutineItems(): Promise<RoutineItem[]> {
  const d = getDb();
  const rows = await d.getAllAsync<any>('SELECT * FROM routine_items WHERE synced = 0');
  return rows.map(mapRoutineRow);
}

export async function markRoutineSynced(id: string) {
  const d = getDb();
  await d.runAsync('UPDATE routine_items SET synced = 1 WHERE id = ?', [id]);
}

function mapRoutineRow(r: any): RoutineItem {
  return {
    id: r.id, patientId: r.patient_id, type: r.type, title: r.title,
    time: r.time, recurrence: r.recurrence, completed: !!r.completed,
    completedAt: r.completed_at ?? undefined, synced: !!r.synced, updatedAt: r.updated_at,
  };
}