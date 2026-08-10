// ============================================================
// SECRETIS — API Configuration
// ============================================================

export const API_CONFIG = {
  baseURL: process.env.EXPO_PUBLIC_API_URL ?? 'https://app.secretis.ibigsoft.com',
  timeout: 30_000,
  version: 'v1',

  endpoints: {
    // Auth
    login: '/api/v1/auth/login',
    logout: '/api/v1/auth/logout',
    refresh: '/api/v1/auth/refresh',
    mfa: '/api/v1/auth/mfa/verify',
    biometricRegister: '/api/v1/auth/biometric/register',
    biometricAuth: '/api/v1/auth/biometric',
    me: '/api/v1/auth/me',

    // Devices (push notifications)
    devices: '/api/v1/devices',

    // Core modules
    events: '/api/v1/events',
    tasks: '/api/v1/tasks',
    documents: '/api/v1/documents',
    visitors: '/api/v1/visitors',
    messages: '/api/v1/messages',
    notifications: '/api/v1/notifications',

    // Profile & preferences
    profile: '/api/v1/profile',
    notificationPrefs: '/api/v1/notifications/preferences',
  },
} as const

export type ApiEndpointKey = keyof typeof API_CONFIG.endpoints
