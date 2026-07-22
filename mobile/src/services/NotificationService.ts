import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import SecretisAPI from '../config/api';

// ============================================================
// Configuration handlers Expo Notifications
// ============================================================

export const NotificationService = {
  /**
   * Configure les handlers globaux (foreground).
   * À appeler une seule fois au démarrage de l'app.
   */
  configure() {
    Notifications.setNotificationHandler({
      handleNotification: async (notification) => {
        const data = notification.request.content.data as Record<string, string>;

        // Afficher toujours en foreground, sauf si l'écran est déjà visible
        return {
          shouldShowAlert: true,
          shouldPlaySound: data?.silent !== 'true',
          shouldSetBadge: true,
        };
      },
    });
  },

  /**
   * Enregistre le device pour les push notifications.
   * Retourne l'Expo Push Token ou null.
   */
  async registerDevice(): Promise<string | null> {
    if (!Device.isDevice) {
      console.warn('[Notifications] Push non disponible sur simulateur');
      return null;
    }

    // Vérifier / demander la permission
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.warn('[Notifications] Permission refusée');
      return null;
    }

    // Android — canal par défaut
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('secretis-default', {
        name: 'SECRETIS',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#1A3A5C',
        sound: 'default',
      });

      await Notifications.setNotificationChannelAsync('secretis-urgent', {
        name: 'SECRETIS — Urgent',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 500, 200, 500],
        lightColor: '#DC3545',
        sound: 'default',
        bypassDnd: true,
      });
    }

    // Récupérer le token Expo
    const tokenData = await Notifications.getExpoPushTokenAsync({
      projectId: 'your-eas-project-id',
    });

    const token = tokenData.data;

    // Envoyer le token à l'API SECRETIS
    await NotificationService.registerTokenWithApi(token);

    return token;
  },

  /**
   * Enregistre le token push auprès du backend SECRETIS.
   */
  async registerTokenWithApi(token: string): Promise<void> {
    try {
      await SecretisAPI.post('/notifications/push-token', {
        token,
        platform: Platform.OS,
        deviceId: Device.modelId ?? 'unknown',
      });
      console.log('[Notifications] Token enregistré :', token.slice(0, 30) + '...');
    } catch (err) {
      console.warn('[Notifications] Erreur enregistrement token :', err);
    }
  },

  /**
   * Gère le tap sur une notification et navigue vers l'écran concerné.
   */
  handleNotificationTap(
    data: Record<string, string>,
    navigation: any,
  ): void {
    if (!data?.type || !navigation) return;

    console.log('[Notifications] Tap :', data);

    switch (data.type) {
      case 'TASK':
        if (data.entityId) {
          navigation.navigate('MainTabs', {
            screen: 'Tasks',
            params: {
              screen: 'TaskDetail',
              params: { taskId: data.entityId },
            },
          });
        }
        break;

      case 'AGENDA':
        if (data.entityId) {
          navigation.navigate('MainTabs', {
            screen: 'Agenda',
            params: {
              screen: 'EventDetail',
              params: { eventId: data.entityId },
            },
          });
        }
        break;

      case 'MESSAGE':
        if (data.entityId) {
          navigation.navigate('MainTabs', {
            screen: 'Messages',
            params: {
              screen: 'Conversation',
              params: { conversationId: data.entityId },
            },
          });
        }
        break;

      case 'MAIL':
        navigation.navigate('MainTabs', {
          screen: 'More',
          params: {
            screen: 'Mails',
            params: data.entityId ? { mailId: data.entityId } : undefined,
          },
        });
        break;

      case 'VISITOR':
        navigation.navigate('MainTabs', {
          screen: 'More',
          params: { screen: 'Visitors' },
        });
        break;

      default:
        navigation.navigate('MainTabs', { screen: 'Home' });
    }
  },

  /**
   * Affiche une notification locale immédiate.
   */
  async sendLocal(title: string, body: string, data?: Record<string, string>): Promise<void> {
    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data: data ?? {},
        sound: true,
      },
      trigger: null, // Immédiat
    });
  },

  /**
   * Planifie une notification dans X secondes.
   */
  async scheduleLocal(
    title: string,
    body: string,
    seconds: number,
    data?: Record<string, string>,
  ): Promise<string> {
    return Notifications.scheduleNotificationAsync({
      content: { title, body, data: data ?? {}, sound: true },
      trigger: { seconds },
    });
  },

  /**
   * Annule toutes les notifications planifiées.
   */
  async cancelAll(): Promise<void> {
    await Notifications.cancelAllScheduledNotificationsAsync();
  },

  /**
   * Remet le badge à zéro.
   */
  async resetBadge(): Promise<void> {
    await Notifications.setBadgeCountAsync(0);
  },
};
