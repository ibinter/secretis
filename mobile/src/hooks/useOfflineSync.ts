import { useState, useEffect, useCallback, useRef } from 'react'
import NetInfo from '@react-native-community/netinfo'
import { offlineQueue, ConflictItem } from '../services/offlineQueue'

// ============================================================
// Types
// ============================================================

export interface UseOfflineSyncReturn {
  isOnline: boolean
  pendingCount: number
  isSyncing: boolean
  lastSync: Date | null
  conflicts: ConflictItem[]
  sync: () => Promise<void>
  resolveConflict: (
    conflictId: string,
    resolution: 'keep-local' | 'keep-server',
  ) => Promise<void>
}

// ============================================================
// Hook
// ============================================================

export function useOfflineSync(): UseOfflineSyncReturn {
  const [isOnline, setIsOnline] = useState(true)
  const [pendingCount, setPendingCount] = useState(0)
  const [isSyncing, setIsSyncing] = useState(false)
  const [lastSync, setLastSync] = useState<Date | null>(null)
  const [conflicts, setConflicts] = useState<ConflictItem[]>([])

  // Track whether component is mounted to avoid state updates after unmount
  const mounted = useRef(true)

  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
    }
  }, [])

  // Refresh pending count
  const refreshCount = useCallback(async () => {
    const count = await offlineQueue.count()
    if (mounted.current) setPendingCount(count)
  }, [])

  // Listen to conflict events from the queue
  useEffect(() => {
    const handleConflict = (conflict: ConflictItem) => {
      if (mounted.current) {
        setConflicts((prev) => [...prev, conflict])
      }
    }

    offlineQueue.on('conflict', handleConflict)
    return () => {
      offlineQueue.off('conflict', handleConflict)
    }
  }, [])

  // Initial count
  useEffect(() => {
    refreshCount()
  }, [refreshCount])

  const sync = useCallback(async () => {
    if (isSyncing) return
    if (mounted.current) setIsSyncing(true)
    try {
      await offlineQueue.process(true)
      if (mounted.current) {
        setPendingCount(await offlineQueue.count())
        setLastSync(new Date())
      }
    } finally {
      if (mounted.current) setIsSyncing(false)
    }
  }, [isSyncing])

  // Network listener
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(async (state) => {
      const online = !!(state.isConnected && state.isInternetReachable !== false)
      if (mounted.current) setIsOnline(online)

      if (online) {
        await sync()
      }
    })

    return unsubscribe
  }, [sync])

  const resolveConflict = useCallback(
    async (conflictId: string, resolution: 'keep-local' | 'keep-server') => {
      const conflict = conflicts.find((c) => c.id === conflictId)
      if (!conflict) return

      if (resolution === 'keep-local') {
        // Re-submit with client-wins strategy
        const { action } = conflict
        await offlineQueue.enqueue({
          endpoint: action.endpoint,
          method: action.method,
          body: action.body,
          headers: action.headers,
          maxRetries: action.maxRetries,
          conflictStrategy: 'client-wins',
          resourceType: action.resourceType,
          resourceId: action.resourceId,
        })
        // Remove original conflict action
        await offlineQueue.remove(conflictId)
        await sync()
      } else {
        // keep-server: just discard the local action
        await offlineQueue.remove(conflictId)
        await refreshCount()
      }

      if (mounted.current) {
        setConflicts((prev) => prev.filter((c) => c.id !== conflictId))
      }
    },
    [conflicts, sync, refreshCount],
  )

  return {
    isOnline,
    pendingCount,
    isSyncing,
    lastSync,
    conflicts,
    sync,
    resolveConflict,
  }
}
