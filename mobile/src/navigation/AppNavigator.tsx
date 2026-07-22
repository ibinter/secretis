import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { useAuth } from '../hooks/useAuth';
import AuthNavigator from './AuthNavigator';
import MainTabNavigator from './MainTabNavigator';
import LoadingSpinner from '../components/ui/LoadingSpinner';

// ============================================================
// Types de navigation racine
// ============================================================

export type RootStackParamList = {
  Auth: undefined;
  MainTabs: undefined;
};

const Stack = createStackNavigator<RootStackParamList>();

// ============================================================
// Navigateur racine
// ============================================================

export default function AppNavigator() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <LoadingSpinner fullScreen message="Chargement..." />;
  }

  return (
    <Stack.Navigator screenOptions={{ headerShown: false, animationEnabled: true }}>
      {isAuthenticated ? (
        <Stack.Screen name="MainTabs" component={MainTabNavigator} />
      ) : (
        <Stack.Screen name="Auth" component={AuthNavigator} />
      )}
    </Stack.Navigator>
  );
}
