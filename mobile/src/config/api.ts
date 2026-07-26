import axios, {
  AxiosInstance,
  AxiosRequestConfig,
  AxiosResponse,
  InternalAxiosRequestConfig,
} from 'axios';
import * as SecureStore from 'expo-secure-store';
import NetInfo from '@react-native-community/netinfo';
import { offlineQueue } from '../utils/offline';

// ============================================================
// Configuration
// ============================================================

const DEFAULT_TIMEOUT = 30_000; // 30s

const API_BASE_URL =
  process.env.API_BASE_URL ?? 'https://api.secretis.ibigsoft.com';

// Keys SecureStore
const TOKEN_KEY = 'secretis_access_token';
const REFRESH_TOKEN_KEY = 'secretis_refresh_token';
const TOKEN_EXPIRY_KEY = 'secretis_token_expiry';

// ============================================================
// Création instance Axios
// ============================================================

export const SecretisAPI: AxiosInstance = axios.create({
  baseURL: `${API_BASE_URL}/api/v1`,
  timeout: DEFAULT_TIMEOUT,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    'X-App-Platform': 'mobile',
    'X-App-Version': '1.0.0',
  },
});

// ============================================================
// Intercepteur — Requête : injection token
// ============================================================

SecretisAPI.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    // Vérifie la connexion réseau
    const netState = await NetInfo.fetch();
    if (!netState.isConnected) {
      // Mise en file d'attente si méthode mutante
      const method = config.method?.toUpperCase();
      if (method && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
        offlineQueue.enqueue({
          url: config.url ?? '',
          method: method as 'POST' | 'PUT' | 'PATCH' | 'DELETE',
          data: config.data,
          headers: config.headers as Record<string, string>,
        });
      }
      return Promise.reject(new OfflineError('Pas de connexion réseau'));
    }

    // Injection du token
    const token = await SecureStore.getItemAsync(TOKEN_KEY);
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => Promise.reject(error),
);

// ============================================================
// Intercepteur — Réponse : refresh token automatique
// ============================================================

let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value: string) => void;
  reject: (reason?: unknown) => void;
}> = [];

function processQueue(error: unknown, token: string | null = null) {
  failedQueue.forEach(({ resolve, reject }) => {
    if (error) {
      reject(error);
    } else {
      resolve(token!);
    }
  });
  failedQueue = [];
}

SecretisAPI.interceptors.response.use(
  (response: AxiosResponse) => response,
  async (error) => {
    const originalRequest = error.config as AxiosRequestConfig & {
      _retry?: boolean;
    };

    // Gestion hors-ligne
    if (!error.response) {
      return Promise.reject(
        new OfflineError(error.message ?? 'Erreur réseau'),
      );
    }

    // Token expiré (401) — tentative de refresh
    if (error.response.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise<string>((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            if (originalRequest.headers) {
              (originalRequest.headers as Record<string, string>)[
                'Authorization'
              ] = `Bearer ${token}`;
            }
            return SecretisAPI(originalRequest);
          })
          .catch(Promise.reject.bind(Promise));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const refreshToken = await SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
        if (!refreshToken) {
          throw new Error('No refresh token');
        }

        const response = await axios.post<{
          accessToken: string;
          refreshToken: string;
          expiresAt: number;
        }>(`${API_BASE_URL}/api/v1/auth/refresh`, { refreshToken });

        const { accessToken, refreshToken: newRefresh, expiresAt } =
          response.data;

        await SecureStore.setItemAsync(TOKEN_KEY, accessToken);
        await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, newRefresh);
        await SecureStore.setItemAsync(TOKEN_EXPIRY_KEY, String(expiresAt));

        SecretisAPI.defaults.headers.common['Authorization'] =
          `Bearer ${accessToken}`;

        processQueue(null, accessToken);

        if (originalRequest.headers) {
          (originalRequest.headers as Record<string, string>)[
            'Authorization'
          ] = `Bearer ${accessToken}`;
        }
        return SecretisAPI(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        // Effacer les tokens — l'app doit rediriger vers login
        await SecureStore.deleteItemAsync(TOKEN_KEY);
        await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
        await SecureStore.deleteItemAsync(TOKEN_EXPIRY_KEY);
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(normalizeError(error));
  },
);

// ============================================================
// Helpers d'authentification
// ============================================================

export const tokenStorage = {
  async save(accessToken: string, refreshToken: string, expiresAt: number) {
    await SecureStore.setItemAsync(TOKEN_KEY, accessToken);
    await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, refreshToken);
    await SecureStore.setItemAsync(TOKEN_EXPIRY_KEY, String(expiresAt));
  },
  async clear() {
    await SecureStore.deleteItemAsync(TOKEN_KEY);
    await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
    await SecureStore.deleteItemAsync(TOKEN_EXPIRY_KEY);
  },
  async getAccessToken() {
    return SecureStore.getItemAsync(TOKEN_KEY);
  },
  async getRefreshToken() {
    return SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
  },
  async isExpired() {
    const expiry = await SecureStore.getItemAsync(TOKEN_EXPIRY_KEY);
    if (!expiry) return true;
    return Date.now() > Number(expiry);
  },
};

// ============================================================
// Erreurs personnalisées
// ============================================================

export class OfflineError extends Error {
  readonly isOffline = true;
  constructor(message = 'Vous êtes hors ligne') {
    super(message);
    this.name = 'OfflineError';
  }
}

export class ApiError extends Error {
  readonly status: number;
  readonly code?: string;
  constructor(message: string, status: number, code?: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
  }
}

function normalizeError(error: unknown): Error {
  if (axios.isAxiosError(error)) {
    const status = error.response?.status ?? 0;
    const message =
      error.response?.data?.message ??
      error.response?.data?.error ??
      error.message ??
      'Une erreur est survenue';
    const code = error.response?.data?.code;
    return new ApiError(message, status, code);
  }
  if (error instanceof Error) return error;
  return new Error(String(error));
}

export default SecretisAPI;
