/**
 * Transcript Repository - Database operations for Transcript entity
 */

import { getCurrentDatabase } from '../schema'
import { generateTranscriptId } from '../id-generator'
import type {
  Transcript,
  TargetType,
  TranscriptSource,
  SyncStatus,
  TranscriptInput,
} from '@/page/types/db'

// ============================================================================
// Query Operations
// ============================================================================

export async function getTranscriptById(id: string): Promise<Transcript | undefined> {
  return getCurrentDatabase().transcripts.get(id)
}

export async function getTranscriptsByTarget(
  targetType: TargetType,
  targetId: string
): Promise<Transcript[]> {
  return getCurrentDatabase().transcripts
    .where('[targetType+targetId]')
    .equals([targetType, targetId])
    .toArray()
}

export async function getTranscriptByTargetLanguageSource(
  targetType: TargetType,
  targetId: string,
  language: string,
  source: TranscriptSource
): Promise<Transcript | undefined> {
  return getCurrentDatabase().transcripts
    .where('[targetType+targetId+language+source]')
    .equals([targetType, targetId, language, source])
    .first()
}

export async function getTranscriptsBySyncStatus(
  status: SyncStatus
): Promise<Transcript[]> {
  return getCurrentDatabase().transcripts.where('syncStatus').equals(status).toArray()
}

export async function getTranscriptsByLanguage(language: string): Promise<Transcript[]> {
  return getCurrentDatabase().transcripts.where('language').equals(language).toArray()
}

export async function getTranscriptsBySource(
  source: TranscriptSource
): Promise<Transcript[]> {
  return getCurrentDatabase().transcripts.where('source').equals(source).toArray()
}

export async function getAllTranscripts(): Promise<Transcript[]> {
  return getCurrentDatabase().transcripts.toArray()
}

// ============================================================================
// Mutation Operations
// ============================================================================

/**
 * Save transcript from server (download sync)
 * Uses the id from server directly, no generation needed
 */
export async function saveTranscriptFromServer(input: Transcript): Promise<string> {
  const now = new Date().toISOString()

  // Server transcript should have id
  if (!input.id) {
    throw new Error('Server transcript must have id')
  }

  const existing = await getCurrentDatabase().transcripts.get(input.id)
  if (existing) {
    // Update existing transcript
    const updated: Transcript = {
      ...existing,
      ...input,
      id: input.id,
      updatedAt: now,
    }
    await getCurrentDatabase().transcripts.put(updated)
    return input.id
  }

  // Create new transcript from server
  const transcript: Transcript = {
    ...input,
    syncStatus: input.syncStatus || 'synced',
    createdAt: input.createdAt || now,
    updatedAt: input.updatedAt || now,
  }
  await getCurrentDatabase().transcripts.put(transcript)
  return input.id
}

export async function saveTranscript(input: TranscriptInput): Promise<string> {
  const now = new Date().toISOString()
  const id = generateTranscriptId(
    input.targetType,
    input.targetId,
    input.language,
    input.source
  )

  const existing = await getCurrentDatabase().transcripts.get(id)
  if (existing) {
    const updated: Transcript = {
      ...existing,
      ...input,
      id,
      updatedAt: now,
    }
    await getCurrentDatabase().transcripts.put(updated)
    return id
  }

  const transcript: Transcript = {
    ...input,
    id,
    createdAt: now,
    updatedAt: now,
  }
  await getCurrentDatabase().transcripts.put(transcript)
  return id
}

export async function updateTranscript(
  id: string,
  updates: Partial<Omit<Transcript, 'id' | 'createdAt'>>
): Promise<void> {
  const now = new Date().toISOString()
  const existing = await getCurrentDatabase().transcripts.get(id)
  if (existing) {
    const updated: Transcript = {
      ...existing,
      ...updates,
      id,
      updatedAt: now,
    }
    await getCurrentDatabase().transcripts.put(updated)
  }
}

export async function deleteTranscript(id: string): Promise<void> {
  await getCurrentDatabase().transcripts.delete(id)
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Get track ID from transcript (for display purposes)
 * Format: ${language}:${source}
 */
export function getTrackId(transcript: Transcript): string {
  return `${transcript.language}:${transcript.source}`
}

// ============================================================================
// Repository Object (Alternative API)
// ============================================================================

export const transcriptRepository = {
  // Queries
  getById: getTranscriptById,
  getByTarget: getTranscriptsByTarget,
  getByTargetLanguageSource: getTranscriptByTargetLanguageSource,
  getBySyncStatus: getTranscriptsBySyncStatus,
  getByLanguage: getTranscriptsByLanguage,
  getBySource: getTranscriptsBySource,
  getAll: getAllTranscripts,
  // Mutations
  save: saveTranscript,
  saveFromServer: saveTranscriptFromServer,
  update: updateTranscript,
  delete: deleteTranscript,
  // Utilities
  getTrackId,
}

