import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ActivityIndicator, View } from 'react-native';
import { useAuth } from '../context/AuthContext';
import RoleGateway from '../screens/Shared/RoleGateway';
import CaregiverLogin from '../screens/Caregiver/CaregiverLogin';
import CaregiverSignup from '../screens/Caregiver/CaregiverSignup';
import CaregiverHome from '../screens/Caregiver/CaregiverHome';
import RoutineEditor from '../screens/Caregiver/RoutineEditor';
import Dashboard from '../screens/Caregiver/Dashboard';
import PatientApprovals from '../screens/Caregiver/PatientApprovals';
import PatientList from '../screens/Caregiver/PatientList';
import PatientPair from '../screens/Patient/PatientPair';
import PatientHome from '../screens/Patient/PatientHome';
import TodayRoutine from '../screens/Patient/TodayRoutine';
import GameHub from '../screens/Patient/GameHub';
import TapPair from '../games/TapPair';
import SequenceSimon from '../games/SequenceSimon';
import OddOneOut from '../games/OddOneOut';
import ObjectHunt from '../games/ObjectHunt';
import MemoryTest from '../games/MemoryTest';
import BtHubScreen from '../screens/Caregiver/BtHubScreen';
import BtServerScreen from '../screens/Patient/BtServerScreen';

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
          <>
            <Stack.Screen name="CaregiverHome" component={CaregiverHome} options={{ headerShown: false }} />
            <Stack.Screen name="RoutineEditor" component={RoutineEditor} />
            <Stack.Screen name="Dashboard" component={Dashboard} />
            <Stack.Screen name="PatientApprovals" component={PatientApprovals} />
            <Stack.Screen name="PatientList" component={PatientList} />
            <Stack.Screen name="BtHubScreen" component={BtHubScreen} />
          </>
        )}

        {status === 'patient' && (
          <>
            <Stack.Screen name="PatientHome" component={PatientHome} options={{ headerShown: false, gestureEnabled: false }} />
            <Stack.Screen name="TodayRoutine" component={TodayRoutine} />
            <Stack.Screen name="GameHub" component={GameHub} />
            <Stack.Screen name="TapPair" component={TapPair} />
            <Stack.Screen name="SequenceSimon" component={SequenceSimon} />
            <Stack.Screen name="OddOneOut" component={OddOneOut} />
            <Stack.Screen name="ObjectHunt" component={ObjectHunt} />
            <Stack.Screen name="MemoryTest" component={MemoryTest} />
            <Stack.Screen name="BtServerScreen" component={BtServerScreen} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}