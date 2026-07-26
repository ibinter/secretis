import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import LoginScreen from '../screens/auth/LoginScreen';
import ForgotPasswordScreen from '../screens/auth/ForgotPasswordScreen';
import MfaScreen from '../screens/auth/MfaScreen';
import BiometricSetup from '../screens/auth/BiometricSetup';

// ============================================================
// Types
// ============================================================

export type AuthStackParamList = {
  Login: undefined;
  ForgotPassword: undefined;
  Mfa: { sessionToken: string; email: string };
  BiometricSetup: undefined;
};

const Stack = createStackNavigator<AuthStackParamList>();

// ============================================================
// Navigateur Auth
// ============================================================

export default function AuthNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        cardStyle: { backgroundColor: '#1A3A5C' },
        animationEnabled: true,
      }}
    >
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
      <Stack.Screen name="Mfa" component={MfaScreen} />
      <Stack.Screen
        name="BiometricSetup"
        component={BiometricSetup}
        options={{ cardStyle: { backgroundColor: '#F5F7FA' } }}
      />
    </Stack.Navigator>
  );
}
