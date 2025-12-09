/**
 * Recording Repository - Database operations for Recording entity
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
// Repository Object (Alternative API)
// ============================================================================

export const recordingRepository = {
  // Queries
  getById: getRecordingById,
  getByTarget: getRecordingsByTarget,
  getBySyncStatus: getRecordingsBySyncStatus,
  getByLanguage: getRecordingsByLanguage,
  getAll: getAllRecordings,
  // Mutations
  save: saveRecording,
  update: updateRecording,
  delete: deleteRecording,
}

