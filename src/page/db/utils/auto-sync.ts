/**
 * Auto-sync utilities - Automatically queue entities for sync when modified
 *
 * This module provides helper functions to automatically trigger sync
 * when entities are created, updated, or deleted locally.
 */

import { queueForSync } from '../services/sync-manager'
import type { SyncStatus } from '@/page/types/db'

/**
 * Check if entity should be queued for sync
 * Only queue if:
 * 1. Entity is not already synced (syncStatus !== 'synced')
 * 2. Or if it's a new local entity (syncStatus === undefined or 'local')
 */
function shouldQueueForSync(syncStatus?: SyncStatus): boolean {
  // If already synced, don't queue unless explicitly needed
  // (e.g., for updates that need to be pushed to server)
  return syncStatus !== 'synced'
}

/**
 * Queue audio for sync after mutation
 */
export async function queueAudioSync(
  audioId: string,
  action: 'create' | 'update' | 'delete',
  currentSyncStatus?: SyncStatus
): Promise<void> {
  // Only queue if not already synced (or if it's a delete action)
  if (action === 'delete' || shouldQueueForSync(currentSyncStatus)) {
    await queueForSync('audio', audioId, action)
  }
}

/**
 * Queue video for sync after mutation
 */
export async function queueVideoSync(
  videoId: string,
  action: 'create' | 'update' | 'delete',
  currentSyncStatus?: SyncStatus
): Promise<void> {
  // Only queue if not already synced (or if it's a delete action)
  if (action === 'delete' || shouldQueueForSync(currentSyncStatus)) {
    await queueForSync('video', videoId, action)
  }
}

