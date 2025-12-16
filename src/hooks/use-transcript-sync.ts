/**
 * useTranscriptSync Hook
 *
 * Tracks transcript synchronization status for a specific target (audio/video).
 * Automatically syncs transcripts when target is loaded and monitors sync progress.
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { syncTranscriptsForTarget } from '@/db/services/sync-manager'
import { transcriptQueryKeys } from '@/hooks/queries/use-transcript-queries'
import type { TargetType } from '@/types/db'
import type { SyncResult } from '@/db/services/sync-service'

export interface TranscriptSyncState {
  isSyncing: boolean
  hasSynced: boolean
  error: string | null
  lastSyncResult: SyncResult | null
}

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
  const syncAttemptedRef = useRef<string | null>(null)
  const isSyncingRef = useRef(false)
  const queryClientRef = useRef(queryClient)

  // Keep queryClient ref up to date
  useEffect(() => {
    queryClientRef.current = queryClient
  }, [queryClient])

  const syncTranscripts = useCallback(async () => {
    if (!targetType || !targetId) {
      return
    }

    // Prevent multiple simultaneous syncs using ref instead of state
    if (isSyncingRef.current) {
      return
    }

    isSyncingRef.current = true
    setState((prev) => ({
      ...prev,
      isSyncing: true,
      error: null,
    }))

    try {
      const result = await syncTranscriptsForTarget(targetType, targetId, {
        background: false,
      })

      isSyncingRef.current = false
      setState({
        isSyncing: false,
        hasSynced: true,
        error: result.success ? null : result.errors?.[0] || 'Sync failed',
        lastSyncResult: result,
      })

      // Invalidate and refetch transcripts if sync was successful
      if (result.success && result.synced > 0) {
        queryClient.invalidateQueries({
          queryKey: transcriptQueryKeys.byTarget(targetType, targetId),
        })
      }
    } catch (error) {
      isSyncingRef.current = false
      const errorMessage =
        error instanceof Error ? error.message : 'Failed to sync transcripts'
      setState({
        isSyncing: false,
        hasSynced: true,
        error: errorMessage,
        lastSyncResult: null,
      })
    }
  }, [targetType, targetId, queryClient])

  // Auto-sync when target changes (only once per target)
  useEffect(() => {
    if (!targetType || !targetId) {
      // Reset when target is cleared
      syncAttemptedRef.current = null
      isSyncingRef.current = false
      setState({
        isSyncing: false,
        hasSynced: false,
        error: null,
        lastSyncResult: null,
      })
      return
    }

    // Create a unique key for this target
    const targetKey = `${targetType}:${targetId}`

    // Only sync if we haven't synced this target yet
    if (syncAttemptedRef.current === targetKey || isSyncingRef.current) {
      return
    }

    // Mark as attempted immediately to prevent duplicate calls
    syncAttemptedRef.current = targetKey
    isSyncingRef.current = true

    setState({
      isSyncing: true,
      hasSynced: false,
      error: null,
      lastSyncResult: null,
    })

    // Use a small delay to avoid race condition with player store sync
    const timer = setTimeout(() => {
      syncTranscriptsForTarget(targetType, targetId, {
        background: false,
      })
        .then((result) => {
          isSyncingRef.current = false
          setState({
            isSyncing: false,
            hasSynced: true,
            error: result.success ? null : result.errors?.[0] || 'Sync failed',
            lastSyncResult: result,
          })

          // Invalidate and refetch transcripts if sync was successful
          if (result.success && result.synced > 0) {
            queryClientRef.current.invalidateQueries({
              queryKey: transcriptQueryKeys.byTarget(targetType, targetId),
            })
          }
        })
        .catch((error) => {
          isSyncingRef.current = false
          const errorMessage =
            error instanceof Error ? error.message : 'Failed to sync transcripts'
          setState({
            isSyncing: false,
            hasSynced: true,
            error: errorMessage,
            lastSyncResult: null,
          })
        })
    }, 100)

    return () => {
      clearTimeout(timer)
      // Only reset if target actually changed (not just component unmount)
      if (syncAttemptedRef.current !== targetKey) {
        isSyncingRef.current = false
      }
    }
  }, [targetType, targetId])

  return {
    ...state,
    syncTranscripts,
  }
}

