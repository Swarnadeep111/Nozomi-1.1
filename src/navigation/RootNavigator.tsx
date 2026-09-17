import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuth } from '../context/AuthContext';
import RoleGateway from '../screens/Shared/RoleGateway';
import CaregiverLogin from '../screens/Caregiver/CaregiverLogin';
import CaregiverSignup from '../screens/Caregiver/CaregiverSignup';
import CaregiverHome from '../screens/Caregiver/CaregiverHome';
import PatientPair from '../screens/Patient/PatientPair';
import PatientHome from '../screens/Patient/PatientHome';
import { ActivityIndicator, View } from 'react-native';

const Stack = createNativeStackNavigator();

export default function RootNavigator() {
  const { status } = useAuth();

  if (status === 'loading') {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator>
        {status === 'none' && (
          <>
            <Stack.Screen name="RoleGateway" component={RoleGateway} options={{ headerShown: false }} />
            <Stack.Screen name="CaregiverAuth" component={CaregiverLogin} options={{ title: 'Caregiver Login' }} />
            <Stack.Screen name="CaregiverSignup" component={CaregiverSignup} options={{ title: 'Sign Up' }} />
            <Stack.Screen name="PatientPair" component={PatientPair} options={{ title: 'Pair Device' }} />
          </>
        )}
        {status === 'caregiver' && (
          <Stack.Screen name="CaregiverHome" component={CaregiverHome} options={{ headerShown: false }} />
        )}
        {status === 'patient' && (
          <Stack.Screen
            name="PatientHome"
            component={PatientHome}
            options={{ headerShown: false, gestureEnabled: false }}
          />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}