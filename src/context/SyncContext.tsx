import React, { createContext, useContext, useEffect, useState } from 'react';
import NetInfo from '@react-native-community/netinfo';
import { pushLocalChanges, pullRemoteChanges } from '../services/sync';
import { useAuth } from './AuthContext';
import { auth } from '../services/firebase';

type SyncState = {
  isOnline: boolean;
  isSyncing: boolean;
  lastSyncAt: number | null;
  triggerSync: () => Promise<void>;
};

const SyncContext = createContext<SyncState>(null as any);

export function SyncProvider({ children }: { children: React.ReactNode }) {
  const [isOnline, setIsOnline] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncAt, setLastSyncAt] = useState<number | null>(null);
  const { patientId } = useAuth();

  const triggerSync = async () => {
    if (isSyncing || !isOnline) return;
    setIsSyncing(true);
    try {
      const { pushed } = await pushLocalChanges();
      if (patientId) await pullRemoteChanges(patientId);
      if (pushed > 0) console.log(`Sync complete: ${pushed} items pushed`);
      setLastSyncAt(Date.now());
    } catch (e) {
    console.warn('Sync failed, will retry on next trigger:', e);
    // rows stay synced=0 in SQLite → nothing is lost, next sync retries
    } finally {
      setIsSyncing(false);
    }
  };

  useEffect(() => {
    const unsub = NetInfo.addEventListener((state) => {
      const wasOnline = isOnline;
      setIsOnline(state.isConnected ?? false);
      // THE key moment: reconnection → sync immediately
      if (!wasOnline && state.isConnected) {
        triggerSync();
      }
    });
    // Also sync on app start if online
    NetInfo.fetch().then((state) => {
      if (state.isConnected) triggerSync();
    });
    return () => unsub();
  }, [patientId]);

  return (
    <SyncContext.Provider value={{ isOnline, isSyncing, lastSyncAt, triggerSync }}>
      {children}
    </SyncContext.Provider>
  );
}

export const useSync = () => useContext(SyncContext);