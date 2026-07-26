import * as Notifications from 'expo-notifications'
import * as Device from 'expo-device'
import { Platform } from 'react-native'
import { mmkv, STORAGE_KEYS } from '../utils/storage'

// ============================================================
// Notification handler (call once at app startup)
// ============================================================

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
})

// ============================================================
// Types
// ============================================================

export type NotificationType =
  | 'event_reminder'
  | 'task_assigned'
  | 'document_validated'
  | 'visitor_arrived'
  | 'message_received'
  | 'support_ticket'
  | 'license_expiring'

interface SecretisNotificationData {
  type: NotificationType
  resourceId?: string
}

type NavigateCallback = (screen: string, params?: Record<string, unknown>) => void

// ============================================================
// Service
// ============================================================

export class PushNotificationService {
  private _navigateCb: NavigateCallback | null = null
  private _receivedListener: Notifications.Subscription | null = null
  private _responseListener: Notifications.Subscription | null = null

  // ── Permissions ─────────────────────────────────────────

  async requestPermission(): Promise<boolean> {
    if (!Device.isDevice) {
      console.warn('[PushNotifications] Not a physical device — skipping permission request')
      return false
    }

    if (Platform.OS === 'android') {
      // Android 13+ requires explicit permission
      await Notifications.setNotificationChannelAsync('default', {
        name: 'SECRETIS',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#1A3A5C',
      })
    }

    const { status: existingStatus } = await Notifications.getPermissionsAsync()

    if (existingStatus === 'granted') return true

    const { status } = await Notifications.requestPermissionsAsync()
    return status === 'granted'
  }

  // ── Token ───────────────────────────────────────────────

  async getExpoPushToken(): Promise<string | null> {
    const granted = await this.requestPermission()
    if (!granted) return null

    try {
      const tokenData = await Notifications.getExpoPushTokenAsync({
        projectId: process.env.EXPO_PUBLIC_PROJECT_ID,
      })
      const token = tokenData.data
      mmkv.setString(STORAGE_KEYS.PUSH_TOKEN, token)
      return token
    } catch (err) {
      console.error('[PushNotifications] Failed to get push token:', err)
      return null
    }
  }

  // ── Device registration ─────────────────────────────────

  async registerDevice(): Promise<void> {
    const token = await this.getExpoPushToken()
    if (!token) return

    const deviceId = this._getDeviceId()
    const { default: SecretisAPI } = await import('../config/api')

    try {
      await SecretisAPI.post('/devices', {
        push_token: token,
        platform: Platform.OS as 'ios' | 'android',
        device_id: deviceId,
        model: Device.modelName ?? 'Unknown',
        os_version: Device.osVersion ?? 'Unknown',
        app_version: process.env.EXPO_PUBLIC_APP_VERSION ?? '2.0.0',
      })
      console.log('[PushNotifications] Device registered successfully')
    } catch (err) {
      console.error('[PushNotifications] Failed to register device:', err)
    }
  }

  async unregisterDevice(): Promise<void> {
    const deviceId = this._getDeviceId()
    const { default: SecretisAPI } = await import('../config/api')

    try {
      await SecretisAPI.delete(`/devices/${deviceId}`)
      console.log('[PushNotifications] Device unregistered')
    } catch (err) {
      console.error('[PushNotifications] Failed to unregister device:', err)
    }
  }

  // ── Handlers ─────────────────────────────────────────────

  setupNotificationHandlers(navigate?: NavigateCallback): void {
    if (navigate) this._navigateCb = navigate

    // Foreground notification listener
    this._receivedListener?.remove()
    this._receivedListener = Notifications.addNotificationReceivedListener(
      (notification) => {
        console.log('[PushNotifications] Received:', notification.request.content)
      },
    )

    // Tap on notification → navigate
    this._responseListener?.remove()
    this._responseListener = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        const data = response.notification.request.content.data as
          | Partial<SecretisNotificationData>
          | undefined
        if (data?.type) {
          this.navigateFromNotification(data as SecretisNotificationData)
        }
      },
    )
  }

  destroyHandlers(): void {
    this._receivedListener?.remove()
    this._responseListener?.remove()
    this._receivedListener = null
    this._responseListener = null
  }

  navigateFromNotification(notif: SecretisNotificationData): void {
    if (!this._navigateCb) return

    const { type, resourceId } = notif

    const routes: Record<NotificationType, [string, Record<string, unknown>?]> = {
      event_reminder: ['agenda', resourceId ? { id: resourceId } : undefined],
      task_assigned: ['tasks', resourceId ? { id: resourceId } : undefined],
      document_validated: ['ged', resourceId ? { id: resourceId } : undefined],
      visitor_arrived: ['visitors', resourceId ? { id: resourceId } : undefined],
      message_received: ['communication/messages', undefined],
      support_ticket: ['help/tickets', resourceId ? { id: resourceId } : undefined],
      license_expiring: ['subscription', undefined],
    } as Record<NotificationType, [string, Record<string, unknown>?]>

    const [screen, params] = routes[type] ?? ['home', undefined]
    this._navigateCb(screen, params)
  }

  // ── Local test notification ─────────────────────────────

  async sendTestNotification(): Promise<void> {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'IBIG SECRETIS',
        body: 'Vos notifications fonctionnent correctement !',
        data: { type: 'message_received' } satisfies Partial<SecretisNotificationData>,
      },
      trigger: { seconds: 1 },
    })
  }

  // ── Private ──────────────────────────────────────────────

  private _getDeviceId(): string {
    const stored = mmkv.getString('device_id')
    if (stored) return stored

    const id = `${Platform.OS}_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`
    mmkv.setString('device_id', id)
    return id
  }
}

// Singleton
export const pushNotificationService = new PushNotificationService()
