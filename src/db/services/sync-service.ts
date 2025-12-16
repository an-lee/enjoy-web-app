/**
 * Sync Service - Handles synchronization between local IndexedDB and remote server
 *
 * Offline-First Design Principles:
 * 1. All reads are from local IndexedDB (always available)
 * 2. Writes go to local IndexedDB first, then queued for sync
 * 3. Sync happens in background, doesn't block UI
 * 4. Conflict resolution: Last-write-wins based on serverUpdatedAt
 * 5. Retry mechanism with exponential backoff
 */

import { createLogger } from '@/lib/utils'
import { audioApi } from '@/api/audio'
import { videoApi } from '@/api/video'
import {
  getAudioById,
  saveAudio,
  updateAudio,
} from '../repositories/audio-repository'
import {
  getVideoById,
  saveVideo,
  updateVideo,
} from '../repositories/video-repository'
import {
  addSyncQueueItem,
  getPendingSyncQueueItems,
  updateSyncQueueItem,
  removeSyncQueueItem,
} from '../repositories/sync-queue-repository'
import {
  getLastSyncAt,
  updateLastSyncAt,
} from '../repositories/sync-state-repository'
import { queueLocalEntitiesForSync } from '../repositories/sync-stats-repository'
import { processBatch } from '../utils/async-batch'
import type { Audio, Video, SyncStatus } from '@/types/db'

// ============================================================================
// Logger
// ============================================================================

const log = createLogger({ name: 'sync-service' })

// ============================================================================
// Types
// ============================================================================

export interface SyncOptions {
  /**
   * Whether to sync in background (non-blocking)
   * @default true
   */
  background?: boolean
  /**
   * Whether to force sync even if already synced
   * @default false
   */
  force?: boolean
  /**
   * Whether to use Web Worker for network requests
   * @default false (uses main thread with requestIdleCallback)
   */
  useWorker?: boolean
}

export interface SyncResult {
  success: boolean
  synced: number
  failed: number
  errors?: string[]
}

// ============================================================================
// Constants
// ============================================================================

const MAX_RETRY_COUNT = 5
const RETRY_DELAY_BASE = 1000 // 1 second
const SYNC_BATCH_SIZE = 10
const DOWNLOAD_PAGE_SIZE = 50 // Items per page for download

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Calculate retry delay with exponential backoff
 */
function getRetryDelay(retryCount: number): number {
  return RETRY_DELAY_BASE * Math.pow(2, retryCount)
}

/**
 * Check if item should be retried
 */
function shouldRetry(retryCount: number, lastAttempt?: string): boolean {
  if (retryCount >= MAX_RETRY_COUNT) {
    return false
  }

  if (!lastAttempt) {
    return true
  }

  const delay = getRetryDelay(retryCount)
  const lastAttemptTime = new Date(lastAttempt).getTime()
  const now = Date.now()
  return now - lastAttemptTime >= delay
}

/**
 * Prepare audio/video for sync (remove local-only fields)
 */
function prepareForSync(entity: Audio | Video): Omit<Audio | Video, 'fileHandle' | 'blob'> {
  if ('blob' in entity) {
    const { fileHandle, blob, ...rest } = entity as Audio
    return rest
  }
  const { fileHandle, ...rest } = entity as Video
  return rest
}

/**
 * Resolve conflict between local and server version
 * Strategy: Last-write-wins based on serverUpdatedAt
 */
function resolveConflict<T extends Audio | Video>(
  local: T,
  server: T
): T {
  const localTime = local.serverUpdatedAt ? new Date(local.serverUpdatedAt).getTime() : 0
  const serverTime = server.serverUpdatedAt ? new Date(server.serverUpdatedAt).getTime() : 0

  // Server version wins if it's newer or equal
  if (serverTime >= localTime) {
    const result = { ...server } as T
    if ('fileHandle' in local) {
      (result as any).fileHandle = local.fileHandle
    }
    if ('blob' in local) {
      (result as any).blob = (local as Audio).blob
    }
    return result
  }

  // Local version wins, but update serverUpdatedAt to reflect local change
  return {
    ...local,
    serverUpdatedAt: local.updatedAt,
  } as T
}

// ============================================================================
// Upload Sync (Local → Remote)
// ============================================================================

/**
 * Queue an entity for upload sync
 */
export async function queueUploadSync(
  entityType: 'audio' | 'video',
  entityId: string,
  action: 'create' | 'update' | 'delete'
): Promise<void> {
  log.debug(`Queueing ${action} sync for ${entityType}:${entityId}`)

  // Get entity to include in payload
  let payload: unknown
  if (action !== 'delete') {
    if (entityType === 'audio') {
      const entity = await getAudioById(entityId)
      if (entity) {
        payload = prepareForSync(entity)
      }
    } else {
      const entity = await getVideoById(entityId)
      if (entity) {
        payload = prepareForSync(entity)
      }
    }
  }

  await addSyncQueueItem(entityType, entityId, action, payload)

  // Mark entity as pending sync
  const syncStatus: SyncStatus = 'pending'
  if (entityType === 'audio') {
    await updateAudio(entityId, { syncStatus })
  } else {
    await updateVideo(entityId, { syncStatus })
  }
}

/**
 * Upload a single audio to server
 */
async function uploadAudio(audio: Audio): Promise<void> {
  const payload = prepareForSync(audio) as Audio

  // API expects { audio: Audio } format
  await audioApi.uploadAudio(payload)

  // Update local entity with server timestamp
  await updateAudio(audio.id, {
    syncStatus: 'synced',
    serverUpdatedAt: new Date().toISOString(),
  })
}

/**
 * Upload a single video to server
 */
async function uploadVideo(video: Video): Promise<void> {
  const payload = prepareForSync(video) as Video

  // API expects { video: Video } format
  await videoApi.uploadVideo(payload)

  // Update local entity with server timestamp
  await updateVideo(video.id, {
    syncStatus: 'synced',
    serverUpdatedAt: new Date().toISOString(),
  })
}

/**
 * Delete entity from server
 */
async function deleteEntityFromServer(
  entityType: 'audio' | 'video',
  entityId: string
): Promise<void> {
  if (entityType === 'audio') {
    await audioApi.deleteAudio(entityId)
  } else {
    await videoApi.deleteVideo(entityId)
  }
}

/**
 * Process a single sync queue item
 */
async function processSyncQueueItem(item: {
  id: number
  entityType: 'audio' | 'video'
  entityId: string
  action: 'create' | 'update' | 'delete'
  payload?: unknown
  retryCount: number
  lastAttempt?: string
}): Promise<boolean> {
  const { id, entityType, entityId, action, payload, retryCount, lastAttempt } = item

  // Check if should retry
  if (!shouldRetry(retryCount, lastAttempt)) {
    log.warn(`Skipping sync queue item ${id}: max retries reached`)
    return false
  }

  try {
    log.debug(`Processing sync: ${entityType}:${entityId} (${action})`)

    if (action === 'delete') {
      await deleteEntityFromServer(entityType, entityId)
    } else {
      if (entityType === 'audio') {
        const audio = payload as Audio
        await uploadAudio(audio)
      } else {
        const video = payload as Video
        await uploadVideo(video)
      }
    }

    // Success: remove from queue
    await removeSyncQueueItem(id)
    log.debug(`Successfully synced ${entityType}:${entityId}`)
    return true
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    log.error(`Failed to sync ${entityType}:${entityId}:`, errorMessage)

    // Update retry info
    await updateSyncQueueItem(id, {
      retryCount: retryCount + 1,
      lastAttempt: new Date().toISOString(),
      error: errorMessage,
    })

    return false
  }
}

/**
 * Process pending sync queue items
 * If not in background mode, will also queue local entities that are not yet in queue
 */
export async function processSyncQueue(options: SyncOptions = {}): Promise<SyncResult> {
  const { background = true } = options

  // If not in background mode, queue local entities first
  if (!background) {
    log.debug('Queueing local entities not yet in sync queue...')
    const queueResult = await queueLocalEntitiesForSync()
    if (queueResult.queued > 0) {
      log.info(`Queued ${queueResult.queued} local entities for sync`)
    }
    if (queueResult.skipped > 0) {
      log.warn(`Skipped ${queueResult.skipped} entities (already in queue or failed)`)
    }
  }

  if (background) {
    // Process in background (non-blocking)
    processSyncQueueBackground().catch((error) => {
      log.error('Background sync failed:', error)
    })
    return { success: true, synced: 0, failed: 0 }
  }

  // Process synchronously
  return processSyncQueueSync()
}

async function processSyncQueueSync(): Promise<SyncResult> {
  const pending = await getPendingSyncQueueItems()
  const audioVideoItems = pending.filter(
    (item): item is typeof item & { entityType: 'audio' | 'video' } =>
      item.entityType === 'audio' || item.entityType === 'video'
  )

  const results: SyncResult = {
    success: true,
    synced: 0,
    failed: 0,
    errors: [],
  }

  // Process in batches
  for (let i = 0; i < audioVideoItems.length; i += SYNC_BATCH_SIZE) {
    const batch = audioVideoItems.slice(i, i + SYNC_BATCH_SIZE)
    const promises = batch.map((item) => processSyncQueueItem(item))
    const batchResults = await Promise.allSettled(promises)

    batchResults.forEach((result) => {
      if (result.status === 'fulfilled' && result.value) {
        results.synced++
      } else {
        results.failed++
        if (result.status === 'rejected') {
          results.errors?.push(result.reason?.message || String(result.reason))
        }
      }
    })
  }

  results.success = results.failed === 0
  return results
}

async function processSyncQueueBackground(): Promise<void> {
  await processSyncQueueSync()
}

// ============================================================================
// Download Sync (Remote → Local)
// ============================================================================

/**
 * Download audios from server and merge with local (with pagination and incremental sync)
 */
export async function downloadAudios(options: SyncOptions = {}): Promise<SyncResult> {
  try {
    log.debug('Downloading audios from server...')

    // Get last sync timestamp for incremental sync
    const lastSyncAt = await getLastSyncAt('audio')
    const updatedAfter = options.force ? undefined : lastSyncAt || undefined

    const results: SyncResult = {
      success: true,
      synced: 0,
      failed: 0,
      errors: [],
    }

    let currentUpdatedAfter = updatedAfter
    let hasMore = true
    const syncStartTime = new Date().toISOString()

    // Download with cursor-based pagination (using updated_after)
    while (hasMore) {
      const response = await audioApi.audios({
        limit: DOWNLOAD_PAGE_SIZE,
        updatedAfter: currentUpdatedAfter,
      })
      const serverAudios = response.data || []

      if (serverAudios.length === 0) {
        hasMore = false
        break
      }

      // Process batch with async batching to avoid blocking
      const batchResult = await processBatch(
        serverAudios,
        async (serverAudio) => {
          try {
            const localAudio = await getAudioById(serverAudio.id)

            if (!localAudio) {
              // New audio from server: save locally
              // Note: saveAudio expects UserAudioInput, but server audio may not have fileHandle
              // We'll save it as metadata-only for now
              await saveAudio({
                ...serverAudio,
                provider: (serverAudio.provider === 'user' ? 'user' : 'user') as 'user',
                aid: serverAudio.aid,
                syncStatus: 'synced',
                serverUpdatedAt: serverAudio.updatedAt,
              })
              return { success: true }
            } else {
              // Existing audio: resolve conflict
              const resolved = resolveConflict(localAudio, serverAudio)
              await updateAudio(serverAudio.id, {
                ...resolved,
                syncStatus: 'synced',
                serverUpdatedAt: serverAudio.updatedAt,
              })
              return { success: true }
            }
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error)
            log.error(`Failed to sync audio ${serverAudio.id}:`, error)
            throw new Error(`Failed to sync audio ${serverAudio.id}: ${errorMessage}`)
          }
        },
        {
          batchSize: SYNC_BATCH_SIZE,
          useIdleCallback: !options.useWorker, // Use idle callback if not using worker
        }
      )

      results.synced += batchResult.processed - batchResult.errors.length
      results.failed += batchResult.errors.length
      if (batchResult.errors.length > 0) {
        results.errors?.push(...batchResult.errors.map((e) => e.message))
      }

      // Check if there are more records: if we got a full page, there might be more
      if (serverAudios.length < DOWNLOAD_PAGE_SIZE) {
        hasMore = false
      } else {
        // Use the latest updated_at as the new cursor
        // Find the latest updated_at from the current batch
        const latestUpdatedAt = serverAudios.reduce((latest, audio) => {
          const audioTime = new Date(audio.updatedAt).getTime()
          const latestTime = new Date(latest).getTime()
          return audioTime > latestTime ? audio.updatedAt : latest
        }, serverAudios[0].updatedAt)

        // Update cursor for next iteration
        currentUpdatedAfter = latestUpdatedAt
      }
    }

    // Update last sync timestamp
    if (results.synced > 0 || !lastSyncAt) {
      await updateLastSyncAt('audio', syncStartTime)
    }

    results.success = results.failed === 0
    log.debug(`Downloaded ${results.synced} audios, ${results.failed} failed`)
    return results
  } catch (error) {
    log.error('Failed to download audios:', error)
    return {
      success: false,
      synced: 0,
      failed: 0,
      errors: [error instanceof Error ? error.message : String(error)],
    }
  }
}

/**
 * Download videos from server and merge with local (with pagination and incremental sync)
 */
export async function downloadVideos(options: SyncOptions = {}): Promise<SyncResult> {
  try {
    log.debug('Downloading videos from server...')

    // Get last sync timestamp for incremental sync
    const lastSyncAt = await getLastSyncAt('video')
    const updatedAfter = options.force ? undefined : lastSyncAt || undefined

    const results: SyncResult = {
      success: true,
      synced: 0,
      failed: 0,
      errors: [],
    }

    let currentUpdatedAfter = updatedAfter
    let hasMore = true
    const syncStartTime = new Date().toISOString()

    // Download with cursor-based pagination (using updated_after)
    while (hasMore) {
      const response = await videoApi.videos({
        limit: DOWNLOAD_PAGE_SIZE,
        updatedAfter: currentUpdatedAfter,
      })
      const serverVideos = response.data || []

      if (serverVideos.length === 0) {
        hasMore = false
        break
      }

      // Process batch with async batching to avoid blocking
      const batchResult = await processBatch(
        serverVideos,
        async (serverVideo) => {
          try {
            const localVideo = await getVideoById(serverVideo.id)

            if (!localVideo) {
              // New video from server: save locally
              await saveVideo({
                ...serverVideo,
                syncStatus: 'synced',
                serverUpdatedAt: serverVideo.updatedAt,
              } as Video)
              return { success: true }
            } else {
              // Existing video: resolve conflict
              const resolved = resolveConflict(localVideo, serverVideo)
              await updateVideo(serverVideo.id, {
                ...resolved,
                syncStatus: 'synced',
                serverUpdatedAt: serverVideo.updatedAt,
              })
              return { success: true }
            }
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error)
            log.error(`Failed to sync video ${serverVideo.id}:`, error)
            throw new Error(`Failed to sync video ${serverVideo.id}: ${errorMessage}`)
          }
        },
        {
          batchSize: SYNC_BATCH_SIZE,
          useIdleCallback: !options.useWorker, // Use idle callback if not using worker
        }
      )

      results.synced += batchResult.processed - batchResult.errors.length
      results.failed += batchResult.errors.length
      if (batchResult.errors.length > 0) {
        results.errors?.push(...batchResult.errors.map((e) => e.message))
      }

      // Check if there are more records: if we got a full page, there might be more
      if (serverVideos.length < DOWNLOAD_PAGE_SIZE) {
        hasMore = false
      } else {
        // Use the latest updated_at as the new cursor
        // Find the latest updated_at from the current batch
        const latestUpdatedAt = serverVideos.reduce((latest, video) => {
          const videoTime = new Date(video.updatedAt).getTime()
          const latestTime = new Date(latest).getTime()
          return videoTime > latestTime ? video.updatedAt : latest
        }, serverVideos[0].updatedAt)

        // Update cursor for next iteration
        currentUpdatedAfter = latestUpdatedAt
      }
    }

    // Update last sync timestamp
    if (results.synced > 0 || !lastSyncAt) {
      await updateLastSyncAt('video', syncStartTime)
    }

    results.success = results.failed === 0
    log.debug(`Downloaded ${results.synced} videos, ${results.failed} failed`)
    return results
  } catch (error) {
    log.error('Failed to download videos:', error)
    return {
      success: false,
      synced: 0,
      failed: 0,
      errors: [error instanceof Error ? error.message : String(error)],
    }
  }
}

/**
 * Full sync: download from server, then upload pending changes
 */
export async function fullSync(options: SyncOptions = {}): Promise<SyncResult> {
  log.info('Starting full sync...')

  const downloadResults = {
    audios: await downloadAudios(options),
    videos: await downloadVideos(options),
  }

  const uploadResults = await processSyncQueue(options)

  const totalSynced =
    downloadResults.audios.synced +
    downloadResults.videos.synced +
    uploadResults.synced
  const totalFailed =
    downloadResults.audios.failed +
    downloadResults.videos.failed +
    uploadResults.failed

  const allErrors = [
    ...(downloadResults.audios.errors || []),
    ...(downloadResults.videos.errors || []),
    ...(uploadResults.errors || []),
  ]

  const result: SyncResult = {
    success: totalFailed === 0,
    synced: totalSynced,
    failed: totalFailed,
    errors: allErrors.length > 0 ? allErrors : undefined,
  }

  log.info(`Full sync completed: ${totalSynced} synced, ${totalFailed} failed`)
  return result
}

