import { useEffect, useRef, useCallback } from 'react';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { useNavigation } from '@react-navigation/native';
import { NotificationService } from '../services/NotificationService';
import { mmkv, STORAGE_KEYS } from '../utils/storage';

// ============================================================
// Hook useNotifications
// ============================================================

export function useNotifications() {
  const navigation = useNavigation<any>();
  const notificationListener = useRef<Notifications.Subscription>();
  const responseListener = useRef<Notifications.Subscription>();

  const registerForPushNotifications = useCallback(async (): Promise<string | null> => {
    if (Platform.OS === 'web') return null;

    const token = await NotificationService.registerDevice();
    if (token) {
      mmkv.setString(STORAGE_KEYS.PUSH_TOKEN, token);
    }
    return token;
  }, []);

  useEffect(() => {
    // Configurer les handlers
    NotificationService.configure();

    // Écouter les notifications reçues en foreground
    notificationListener.current = Notifications.addNotificationReceivedListener(
      (notification) => {
        console.log('[Notifications] Reçue :', notification.request.content.title);
      },
    );

    // Écouter le tap sur une notification
    responseListener.current = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        const data = response.notification.request.content.data as Record<string, string>;
        NotificationService.handleNotificationTap(data, navigation);
      },
    );

    // Enregistrer au démarrage
    registerForPushNotifications();

    return () => {
      if (notificationListener.current) {
        Notifications.removeNotificationSubscription(notificationListener.current);
      }
      if (responseListener.current) {
        Notifications.removeNotificationSubscription(responseListener.current);
      }
    };
  }, [navigation, registerForPushNotifications]);

  const requestPermissions = useCallback(async (): Promise<boolean> => {
    const { status } = await Notifications.requestPermissionsAsync({
      ios: {
        allowAlert: true,
        allowBadge: true,
        allowSound: true,
      },
    });
    return status === 'granted';
  }, []);

  const scheduleLocalNotification = useCallback(
    async (title: string, body: string, seconds = 0) => {
      await Notifications.scheduleNotificationAsync({
        content: { title, body, sound: true },
        trigger: seconds > 0 ? { seconds } : null,
      });
    },
    [],
  );

  const dismissAll = useCallback(async () => {
    await Notifications.dismissAllNotificationsAsync();
  }, []);

  const setBadgeCount = useCallback(async (count: number) => {
    await Notifications.setBadgeCountAsync(count);
  }, []);

  return {
    registerForPushNotifications,
    requestPermissions,
    scheduleLocalNotification,
    dismissAll,
    setBadgeCount,
  };
}
