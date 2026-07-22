import { MMKV } from 'react-native-mmkv';
import * as SecureStore from 'expo-secure-store';

// ============================================================
// MMKV — stockage non-sensible rapide
// ============================================================

export const storage = new MMKV({
  id: 'secretis-storage',
  encryptionKey: 'secretis-mmkv-key-v1',
});

// Helpers typés sur MMKV

export const mmkv = {
  getString(key: string): string | undefined {
    return storage.getString(key);
  },
  setString(key: string, value: string): void {
    storage.set(key, value);
  },
  getBoolean(key: string): boolean | undefined {
    return storage.getBoolean(key);
  },
  setBoolean(key: string, value: boolean): void {
    storage.set(key, value);
  },
  getNumber(key: string): number | undefined {
    return storage.getNumber(key);
  },
  setNumber(key: string, value: number): void {
    storage.set(key, value);
  },
  getObject<T>(key: string): T | null {
    const raw = storage.getString(key);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as T;
    } catch {
      return null;
    }
  },
  setObject<T>(key: string, value: T): void {
    storage.set(key, JSON.stringify(value));
  },
  delete(key: string): void {
    storage.delete(key);
  },
  clearAll(): void {
    storage.clearAll();
  },
  contains(key: string): boolean {
    return storage.contains(key);
  },
};

// Clés MMKV
export const STORAGE_KEYS = {
  SAVED_EMAIL: 'saved_email',
  BIOMETRIC_ENABLED: 'biometric_enabled',
  NOTIFICATIONS_ENABLED: 'notifications_enabled',
  THEME: 'app_theme',
  LANGUAGE: 'app_language',
  LAST_SYNC: 'last_sync',
  OFFLINE_QUEUE: 'offline_queue',
  CACHED_USER: 'cached_user',
  PUSH_TOKEN: 'push_token',
  FIRST_LAUNCH: 'first_launch',
  ONBOARDING_DONE: 'onboarding_done',
} as const;

// ============================================================
// SecureStore — données sensibles (tokens, clés biométriques)
// ============================================================

export const secureStorage = {
  async set(key: string, value: string): Promise<void> {
    await SecureStore.setItemAsync(key, value);
  },
  async get(key: string): Promise<string | null> {
    return SecureStore.getItemAsync(key);
  },
  async delete(key: string): Promise<void> {
    await SecureStore.deleteItemAsync(key);
  },
};

export const SECURE_KEYS = {
  ACCESS_TOKEN: 'secretis_access_token',
  REFRESH_TOKEN: 'secretis_refresh_token',
  TOKEN_EXPIRY: 'secretis_token_expiry',
  BIOMETRIC_KEY: 'secretis_biometric_key',
  PIN_HASH: 'secretis_pin_hash',
} as const;
