/**
 * Sync Stats Repository - Statistics for sync operations
 */

import { getPendingSyncQueueItems, getFailedSyncQueueItems } from './sync-queue-repository'
import { getAudiosBySyncStatus } from './audio-repository'
import { getVideosBySyncStatus } from './video-repository'

/**
 * Get upload statistics
 * Includes:
 * - Items in sync queue (pending)
 * - Local entities not yet in queue (syncStatus === 'local')
 */
export async function getUploadStats(): Promise<{
  pendingInQueue: number
  failedInQueue: number
  localNotInQueue: number
  total: number
}> {
  // Get items from sync queue
  const [pendingItems, failedItems] = await Promise.all([
    getPendingSyncQueueItems(),
    getFailedSyncQueueItems(),
  ])

  // Filter for audio/video only
  const pendingAudioVideo = pendingItems.filter(
    (item): item is typeof item & { entityType: 'audio' | 'video' } =>
      item.entityType === 'audio' || item.entityType === 'video'
  )

  const failedAudioVideo = failedItems.filter(
    (item): item is typeof item & { entityType: 'audio' | 'video' } =>
      item.entityType === 'audio' || item.entityType === 'video'
  )

  // Get local entities (not yet in queue)
  const [localAudios, localVideos] = await Promise.all([
    getAudiosBySyncStatus('local'),
    getVideosBySyncStatus('local'),
  ])

  // Get entity IDs that are already in queue
  const queuedEntityIds = new Set<string>()
  pendingAudioVideo.forEach((item) => queuedEntityIds.add(item.entityId))
  failedAudioVideo.forEach((item) => queuedEntityIds.add(item.entityId))

  // Count local entities that are NOT in queue
  const localNotInQueue =
    localAudios.filter((audio) => !queuedEntityIds.has(audio.id)).length +
    localVideos.filter((video) => !queuedEntityIds.has(video.id)).length

  return {
    pendingInQueue: pendingAudioVideo.length,
    failedInQueue: failedAudioVideo.length,
    localNotInQueue,
    total: pendingAudioVideo.length + failedAudioVideo.length + localNotInQueue,
  }
}

