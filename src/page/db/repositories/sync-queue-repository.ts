/**
 * Sync Queue Repository - Database operations for SyncQueueItem
 */

import { db } from '../schema'
import type { SyncQueueItem } from '@/page/types/db'

// ============================================================================
// Query Operations
// ============================================================================

export async function getSyncQueueItemById(id: number): Promise<SyncQueueItem | undefined> {
  return db.syncQueue.get(id)
}

export async function getSyncQueueItemsByEntityType(
  entityType: SyncQueueItem['entityType']
): Promise<SyncQueueItem[]> {
  return db.syncQueue.where('entityType').equals(entityType).toArray()
}

export async function getSyncQueueItemsByEntityId(
  entityId: string
): Promise<SyncQueueItem[]> {
  return db.syncQueue.where('entityId').equals(entityId).toArray()
}

export async function getPendingSyncQueueItems(): Promise<SyncQueueItem[]> {
  return db.syncQueue
    .orderBy('createdAt')
    .filter((item) => !item.error || item.retryCount < 5)
    .toArray()
}

export async function getFailedSyncQueueItems(): Promise<SyncQueueItem[]> {
  return db.syncQueue
    .where('retryCount')
    .aboveOrEqual(5)
    .toArray()
}

export async function getAllSyncQueueItems(): Promise<SyncQueueItem[]> {
  return db.syncQueue.orderBy('createdAt').toArray()
}

// ============================================================================
// Mutation Operations
// ============================================================================

/**
 * Add an item to the sync queue
 */
export async function addSyncQueueItem(
  entityType: SyncQueueItem['entityType'],
  entityId: string,
  action: SyncQueueItem['action'],
  payload?: unknown
): Promise<number> {
  const now = new Date().toISOString()

  // Check if there's already a pending item for this entity and action
  const existing = await db.syncQueue
    .where('[entityType+entityId+action]')
    .equals([entityType, entityId, action])
    .first()

  if (existing) {
    // Update existing item instead of creating duplicate
    await db.syncQueue.update(existing.id, {
      payload,
      retryCount: 0, // Reset retry count
      error: undefined,
      lastAttempt: undefined,
      createdAt: existing.createdAt, // Preserve original creation time
    })
    return existing.id
  }

  const item: Omit<SyncQueueItem, 'id'> = {
    entityType,
    entityId,
    action,
    payload,
    retryCount: 0,
    createdAt: now,
  }

  const id = await db.syncQueue.add(item as SyncQueueItem)
  return id as number
}

/**
 * Update sync queue item (e.g., after sync attempt)
 */
export async function updateSyncQueueItem(
  id: number,
  updates: Partial<Pick<SyncQueueItem, 'retryCount' | 'lastAttempt' | 'error' | 'payload'>>
): Promise<void> {
  await db.syncQueue.update(id, updates)
}

/**
 * Remove an item from the sync queue (after successful sync)
 */
export async function removeSyncQueueItem(id: number): Promise<void> {
  await db.syncQueue.delete(id)
}

/**
 * Remove all sync queue items for a specific entity
 */
export async function removeSyncQueueItemsByEntityId(entityId: string): Promise<void> {
  await db.syncQueue.where('entityId').equals(entityId).delete()
}

/**
 * Clear all sync queue items
 */
export async function clearSyncQueue(): Promise<void> {
  await db.syncQueue.clear()
}

// ============================================================================
// Repository Object (Alternative API)
// ============================================================================

export const syncQueueRepository = {
  // Queries
  getById: getSyncQueueItemById,
  getByEntityType: getSyncQueueItemsByEntityType,
  getByEntityId: getSyncQueueItemsByEntityId,
  getPending: getPendingSyncQueueItems,
  getFailed: getFailedSyncQueueItems,
  getAll: getAllSyncQueueItems,
  // Mutations
  add: addSyncQueueItem,
  update: updateSyncQueueItem,
  remove: removeSyncQueueItem,
  removeByEntityId: removeSyncQueueItemsByEntityId,
  clear: clearSyncQueue,
}

