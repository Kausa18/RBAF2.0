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
      <Stack.Navigator 
        initialRouteName="Login"
        screenOptions={{
          headerStyle: {
            backgroundColor: '#007bff',
          },
          headerTintColor: '#fff',
          headerTitleStyle: {
            fontWeight: 'bold',
          },
        }}
      >
        <Stack.Screen 
          name="Login" 
          component={LoginScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen 
          name="Signup" 
          component={SignupScreen}
          options={{ title: 'Create Account' }}
        />
        <Stack.Screen 
          name="UserDashboard" 
          component={UserDashboard}
          options={{ title: 'Road Assist' }}
        />
        <Stack.Screen 
          name="ProviderDashboard" 
          component={ProviderDashboardScreen}
          options={{ title: 'Provider Dashboard' }}
        />
        {/* ✅ FIXED: Changed from "History" to "RequestHistory" to match navigation calls */}
        <Stack.Screen 
          name="RequestHistory" 
          component={RequestHistoryScreen}
          options={{ title: 'Request History' }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}