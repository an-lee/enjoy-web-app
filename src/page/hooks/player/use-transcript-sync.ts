/**
 * useTranscriptSync Hook
 *
 * Tracks transcript synchronization status for a specific target (audio/video).
 * Automatically syncs transcripts when target is loaded and monitors sync progress.
 */
import { useState, useEffect, useCallback } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { syncTranscriptsForTarget } from '@/page/db/services/sync-manager'
import { transcriptQueryKeys } from '@/page/hooks/queries/use-transcript-queries'
import { createLogger } from '@/shared/lib/utils'
import type { TargetType } from '@/page/types/db'
import type { SyncResult } from '@/page/db/services/sync-service'

const log = createLogger({ name: 'useTranscriptSync' })

export interface TranscriptSyncState {
  isSyncing: boolean
  hasSynced: boolean
  error: string | null
  lastSyncResult: SyncResult | null
}

// Module-level tracking to prevent duplicate syncs across all hook instances
const syncingTargets = new Set<string>()

export function useTranscriptSync(
  targetType: TargetType | null,
  targetId: string | null
) {
  const [state, setState] = useState<TranscriptSyncState>({
    isSyncing: false,
    hasSynced: false,
    error: null,
    lastSyncResult: null,
  })
  const queryClient = useQueryClient()

  // Auto-sync when target changes (only once per target)
  useEffect(() => {
    if (!targetType || !targetId) {
      setState({
        isSyncing: false,
        hasSynced: false,
        error: null,
        lastSyncResult: null,
      })
      return
    }

    const targetKey = `${targetType}:${targetId}`

    // Skip if already syncing (module-level check)
    if (syncingTargets.has(targetKey)) {
      return
    }

    // Mark as syncing immediately
    syncingTargets.add(targetKey)
    setState({
      isSyncing: true,
      hasSynced: false,
      error: null,
      lastSyncResult: null,
    })

    log.debug(`Starting sync for ${targetKey}`)

    // Perform sync
    syncTranscriptsForTarget(targetType, targetId, {
      background: false,
    })
      .then((result) => {
        log.debug(`Sync completed for ${targetKey}`, {
          success: result.success,
          synced: result.synced,
          failed: result.failed,
        })

        syncingTargets.delete(targetKey)
        setState({
          isSyncing: false,
          hasSynced: true,
          error: result.success ? null : result.errors?.[0] || 'Sync failed',
          lastSyncResult: result,
        })

        // Invalidate and refetch transcripts if sync was successful
        if (result.success) {
          queryClient.invalidateQueries({
            queryKey: transcriptQueryKeys.byTarget(targetType, targetId),
          })
        }
      })
      .catch((error) => {
        log.error(`Sync failed for ${targetKey}:`, error)
        syncingTargets.delete(targetKey)
        const errorMessage =
          error instanceof Error ? error.message : 'Failed to sync transcripts'
        setState({
          isSyncing: false,
          hasSynced: true,
          error: errorMessage,
          lastSyncResult: null,
        })
      })
  }, [targetType, targetId])

  // Manual sync function (for retry or manual trigger)
  const syncTranscripts = useCallback(async () => {
    if (!targetType || !targetId) {
      return
    }

    const targetKey = `${targetType}:${targetId}`

    // Remove from syncing set to allow retry
    syncingTargets.delete(targetKey)

    setState({
      isSyncing: true,
      hasSynced: false,
      error: null,
      lastSyncResult: null,
    })

    syncingTargets.add(targetKey)

    try {
      const result = await syncTranscriptsForTarget(targetType, targetId, {
        background: false,
      })

      syncingTargets.delete(targetKey)
      setState({
        isSyncing: false,
        hasSynced: true,
        error: result.success ? null : result.errors?.[0] || 'Sync failed',
        lastSyncResult: result,
      })

      // Invalidate and refetch transcripts if sync was successful
      if (result.success) {
        queryClient.invalidateQueries({
          queryKey: transcriptQueryKeys.byTarget(targetType, targetId),
        })
      }
    } catch (error) {
      syncingTargets.delete(targetKey)
      const errorMessage =
        error instanceof Error ? error.message : 'Failed to sync transcripts'
      setState({
        isSyncing: false,
        hasSynced: true,
        error: errorMessage,
        lastSyncResult: null,
      })
    }
  }, [targetType, targetId])

  return {
    ...state,
    syncTranscripts,
  }
}
