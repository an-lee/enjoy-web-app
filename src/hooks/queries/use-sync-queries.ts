/**
 * Sync Queries - React Query hooks for sync operations
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  getSyncManagerStatus,
  triggerSync,
  getPendingSyncQueueItems,
  getFailedSyncQueueItems,
  getLastSyncAt,
  getAllSyncStates,
  downloadAudios,
  downloadVideos,
  processSyncQueue,
  type SyncOptions,
  type SyncResult,
} from '@/db'

// ============================================================================
// Query Keys
// ============================================================================

export const syncQueryKeys = {
  all: ['sync'] as const,
  status: () => [...syncQueryKeys.all, 'status'] as const,
  queue: () => [...syncQueryKeys.all, 'queue'] as const,
  pending: () => [...syncQueryKeys.queue(), 'pending'] as const,
  failed: () => [...syncQueryKeys.queue(), 'failed'] as const,
  lastSync: () => [...syncQueryKeys.all, 'lastSync'] as const,
  states: () => [...syncQueryKeys.all, 'states'] as const,
}

// ============================================================================
// Query Hooks
// ============================================================================

/**
 * Get sync manager status
 */
export function useSyncStatus() {
  return useQuery({
    queryKey: syncQueryKeys.status(),
    queryFn: () => getSyncManagerStatus(),
    refetchInterval: 5000, // Refetch every 5 seconds
  })
}

/**
 * Get pending sync queue items (upload queue)
 */
export function usePendingSyncQueue() {
  return useQuery({
    queryKey: syncQueryKeys.pending(),
    queryFn: async () => {
      const items = await getPendingSyncQueueItems()
      // Filter for audio/video upload items only
      return items.filter(
        (item) => item.entityType === 'audio' || item.entityType === 'video'
      )
    },
    refetchInterval: 10000, // Refetch every 10 seconds
  })
}

/**
 * Get failed sync queue items
 */
export function useFailedSyncQueue() {
  return useQuery({
    queryKey: syncQueryKeys.failed(),
    queryFn: () => getFailedSyncQueueItems(),
    refetchInterval: 30000, // Refetch every 30 seconds
  })
}

/**
 * Get last sync timestamps for all entity types
 */
export function useLastSyncTimes() {
  return useQuery({
    queryKey: syncQueryKeys.lastSync(),
    queryFn: async () => {
      const [audioLastSync, videoLastSync] = await Promise.all([
        getLastSyncAt('audio'),
        getLastSyncAt('video'),
      ])
      return {
        audio: audioLastSync,
        video: videoLastSync,
      }
    },
    refetchInterval: 60000, // Refetch every minute
  })
}

/**
 * Get all sync states
 */
export function useSyncStates() {
  return useQuery({
    queryKey: syncQueryKeys.states(),
    queryFn: () => getAllSyncStates(),
  })
}

// ============================================================================
// Mutation Hooks
// ============================================================================

/**
 * Trigger manual full sync (download + upload)
 */
export function useTriggerSync() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (options?: { force?: boolean }) => {
      return triggerSync({ background: false, force: options?.force })
    },
    onSuccess: () => {
      // Invalidate all sync-related queries
      queryClient.invalidateQueries({ queryKey: syncQueryKeys.all })
    },
  })
}

/**
 * Trigger download sync (download from server)
 */
export function useDownloadSync() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (options?: { force?: boolean }) => {
      const syncOptions: SyncOptions = {
        background: false,
        force: options?.force,
      }

      const downloadResults = {
        audios: await downloadAudios(syncOptions),
        videos: await downloadVideos(syncOptions),
      }

      const totalSynced =
        downloadResults.audios.synced + downloadResults.videos.synced
      const totalFailed =
        downloadResults.audios.failed + downloadResults.videos.failed

      const allErrors = [
        ...(downloadResults.audios.errors || []),
        ...(downloadResults.videos.errors || []),
      ]

      return {
        success: totalFailed === 0,
        synced: totalSynced,
        failed: totalFailed,
        errors: allErrors.length > 0 ? allErrors : undefined,
      } as SyncResult
    },
    onSuccess: () => {
      // Invalidate all sync-related queries
      queryClient.invalidateQueries({ queryKey: syncQueryKeys.all })
    },
  })
}

/**
 * Trigger upload sync (upload pending changes)
 */
export function useUploadSync() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (options?: SyncOptions) => {
      return processSyncQueue({
        background: false,
        ...options,
      })
    },
    onSuccess: () => {
      // Invalidate all sync-related queries
      queryClient.invalidateQueries({ queryKey: syncQueryKeys.all })
    },
  })
}

