/**
 * Recording Store - Database operations for Recording entity
 */

import { db } from '../schema'
import { generateRecordingId } from '../id-generator'
import type { Recording, TargetType, SyncStatus, RecordingInput } from '@/types/db'

// ============================================================================
// Query Operations
// ============================================================================

export async function getRecordingById(id: string): Promise<Recording | undefined> {
  return db.recordings.get(id)
}

export async function getRecordingsByTarget(
  targetType: TargetType,
  targetId: string
): Promise<Recording[]> {
  return db.recordings
    .where('[targetType+targetId]')
    .equals([targetType, targetId])
    .toArray()
}

export async function getRecordingsBySyncStatus(
  status: SyncStatus
): Promise<Recording[]> {
  return db.recordings.where('syncStatus').equals(status).toArray()
}

export async function getRecordingsByLanguage(language: string): Promise<Recording[]> {
  return db.recordings.where('language').equals(language).toArray()
}

export async function getAllRecordings(): Promise<Recording[]> {
  return db.recordings.toArray()
}

// ============================================================================
// Deprecated Query Operations (for backward compatibility)
// ============================================================================

/**
 * @deprecated Use getRecordingsByTarget('Video', videoId) instead
 */
export async function getRecordingsByVid(vid: string): Promise<Recording[]> {
  return getRecordingsByTarget('Video', vid)
}

/**
 * @deprecated Use getRecordingsByTarget('Audio', audioId) instead
 */
export async function getRecordingsByAid(aid: string): Promise<Recording[]> {
  return getRecordingsByTarget('Audio', aid)
}

/**
 * @deprecated Not supported in new schema
 */
export async function getRecordingsByUserId(_userId: number): Promise<Recording[]> {
  console.warn('getRecordingsByUserId is deprecated')
  return db.recordings.toArray()
}

/**
 * @deprecated Not supported in new schema
 */
export async function getRecordingsByEchoId(_echoId: string): Promise<Recording[]> {
  console.warn('getRecordingsByEchoId is deprecated')
  return []
}

// ============================================================================
// Mutation Operations
// ============================================================================

export async function saveRecording(input: RecordingInput): Promise<string> {
  const now = new Date().toISOString()
  const id = generateRecordingId()

  const recording: Recording = {
    ...input,
    id,
    createdAt: now,
    updatedAt: now,
  }
  await db.recordings.put(recording)
  return id
}

export async function updateRecording(
  id: string,
  updates: Partial<Omit<Recording, 'id' | 'createdAt'>>
): Promise<void> {
  const now = new Date().toISOString()
  await db.recordings.update(id, {
    ...updates,
    updatedAt: now,
  })
}

export async function deleteRecording(id: string): Promise<void> {
  await db.recordings.delete(id)
}

// ============================================================================
// Store Object (Alternative API)
// ============================================================================

export const recordingStore = {
  // Queries
  getById: getRecordingById,
  getByTarget: getRecordingsByTarget,
  getBySyncStatus: getRecordingsBySyncStatus,
  getByLanguage: getRecordingsByLanguage,
  getAll: getAllRecordings,
  // Deprecated
  getByVid: getRecordingsByVid,
  getByAid: getRecordingsByAid,
  getByUserId: getRecordingsByUserId,
  getByEchoId: getRecordingsByEchoId,
  // Mutations
  save: saveRecording,
  update: updateRecording,
  delete: deleteRecording,
}

