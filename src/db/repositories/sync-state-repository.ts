/**
 * Sync State Repository - Manages sync state (last sync timestamps)
 */

// ============================================================================
// Types
// ============================================================================

export interface SyncState {
  id: string // Entity type: 'audio' | 'video'
  lastSyncAt: string // ISO 8601 timestamp
  updatedAt: string // ISO 8601 timestamp
}

// ============================================================================
// Constants
// ============================================================================

// Use a simple in-memory cache with localStorage fallback
// Since IndexedDB doesn't have a dedicated sync state table,
// we'll use localStorage for simplicity
const STORAGE_KEY_PREFIX = 'sync_state_'

// ============================================================================
// Query Operations
// ============================================================================

/**
 * Get last sync timestamp for an entity type
 */
export async function getLastSyncAt(entityType: 'audio' | 'video'): Promise<string | null> {
  try {
    const key = `${STORAGE_KEY_PREFIX}${entityType}`
    const value = localStorage.getItem(key)
    if (value) {
      const state: SyncState = JSON.parse(value)
      return state.lastSyncAt
    }
    return null
  } catch (error) {
    console.error(`Failed to get last sync at for ${entityType}:`, error)
    return null
  }
}

/**
 * Get all sync states
 */
export async function getAllSyncStates(): Promise<SyncState[]> {
  const states: SyncState[] = []
  try {
    for (const entityType of ['audio', 'video'] as const) {
      const key = `${STORAGE_KEY_PREFIX}${entityType}`
      const value = localStorage.getItem(key)
      if (value) {
        states.push(JSON.parse(value))
      }
    }
  } catch (error) {
    console.error('Failed to get all sync states:', error)
  }
  return states
}

// ============================================================================
// Mutation Operations
// ============================================================================

/**
 * Update last sync timestamp for an entity type
 */
export async function updateLastSyncAt(
  entityType: 'audio' | 'video',
  timestamp: string
): Promise<void> {
  try {
    const key = `${STORAGE_KEY_PREFIX}${entityType}`
    const state: SyncState = {
      id: entityType,
      lastSyncAt: timestamp,
      updatedAt: new Date().toISOString(),
    }
    localStorage.setItem(key, JSON.stringify(state))
  } catch (error) {
    console.error(`Failed to update last sync at for ${entityType}:`, error)
    throw error
  }
}

/**
 * Clear sync state for an entity type
 */
export async function clearSyncState(entityType: 'audio' | 'video'): Promise<void> {
  try {
    const key = `${STORAGE_KEY_PREFIX}${entityType}`
    localStorage.removeItem(key)
  } catch (error) {
    console.error(`Failed to clear sync state for ${entityType}:`, error)
  }
}

/**
 * Clear all sync states
 */
export async function clearAllSyncStates(): Promise<void> {
  try {
    for (const entityType of ['audio', 'video'] as const) {
      await clearSyncState(entityType)
    }
  } catch (error) {
    console.error('Failed to clear all sync states:', error)
  }
}

// ============================================================================
// Repository Object (Alternative API)
// ============================================================================

export const syncStateRepository = {
  // Queries
  getLastSyncAt,
  getAll: getAllSyncStates,
  // Mutations
  updateLastSyncAt,
  clear: clearSyncState,
  clearAll: clearAllSyncStates,
}

