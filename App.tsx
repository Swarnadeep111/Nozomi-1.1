import React, { useState, useEffect } from 'react';
import { ActivityIndicator, View, StatusBar } from 'react-native';
import { AuthProvider } from './src/context/AuthContext';
import { SyncProvider } from './src/context/SyncContext';
import RootNavigator from './src/navigation/RootNavigator';
import { initDatabase } from './src/services/db';

export default function App() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    initDatabase().then(() => setReady(true));
  }, []);

  if (!ready) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <AuthProvider>
      <SyncProvider>
        <RootNavigator />
      </SyncProvider>
      <StatusBar style="auto" />
    </AuthProvider>
  );
}