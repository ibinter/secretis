import * as LocalAuthentication from 'expo-local-authentication'
import * as SecureStore from 'expo-secure-store'

// ============================================================
// Secure store keys
// ============================================================

const KEY_BIOMETRIC_ENABLED = 'secretis_biometric_enabled'
const KEY_BIOMETRIC_USER = 'secretis_biometric_user'
const KEY_BIOMETRIC_TOKEN = 'secretis_biometric_token'

// ============================================================
// Types
// ============================================================

export type BiometricType = 'fingerprint' | 'face' | 'iris' | null

export interface BiometricAvailability {
  available: boolean
  type: BiometricType
}

export interface BiometricAuthResult {
  success: boolean
  userId?: string
  error?: string
}

// ============================================================
// Service
// ============================================================

export class BiometricAuthService {
  /**
   * Check whether the device hardware supports biometry and
   * return the dominant biometric type.
   */
  async isAvailable(): Promise<BiometricAvailability> {
    const hasHardware = await LocalAuthentication.hasHardwareAsync()
    if (!hasHardware) return { available: false, type: null }

    const supportedTypes = await LocalAuthentication.supportedAuthenticationTypesAsync()
    let type: BiometricType = null

    if (
      supportedTypes.includes(
        LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION,
      )
    ) {
      type = 'face'
    } else if (
      supportedTypes.includes(
        LocalAuthentication.AuthenticationType.FINGERPRINT,
      )
    ) {
      type = 'fingerprint'
    } else if (
      supportedTypes.includes(
        LocalAuthentication.AuthenticationType.IRIS,
      )
    ) {
      type = 'iris'
    }

    return { available: true, type }
  }

  /**
   * Check whether the user has enrolled biometrics on their device.
   */
  async isEnrolled(): Promise<boolean> {
    return LocalAuthentication.isEnrolledAsync()
  }

  /**
   * Check whether the user has opted-in to biometric login in SECRETIS.
   */
  async isEnabled(): Promise<boolean> {
    const flag = await SecureStore.getItemAsync(KEY_BIOMETRIC_ENABLED)
    return flag === 'true'
  }

  /**
   * Enable biometric login for the given user.
   * Stores userId in SecureStore and marks biometry as active.
   */
  async enable(userId: string): Promise<void> {
    await SecureStore.setItemAsync(KEY_BIOMETRIC_USER, userId)
    await SecureStore.setItemAsync(KEY_BIOMETRIC_ENABLED, 'true')
  }

  /**
   * Disable biometric login and clear all related SecureStore entries.
   */
  async disable(): Promise<void> {
    await SecureStore.deleteItemAsync(KEY_BIOMETRIC_ENABLED)
    await SecureStore.deleteItemAsync(KEY_BIOMETRIC_USER)
    await SecureStore.deleteItemAsync(KEY_BIOMETRIC_TOKEN)
  }

  /**
   * Prompt the native biometric dialog.
   * On success returns the userId that was stored during enable().
   */
  async authenticate(): Promise<BiometricAuthResult> {
    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Connectez-vous à IBIG SECRETIS',
        fallbackLabel: 'Utiliser le mot de passe',
        cancelLabel: 'Annuler',
        disableDeviceFallback: false,
      })

      if (!result.success) {
        const errorMsg =
          (result as { error?: string }).error === 'user_cancel'
            ? 'Authentification annulée'
            : 'Authentification biométrique échouée'
        return { success: false, error: errorMsg }
      }

      const userId = await SecureStore.getItemAsync(KEY_BIOMETRIC_USER)
      if (!userId) {
        return {
          success: false,
          error: 'Session biométrique introuvable. Veuillez vous reconnecter.',
        }
      }

      return { success: true, userId }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Erreur biométrique inconnue'
      return { success: false, error: message }
    }
  }

  /**
   * Store an API token in SecureStore (hardware-backed on supported devices).
   */
  async storeToken(token: string): Promise<void> {
    await SecureStore.setItemAsync(KEY_BIOMETRIC_TOKEN, token, {
      requireAuthentication: false, // The biometric prompt is handled by authenticate()
      keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK,
    })
  }

  /**
   * Retrieve the stored API token. Returns null if not found.
   */
  async getToken(): Promise<string | null> {
    return SecureStore.getItemAsync(KEY_BIOMETRIC_TOKEN)
  }
}

// Singleton export
export const biometricAuthService = new BiometricAuthService()
