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
  const abortControllerRef = useRef<AbortController | null>(null)

  // Shared sync logic
  const performSync = useCallback(
    async (targetType: TargetType, targetId: string, targetKey: string) => {
      // Create abort controller for cancellation
      const abortController = new AbortController()
      abortControllerRef.current = abortController

      try {
        const result = await syncTranscriptsForTarget(targetType, targetId, {
          background: false,
        })

        // Check if operation was aborted
        if (abortController.signal.aborted) {
          return
        }

        isSyncingRef.current = false
        syncAttemptedRef.current = targetKey

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
        // Ignore abort errors
        if (abortController.signal.aborted) {
          return
        }

        isSyncingRef.current = false
        const errorMessage =
          error instanceof Error ? error.message : 'Failed to sync transcripts'
        setState({
          isSyncing: false,
          hasSynced: true,
          error: errorMessage,
          lastSyncResult: null,
        })
      } finally {
        if (abortControllerRef.current === abortController) {
          abortControllerRef.current = null
        }
      }
    },
    [queryClient]
  )

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
      performSync(targetType, targetId, targetKey)
    }, 100)

    return () => {
      clearTimeout(timer)
      // Abort ongoing sync if target changed
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
        abortControllerRef.current = null
      }
      // Only reset if target actually changed (not just component unmount)
      if (syncAttemptedRef.current !== targetKey) {
        isSyncingRef.current = false
      }
    }
  }, [targetType, targetId, performSync])

  // Manual sync function (for retry or manual trigger)
  const syncTranscripts = useCallback(async () => {
    if (!targetType || !targetId) {
      return
    }

    // Prevent multiple simultaneous syncs
    if (isSyncingRef.current) {
      return
    }

    const targetKey = `${targetType}:${targetId}`

    // Reset attempt flag to allow retry
    if (syncAttemptedRef.current === targetKey) {
      syncAttemptedRef.current = null
    }

    // Update state and perform sync
    isSyncingRef.current = true
    setState({
      isSyncing: true,
      hasSynced: false,
      error: null,
      lastSyncResult: null,
    })

    await performSync(targetType, targetId, targetKey)
  }, [targetType, targetId, performSync])

  return {
    ...state,
    syncTranscripts,
  }
}

