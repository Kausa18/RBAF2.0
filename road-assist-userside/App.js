import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';

// Import your screens
import LoginScreen from './screens/LoginScreen';
import SignupScreen from './screens/SignupScreen';
import UserDashboard from './screens/UserDashboard';
import ProviderDashboardScreen from './screens/ProviderDashboardScreen';
import RequestHistoryScreen from './screens/RequestHistoryScreen';
import ProviderPendingScreen from './screens/ProviderPendingScreen'; // ✅ ADDED

const Stack = createNativeStackNavigator();

export default function App() {
  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <Stack.Navigator 
          initialRouteName="Login"
          screenOptions={{
            headerStyle: {
              backgroundColor: '#4ECDC4', // Match your app theme
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
            options={{ 
              title: 'Create Account',
              headerShown: false // Keep consistent with Login
            }}
          />
          <Stack.Screen 
            name="UserDashboard" 
            component={UserDashboard}
            options={{ 
              title: 'Road Assist',
              headerLeft: () => null, // Prevent going back to login
            }}
          />
          <Stack.Screen 
            name="ProviderDashboard" 
            component={ProviderDashboardScreen}
            options={{ 
              title: 'Provider Dashboard',
              headerLeft: () => null, // Prevent going back to login
            }}
          />
          <Stack.Screen 
            name="RequestHistory" 
            component={RequestHistoryScreen}
            options={{ title: 'Request History' }}
          />
          {/* ✅ ADDED: Missing ProviderPending screen */}
          <Stack.Screen 
            name="ProviderPending" 
            component={ProviderPendingScreen}
            options={{ 
              title: 'Account Under Review',
              headerLeft: () => null, // Prevent going back
            }}
          />
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}