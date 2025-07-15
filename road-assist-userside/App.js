import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import LoginScreen from './screens/LoginScreen';
import SignupScreen from './screens/SignupScreen';
import UserDashboard from './screens/UserDashboard';
import ProviderDashboardScreen from './screens/ProviderDashboardScreen';
import RequestHistoryScreen from './screens/RequestHistoryScreen';

const Stack = createNativeStackNavigator();

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="Login">
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="Signup" component={SignupScreen} />
        <Stack.Screen name="UserDashboard" component={UserDashboard} />
        <Stack.Screen name="ProviderDashboard" component={ProviderDashboardScreen} />
        <Stack.Screen name="History" component={RequestHistoryScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
