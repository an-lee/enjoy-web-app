/**
 * Sync Manager - High-level sync orchestration and automatic sync triggers
 *
 * This module provides:
 * - Automatic sync on app startup
 * - Automatic sync on network recovery
 * - Periodic background sync
 * - Manual sync triggers
 */

import { createLogger } from '@/lib/utils'
import { fullSync, processSyncQueue, queueUploadSync, downloadTranscriptsByTarget } from './sync-service'
import type { SyncOptions, SyncResult } from './sync-service'
import type { TargetType } from '@/types/db'

// ============================================================================
// Logger
// ============================================================================

const log = createLogger({ name: 'sync-manager' })

// ============================================================================
// Types
// ============================================================================

export interface SyncManagerOptions {
  /**
   * Enable automatic sync on app startup
   * @default true
   */
  autoSyncOnStartup?: boolean
  /**
   * Enable automatic sync on network recovery
   * @default true
   */
  autoSyncOnNetworkRecovery?: boolean
  /**
   * Enable periodic background sync (in milliseconds)
   * Set to 0 to disable
   * @default 5 * 60 * 1000 (5 minutes)
   */
  periodicSyncInterval?: number
}

// ============================================================================
// Sync Manager State
// ============================================================================

let syncManager: {
  isInitialized: boolean
  periodicSyncTimer?: number
  options: SyncManagerOptions
} = {
  isInitialized: false,
  options: {
    autoSyncOnStartup: true,
    autoSyncOnNetworkRecovery: true,
    periodicSyncInterval: 5 * 60 * 1000, // 5 minutes
  },
}

// ============================================================================
// Network Detection
// ============================================================================

/**
 * Check if network is online
 */
function isOnline(): boolean {
  return navigator.onLine
}

/**
 * Setup network recovery listener
 */
function setupNetworkRecoveryListener(): void {
  if (!syncManager.options.autoSyncOnNetworkRecovery) {
    return
  }

  window.addEventListener('online', () => {
    log.info('Network recovered, triggering sync...')
    fullSync({ background: true }).catch((error) => {
      log.error('Auto sync on network recovery failed:', error)
    })
  })
}

// ============================================================================
// Periodic Sync
// ============================================================================

/**
 * Start periodic background sync
 */
function startPeriodicSync(): void {
  if (!syncManager.options.periodicSyncInterval || syncManager.options.periodicSyncInterval <= 0) {
    return
  }

  if (syncManager.periodicSyncTimer) {
    clearInterval(syncManager.periodicSyncTimer)
  }

  syncManager.periodicSyncTimer = window.setInterval(() => {
    if (isOnline()) {
      log.debug('Running periodic background sync...')
      processSyncQueue({ background: true }).catch((error) => {
        log.error('Periodic sync failed:', error)
      })
    }
  }, syncManager.options.periodicSyncInterval)

  log.debug(`Periodic sync started (interval: ${syncManager.options.periodicSyncInterval}ms)`)
}

/**
 * Stop periodic background sync
 */
function stopPeriodicSync(): void {
  if (syncManager.periodicSyncTimer) {
    clearInterval(syncManager.periodicSyncTimer)
    syncManager.periodicSyncTimer = undefined
    log.debug('Periodic sync stopped')
  }
}

// ============================================================================
// Public API
// ============================================================================

/**
 * Initialize sync manager
 */
export async function initSyncManager(options: SyncManagerOptions = {}): Promise<void> {
  if (syncManager.isInitialized) {
    log.warn('Sync manager already initialized')
    return
  }

  syncManager.options = {
    ...syncManager.options,
    ...options,
  }

  // Setup network recovery listener
  setupNetworkRecoveryListener()

  // Start periodic sync
  startPeriodicSync()

  // Auto sync on startup
  if (syncManager.options.autoSyncOnStartup && isOnline()) {
    log.info('Auto syncing on startup...')
    fullSync({ background: true }).catch((error) => {
      log.error('Auto sync on startup failed:', error)
    })
  }

  syncManager.isInitialized = true
  log.info('Sync manager initialized')
}

/**
 * Shutdown sync manager
 */
export function shutdownSyncManager(): void {
  stopPeriodicSync()
  syncManager.isInitialized = false
  log.info('Sync manager shut down')
}

/**
 * Manual sync trigger
 */
export async function triggerSync(options: SyncOptions = {}): Promise<SyncResult> {
  if (!isOnline()) {
    log.warn('Cannot sync: network is offline')
    return {
      success: false,
      synced: 0,
      failed: 0,
      errors: ['Network is offline'],
    }
  }

  log.info('Manual sync triggered')
  return await fullSync(options)
}

/**
 * Queue entity for upload sync
 * This is the main entry point for queuing local changes
 */
export async function queueForSync(
  entityType: 'audio' | 'video' | 'transcript',
  entityId: string,
  action: 'create' | 'update' | 'delete'
): Promise<void> {
  await queueUploadSync(entityType, entityId, action)

  // Trigger background sync if online
  if (isOnline()) {
    processSyncQueue({ background: true }).catch((error) => {
      log.error('Background sync after queue failed:', error)
    })
  }
}

/**
 * Sync transcripts for a specific target (audio/video)
 * This is called on-demand when opening an audio/video
 */
export async function syncTranscriptsForTarget(
  targetType: TargetType,
  targetId: string,
  options: SyncOptions = {}
): Promise<SyncResult> {
  if (!isOnline()) {
    log.warn('Cannot sync transcripts: network is offline')
    return {
      success: false,
      synced: 0,
      failed: 0,
      errors: ['Network is offline'],
    }
  }

  log.debug(`Syncing transcripts for ${targetType}:${targetId}`)
  return await downloadTranscriptsByTarget(targetType, targetId, options)
}

/**
 * Get sync manager status
 */
export function getSyncManagerStatus(): {
  isInitialized: boolean
  isOnline: boolean
  hasPeriodicSync: boolean
} {
  return {
    isInitialized: syncManager.isInitialized,
    isOnline: isOnline(),
    hasPeriodicSync: syncManager.periodicSyncTimer !== undefined,
  }
}

