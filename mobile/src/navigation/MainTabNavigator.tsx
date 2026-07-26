import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, Shadow } from '../config/theme';

// Screens
import HomeScreen from '../screens/home/HomeScreen';
import AgendaScreen from '../screens/agenda/AgendaScreen';
import EventDetailScreen from '../screens/agenda/EventDetailScreen';
import TasksScreen from '../screens/tasks/TasksScreen';
import TaskDetailScreen from '../screens/tasks/TaskDetailScreen';
import MessagesScreen from '../screens/messages/MessagesScreen';
import ConversationScreen from '../screens/messages/ConversationScreen';
import MoreScreen from '../screens/more/MoreScreen';
import ProfileScreen from '../screens/profile/ProfileScreen';

// ============================================================
// Types
// ============================================================

export type HomeStackParamList = {
  HomeMain: undefined;
};

export type AgendaStackParamList = {
  AgendaMain: undefined;
  EventDetail: { eventId: string };
  CreateEvent: { date?: string } | undefined;
};

export type TasksStackParamList = {
  TasksMain: undefined;
  TaskDetail: { taskId: string };
  CreateTask: undefined;
};

export type MessagesStackParamList = {
  MessagesMain: undefined;
  Conversation: { conversationId: string; name: string };
};

export type MoreStackParamList = {
  MoreMain: undefined;
  Profile: undefined;
  Mails: { mailId?: string } | undefined;
  Visitors: undefined;
  Resources: undefined;
  Reports: undefined;
  Settings: undefined;
};

export type MainTabParamList = {
  Home: undefined;
  Agenda: undefined;
  Tasks: undefined;
  Messages: undefined;
  More: undefined;
};

// ============================================================
// Stacks individuels
// ============================================================

const HomeStack = createStackNavigator<HomeStackParamList>();
function HomeNavigator() {
  return (
    <HomeStack.Navigator screenOptions={stackOptions}>
      <HomeStack.Screen name="HomeMain" component={HomeScreen} options={{ headerShown: false }} />
    </HomeStack.Navigator>
  );
}

const AgendaStack = createStackNavigator<AgendaStackParamList>();
function AgendaNavigator() {
  return (
    <AgendaStack.Navigator screenOptions={stackOptions}>
      <AgendaStack.Screen name="AgendaMain" component={AgendaScreen} options={{ headerShown: false }} />
      <AgendaStack.Screen
        name="EventDetail"
        component={EventDetailScreen}
        options={{ title: 'Détail événement', ...headerStyle }}
      />
    </AgendaStack.Navigator>
  );
}

const TasksStack = createStackNavigator<TasksStackParamList>();
function TasksNavigator() {
  return (
    <TasksStack.Navigator screenOptions={stackOptions}>
      <TasksStack.Screen name="TasksMain" component={TasksScreen} options={{ headerShown: false }} />
      <TasksStack.Screen
        name="TaskDetail"
        component={TaskDetailScreen}
        options={{ title: 'Détail tâche', ...headerStyle }}
      />
    </TasksStack.Navigator>
  );
}

const MessagesStack = createStackNavigator<MessagesStackParamList>();
function MessagesNavigator() {
  return (
    <MessagesStack.Navigator screenOptions={stackOptions}>
      <MessagesStack.Screen name="MessagesMain" component={MessagesScreen} options={{ headerShown: false }} />
      <MessagesStack.Screen
        name="Conversation"
        component={ConversationScreen}
        options={({ route }) => ({ title: route.params.name, ...headerStyle })}
      />
    </MessagesStack.Navigator>
  );
}

const MoreStack = createStackNavigator<MoreStackParamList>();
function MoreNavigator() {
  return (
    <MoreStack.Navigator screenOptions={stackOptions}>
      <MoreStack.Screen name="MoreMain" component={MoreScreen} options={{ headerShown: false }} />
      <MoreStack.Screen
        name="Profile"
        component={ProfileScreen}
        options={{ title: 'Mon profil', ...headerStyle }}
      />
    </MoreStack.Navigator>
  );
}

// ============================================================
// Tab Navigator principal
// ============================================================

const Tab = createBottomTabNavigator<MainTabParamList>();

export default function MainTabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.textSecondary,
        tabBarLabelStyle: styles.tabLabel,
        tabBarIcon: ({ color, focused }) => {
          const icons: Record<string, [string, string]> = {
            Home: ['home', 'home-outline'],
            Agenda: ['calendar', 'calendar-outline'],
            Tasks: ['checkmark-circle', 'checkmark-circle-outline'],
            Messages: ['chatbubbles', 'chatbubbles-outline'],
            More: ['menu', 'menu-outline'],
          };
          const [active, inactive] = icons[route.name] ?? ['ellipsis-horizontal', 'ellipsis-horizontal'];
          return (
            <Ionicons
              name={(focused ? active : inactive) as any}
              size={24}
              color={color}
            />
          );
        },
      })}
    >
      <Tab.Screen name="Home" component={HomeNavigator} options={{ title: 'Accueil' }} />
      <Tab.Screen name="Agenda" component={AgendaNavigator} options={{ title: 'Agenda' }} />
      <Tab.Screen name="Tasks" component={TasksNavigator} options={{ title: 'Tâches' }} />
      <Tab.Screen name="Messages" component={MessagesNavigator} options={{ title: 'Messages' }} />
      <Tab.Screen name="More" component={MoreNavigator} options={{ title: 'Plus' }} />
    </Tab.Navigator>
  );
}

// ============================================================
// Styles partagés
// ============================================================

const stackOptions = {
  cardStyle: { backgroundColor: Colors.background },
};

const headerStyle = {
  headerStyle: { backgroundColor: Colors.primary, ...Shadow.sm },
  headerTintColor: Colors.textOnPrimary,
  headerTitleStyle: { fontWeight: '700' as const, fontSize: Typography.fontSize.md },
};

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: Colors.surface,
    borderTopColor: Colors.border,
    borderTopWidth: 1,
    paddingBottom: 6,
    paddingTop: 6,
    height: 64,
    ...Shadow.md,
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
  },
});
