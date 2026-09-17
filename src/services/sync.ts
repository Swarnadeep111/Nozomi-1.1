import { db as firestore } from './firebase';
import { doc, setDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { getUnsyncedSessions, markSessionSynced, getUnsyncedRoutineItems, markRoutineSynced, getDb } from './db';
import type { NetInfoState } from '@react-native-community/netinfo';

export async function pushLocalChanges(): Promise<{ pushed: number; failed: number }> {
  let pushed = 0, failed = 0;

  // Push game sessions
  const sessions = await getUnsyncedSessions();
  for (const s of sessions) {
    try {
      await setDoc(doc(firestore, 'gameSessions', s.id), {
        patientId: s.patientId,
        gameType: s.gameType,
        score: s.score,
        accuracy: s.accuracy,
        avgResponseTimeMs: s.avgResponseTimeMs,
        attempts: s.attempts,
        difficulty: s.difficulty,
        timestamp: s.timestamp,
        updatedAt: s.updatedAt,
      });
      await markSessionSynced(s.id);
      pushed++;
    } catch (e) {
      console.warn('Push failed for session', s.id, e);
      failed++;
    }
  }

  // Push routine items
  const routines = await getUnsyncedRoutineItems();
  for (const r of routines) {
    try {
      await setDoc(doc(firestore, 'routineItems', r.id), {
        patientId: r.patientId,
        type: r.type,
        title: r.title,
        time: r.time,
        recurrence: r.recurrence,
        completed: r.completed,
        completedAt: r.completedAt ?? null,
        updatedAt: r.updatedAt,
      });
      await markRoutineSynced(r.id);
      pushed++;
    } catch (e) {
      console.warn('Push failed for routine', r.id, e);
      failed++;
    }
  }

  return { pushed, failed };
}

export async function pullRemoteChanges(patientId: string): Promise<number> {
  const d = getDb();
  let applied = 0;

  const q = query(collection(firestore, 'gameSessions'), where('patientId', '==', patientId));
  const snapshot = await getDocs(q);

  for (const docSnap of snapshot.docs) {
    const remote = docSnap.data();
    const local = await d.getFirstAsync<any>(
      'SELECT updated_at FROM game_sessions WHERE id = ?',
      [docSnap.id]
    );

    // LAST-WRITE-WINS: remote only wins if it's newer (or we have no local row)
    if (!local || remote.updatedAt > local.updated_at) {
      await d.runAsync(
        `INSERT OR REPLACE INTO game_sessions
         (id, patient_id, game_type, score, accuracy, avg_response_time_ms, attempts, difficulty, timestamp, synced, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)`,
        [docSnap.id, remote.patientId, remote.gameType, remote.score, remote.accuracy,
         remote.avgResponseTimeMs, remote.attempts, remote.difficulty, remote.timestamp, remote.updatedAt]
      );
      applied++;
    }
  }
  return applied;
}