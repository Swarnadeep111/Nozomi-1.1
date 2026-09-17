import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { auth } from '../services/firebase';
import * as SecureStore from 'expo-secure-store';

type AuthState = {
  status: 'loading' | 'caregiver' | 'patient' | 'none';
  caregiverUid: string | null;
  patientId: string | null;
  signInCaregiver: (uid: string) => Promise<void>;
  signInPatient: (patientId: string) => Promise<void>;
  signOutAll: () => Promise<void>;
};

const AuthContext = createContext<AuthState>(null as any);

const PATIENT_KEY = 'nozomi_patient_id';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<AuthState['status']>('loading');
  const [caregiverUid, setCaregiverUid] = useState<string | null>(null);
  const [patientId, setPatientId] = useState<string | null>(null);

  useEffect(() => {
    // 1. Check patient pairing (SecureStore)
    SecureStore.getItemAsync(PATIENT_KEY).then((stored) => {
      if (stored) {
        setPatientId(stored);
        setStatus('patient');
      }
    });

    // 2. Listen to Firebase caregiver session (AsyncStorage-persisted)
    const unsub = onAuthStateChanged(auth, (user: FirebaseUser | null) => {
    if (user && !user.isAnonymous && !patientId) {
    // Real (email/password) user = caregiver
    setCaregiverUid(user.uid);
    setStatus('caregiver');
    } else if (!user && !patientId) {
    setStatus('none');
  }
    });

    return unsub;
  }, []);

  const value: AuthState = {
    status,
    caregiverUid,
    patientId,
    signInCaregiver: async (uid) => {
      setCaregiverUid(uid);
      setStatus('caregiver');
    },
    signInPatient: async (pid) => {
      await SecureStore.setItemAsync(PATIENT_KEY, pid);
      setPatientId(pid);
      setStatus('patient');
    },
    signOutAll: async () => {
      await auth.signOut();
      await SecureStore.deleteItemAsync(PATIENT_KEY);
      setCaregiverUid(null);
      setPatientId(null);
      setStatus('none');
    },
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);