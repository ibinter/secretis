import { mmkv, STORAGE_KEYS } from '../utils/storage'
import { EventEmitter } from 'eventemitter3'

// ============================================================
// Types
// ============================================================

export interface QueuedAction {
  id: string
  endpoint: string
  method: 'POST' | 'PUT' | 'DELETE' | 'PATCH'
  body: Record<string, unknown>
  headers?: Record<string, string>
  timestamp: number
  retries: number
  maxRetries: number
  conflictStrategy: 'client-wins' | 'server-wins' | 'manual'
  resourceType: string
  resourceId?: string
}

export interface ConflictItem {
  id: string
  action: QueuedAction
  serverData: Record<string, unknown>
  serverUpdatedAt: string
}

type OfflineQueueEvents = {
  conflict: (conflict: ConflictItem) => void
  synced: (count: number) => void
  error: (action: QueuedAction, error: Error) => void
}

const QUEUE_KEY = STORAGE_KEYS.OFFLINE_QUEUE

// ============================================================
// OfflineQueue
// ============================================================

class OfflineQueue extends EventEmitter<OfflineQueueEvents> {
  // ── Persistence ──────────────────────────────────────────

  private load(): QueuedAction[] {
    return mmkv.getObject<QueuedAction[]>(QUEUE_KEY) ?? []
  }

  private save(queue: QueuedAction[]): void {
    mmkv.setObject(QUEUE_KEY, queue)
  }

  // ── Public API ───────────────────────────────────────────

  async enqueue(
    action: Omit<QueuedAction, 'id' | 'timestamp' | 'retries'>,
  ): Promise<string> {
    const id = `${Date.now()}_${Math.random().toString(36).slice(2, 9)}`
    const queue = this.load()
    queue.push({
      ...action,
      id,
      timestamp: Date.now(),
      retries: 0,
      maxRetries: action.maxRetries ?? 3,
    })
    this.save(queue)
    console.log(`[OfflineQueue] Queued: ${action.method} ${action.endpoint}`)
    return id
  }

  async getAll(): Promise<QueuedAction[]> {
    return this.load()
  }

  async remove(id: string): Promise<void> {
    const queue = this.load().filter((a) => a.id !== id)
    this.save(queue)
  }

  async count(): Promise<number> {
    return this.load().length
  }

  async clear(): Promise<void> {
    this.save([])
  }

  async process(networkAvailable: boolean): Promise<void> {
    if (!networkAvailable) return

    const queue = this.load()
    if (queue.length === 0) return

    console.log(`[OfflineQueue] Processing ${queue.length} queued action(s)…`)

    // Lazy-import to avoid circular deps at module load time
    const { default: SecretisAPI } = await import('../config/api')

    let syncedCount = 0

    for (const action of [...queue]) {
      try {
        await SecretisAPI.request({
          url: action.endpoint,
          method: action.method,
          data: action.body,
          headers: action.headers,
        })
        await this.remove(action.id)
        syncedCount++
        console.log(`[OfflineQueue] OK: ${action.method} ${action.endpoint}`)
      } catch (err: unknown) {
        const status = (err as { response?: { status?: number } })?.response?.status

        if (status === 409) {
          // Conflict handling
          const serverData: Record<string, unknown> =
            (err as { response?: { data?: Record<string, unknown> } })?.response
              ?.data ?? {}

          switch (action.conflictStrategy) {
            case 'client-wins': {
              // Force the update with special header
              try {
                await SecretisAPI.request({
                  url: action.endpoint,
                  method: 'PATCH',
                  data: action.body,
                  headers: {
                    ...action.headers,
                    'X-Force-Conflict': 'client',
                  },
                })
                await this.remove(action.id)
                syncedCount++
              } catch (forceErr) {
                console.warn(
                  `[OfflineQueue] Force-patch failed: ${action.endpoint}`,
                  forceErr,
                )
                await this._incrementRetries(action)
              }
              break
            }

            case 'server-wins': {
              // Discard local action
              await this.remove(action.id)
              console.log(
                `[OfflineQueue] Discarded (server-wins): ${action.endpoint}`,
              )
              break
            }

            case 'manual': {
              // Emit conflict event for UI handling
              const conflict: ConflictItem = {
                id: action.id,
                action,
                serverData,
                serverUpdatedAt:
                  (serverData.updated_at as string) ?? new Date().toISOString(),
              }
              this.emit('conflict', conflict)
              break
            }
          }
        } else if (status && status >= 500) {
          // Server error — increment retries or abandon
          if (action.retries >= action.maxRetries) {
            console.error(
              `[OfflineQueue] Abandoned after ${action.retries} retries: ${action.endpoint}`,
            )
            this.emit('error', action, err instanceof Error ? err : new Error(String(err)))
            await this.remove(action.id)
          } else {
            await this._incrementRetries(action)
            console.warn(
              `[OfflineQueue] Server error, retry ${action.retries + 1}/${action.maxRetries}: ${action.endpoint}`,
            )
          }
        } else {
          // Network error — stop processing this cycle
          console.warn(
            `[OfflineQueue] Network error, will retry later: ${action.endpoint}`,
          )
          break
        }
      }
    }

    if (syncedCount > 0) {
      this.emit('synced', syncedCount)
    }
  }

  // ── Private helpers ───────────────────────────────────────

  private async _incrementRetries(action: QueuedAction): Promise<void> {
    const queue = this.load()
    const idx = queue.findIndex((a) => a.id === action.id)
    if (idx >= 0) {
      queue[idx].retries += 1
      this.save(queue)
    }
  }
}

export const offlineQueue = new OfflineQueue()
