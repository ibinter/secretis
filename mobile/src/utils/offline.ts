import NetInfo, { NetInfoState } from '@react-native-community/netinfo';
import { mmkv, STORAGE_KEYS } from './storage';
import SecretisAPI from '../config/api';

// ============================================================
// Types
// ============================================================

export interface OfflineAction {
  id: string;
  url: string;
  method: 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  data?: unknown;
  headers?: Record<string, string>;
  createdAt: number;
  retries: number;
}

// ============================================================
// Queue d'actions hors-ligne
// ============================================================

class OfflineQueue {
  private readonly MAX_RETRIES = 3;

  private load(): OfflineAction[] {
    return mmkv.getObject<OfflineAction[]>(STORAGE_KEYS.OFFLINE_QUEUE) ?? [];
  }

  private save(queue: OfflineAction[]): void {
    mmkv.setObject(STORAGE_KEYS.OFFLINE_QUEUE, queue);
  }

  enqueue(action: Omit<OfflineAction, 'id' | 'createdAt' | 'retries'>): void {
    const queue = this.load();
    queue.push({
      ...action,
      id: `${Date.now()}_${Math.random().toString(36).slice(2)}`,
      createdAt: Date.now(),
      retries: 0,
    });
    this.save(queue);
    console.log(`[OfflineQueue] Action mise en file : ${action.method} ${action.url}`);
  }

  dequeue(id: string): void {
    const queue = this.load().filter((a) => a.id !== id);
    this.save(queue);
  }

  getAll(): OfflineAction[] {
    return this.load();
  }

  size(): number {
    return this.load().length;
  }

  clear(): void {
    this.save([]);
  }

  async flush(): Promise<{ success: number; failed: number }> {
    const queue = this.load();
    if (queue.length === 0) return { success: 0, failed: 0 };

    console.log(`[OfflineQueue] Synchronisation de ${queue.length} action(s)...`);

    let success = 0;
    let failed = 0;

    for (const action of queue) {
      try {
        await SecretisAPI.request({
          url: action.url,
          method: action.method,
          data: action.data,
          headers: action.headers,
        });
        this.dequeue(action.id);
        success++;
        console.log(`[OfflineQueue] OK : ${action.method} ${action.url}`);
      } catch (err) {
        if (action.retries >= this.MAX_RETRIES) {
          this.dequeue(action.id);
          failed++;
          console.warn(`[OfflineQueue] ABANDON : ${action.method} ${action.url} après ${action.retries} tentatives`);
        } else {
          // Incrémenter les tentatives
          const current = this.load();
          const idx = current.findIndex((a) => a.id === action.id);
          if (idx >= 0) {
            current[idx].retries += 1;
            this.save(current);
          }
          failed++;
          console.warn(`[OfflineQueue] ECHEC (tentative ${action.retries + 1}) : ${action.method} ${action.url}`);
        }
      }
    }

    return { success, failed };
  }
}

export const offlineQueue = new OfflineQueue();

// ============================================================
// Listener réseau global
// ============================================================

let networkListener: (() => void) | null = null;

export function startNetworkListener(
  onOnline?: (result: { success: number; failed: number }) => void,
  onOffline?: () => void,
): void {
  if (networkListener) return; // Déjà actif

  networkListener = NetInfo.addEventListener(async (state: NetInfoState) => {
    if (state.isConnected && state.isInternetReachable !== false) {
      const size = offlineQueue.size();
      if (size > 0) {
        console.log(`[Network] Retour en ligne — synchronisation de ${size} action(s)`);
        const result = await offlineQueue.flush();
        onOnline?.(result);
      }
    } else {
      console.log('[Network] Hors ligne');
      onOffline?.();
    }
  });
}

export function stopNetworkListener(): void {
  if (networkListener) {
    networkListener();
    networkListener = null;
  }
}

export async function checkConnectivity(): Promise<boolean> {
  const state = await NetInfo.fetch();
  return !!(state.isConnected && state.isInternetReachable !== false);
}
