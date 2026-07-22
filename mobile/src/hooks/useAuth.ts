import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from 'react';
import * as LocalAuthentication from 'expo-local-authentication';
import SecretisAPI, { tokenStorage } from '../config/api';
import { mmkv, secureStorage, STORAGE_KEYS, SECURE_KEYS } from '../utils/storage';
import type { User, AuthTokens } from '../types';

// ============================================================
// Types
// ============================================================

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  biometricAvailable: boolean;
}

interface AuthContextValue extends AuthState {
  login: (email: string, password: string) => Promise<LoginResult>;
  verifyMfa: (code: string, sessionToken: string) => Promise<void>;
  logout: () => Promise<void>;
  loginWithBiometric: () => Promise<void>;
  refreshUser: () => Promise<void>;
  enableBiometric: () => Promise<boolean>;
  disableBiometric: () => void;
  isBiometricEnabled: boolean;
}

interface LoginResult {
  requiresMfa: boolean;
  sessionToken?: string;
  user?: User;
}

interface LoginResponse {
  requiresMfa: boolean;
  sessionToken?: string;
  user?: User;
  tokens?: AuthTokens;
}

// ============================================================
// Context
// ============================================================

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    isAuthenticated: false,
    isLoading: true,
    biometricAvailable: false,
  });

  const isBiometricEnabled = mmkv.getBoolean(STORAGE_KEYS.BIOMETRIC_ENABLED) ?? false;

  // Initialisation : vérification token existant
  useEffect(() => {
    (async () => {
      try {
        // Vérifier biométrie disponible
        const hasBio = await LocalAuthentication.hasHardwareAsync();
        const isEnrolled = await LocalAuthentication.isEnrolledAsync();
        const biometricAvailable = hasBio && isEnrolled;

        // Vérifier token
        const token = await tokenStorage.getAccessToken();
        const expired = await tokenStorage.isExpired();

        if (token && !expired) {
          // Récupérer profil depuis cache ou API
          const cached = mmkv.getObject<User>(STORAGE_KEYS.CACHED_USER);
          if (cached) {
            setState({ user: cached, isAuthenticated: true, isLoading: false, biometricAvailable });
          } else {
            const { data: user } = await SecretisAPI.get<User>('/auth/me');
            mmkv.setObject(STORAGE_KEYS.CACHED_USER, user);
            setState({ user, isAuthenticated: true, isLoading: false, biometricAvailable });
          }
        } else {
          setState((s) => ({ ...s, isLoading: false, biometricAvailable }));
        }
      } catch {
        await tokenStorage.clear();
        setState((s) => ({ ...s, isLoading: false }));
      }
    })();
  }, []);

  const login = useCallback(async (email: string, password: string): Promise<LoginResult> => {
    const { data } = await SecretisAPI.post<LoginResponse>('/auth/login', { email, password });

    if (data.requiresMfa) {
      return { requiresMfa: true, sessionToken: data.sessionToken };
    }

    // Pas de MFA — on a les tokens
    if (data.tokens && data.user) {
      await tokenStorage.save(
        data.tokens.accessToken,
        data.tokens.refreshToken,
        data.tokens.expiresAt,
      );
      mmkv.setObject(STORAGE_KEYS.CACHED_USER, data.user);
      setState((s) => ({ ...s, user: data.user!, isAuthenticated: true }));
    }

    return { requiresMfa: false, user: data.user };
  }, []);

  const verifyMfa = useCallback(async (code: string, sessionToken: string) => {
    const { data } = await SecretisAPI.post<{ tokens: AuthTokens; user: User }>('/auth/mfa/verify', {
      code,
      sessionToken,
    });
    await tokenStorage.save(
      data.tokens.accessToken,
      data.tokens.refreshToken,
      data.tokens.expiresAt,
    );
    mmkv.setObject(STORAGE_KEYS.CACHED_USER, data.user);
    setState((s) => ({ ...s, user: data.user, isAuthenticated: true }));
  }, []);

  const logout = useCallback(async () => {
    try {
      await SecretisAPI.post('/auth/logout');
    } catch {
      // Ignorer les erreurs réseau au logout
    } finally {
      await tokenStorage.clear();
      mmkv.delete(STORAGE_KEYS.CACHED_USER);
      setState((s) => ({ ...s, user: null, isAuthenticated: false }));
    }
  }, []);

  const loginWithBiometric = useCallback(async () => {
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: 'Connectez-vous à SECRETIS',
      fallbackLabel: 'Utiliser le mot de passe',
      cancelLabel: 'Annuler',
    });

    if (!result.success) {
      throw new Error('Authentification biométrique échouée');
    }

    // Le token biométrique est stocké en SecureStore
    const bioToken = await secureStorage.get(SECURE_KEYS.BIOMETRIC_KEY);
    if (!bioToken) {
      throw new Error('Aucune session biométrique enregistrée');
    }

    const { data } = await SecretisAPI.post<{ tokens: AuthTokens; user: User }>(
      '/auth/biometric',
      { biometricToken: bioToken },
    );
    await tokenStorage.save(
      data.tokens.accessToken,
      data.tokens.refreshToken,
      data.tokens.expiresAt,
    );
    mmkv.setObject(STORAGE_KEYS.CACHED_USER, data.user);
    setState((s) => ({ ...s, user: data.user, isAuthenticated: true }));
  }, []);

  const refreshUser = useCallback(async () => {
    const { data } = await SecretisAPI.get<User>('/auth/me');
    mmkv.setObject(STORAGE_KEYS.CACHED_USER, data);
    setState((s) => ({ ...s, user: data }));
  }, []);

  const enableBiometric = useCallback(async (): Promise<boolean> => {
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: 'Confirmer pour activer la biométrie',
    });
    if (!result.success) return false;

    // Enregistrer un token biométrique depuis l'API
    const { data } = await SecretisAPI.post<{ biometricToken: string }>('/auth/biometric/register');
    await secureStorage.set(SECURE_KEYS.BIOMETRIC_KEY, data.biometricToken);
    mmkv.setBoolean(STORAGE_KEYS.BIOMETRIC_ENABLED, true);
    return true;
  }, []);

  const disableBiometric = useCallback(() => {
    secureStorage.delete(SECURE_KEYS.BIOMETRIC_KEY);
    mmkv.setBoolean(STORAGE_KEYS.BIOMETRIC_ENABLED, false);
  }, []);

  const value: AuthContextValue = {
    ...state,
    isBiometricEnabled,
    login,
    verifyMfa,
    logout,
    loginWithBiometric,
    refreshUser,
    enableBiometric,
    disableBiometric,
  };

  return React.createElement(AuthContext.Provider, { value }, children);
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth doit être utilisé dans AuthProvider');
  return ctx;
}
