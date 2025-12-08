/**
 * Transcript Store - Database operations for Transcript entity
 */

import { db } from '../schema'
import { generateTranscriptId } from '../id-generator'
import type {
  Transcript,
  TargetType,
  TranscriptSource,
  SyncStatus,
  TranscriptInput,
} from '@/types/db'

// ============================================================================
// Query Operations
// ============================================================================

export async function getTranscriptById(id: string): Promise<Transcript | undefined> {
  return db.transcripts.get(id)
}

export async function getTranscriptsByTarget(
  targetType: TargetType,
  targetId: string
): Promise<Transcript[]> {
  return db.transcripts
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
  return db.transcripts
    .where('[targetType+targetId+language+source]')
    .equals([targetType, targetId, language, source])
    .first()
}

export async function getTranscriptsBySyncStatus(
  status: SyncStatus
): Promise<Transcript[]> {
  return db.transcripts.where('syncStatus').equals(status).toArray()
}

export async function getTranscriptsByLanguage(language: string): Promise<Transcript[]> {
  return db.transcripts.where('language').equals(language).toArray()
}

export async function getTranscriptsBySource(
  source: TranscriptSource
): Promise<Transcript[]> {
  return db.transcripts.where('source').equals(source).toArray()
}

export async function getAllTranscripts(): Promise<Transcript[]> {
  return db.transcripts.toArray()
}

// ============================================================================
// Deprecated Query Operations (for backward compatibility)
// ============================================================================

/**
 * @deprecated Use getTranscriptsByTarget('Video', videoId) instead
 */
export async function getTranscriptsByVid(vid: string): Promise<Transcript[]> {
  return getTranscriptsByTarget('Video', vid)
}

/**
 * @deprecated Use getTranscriptsByTarget('Audio', audioId) instead
 */
export async function getTranscriptsByAid(aid: string): Promise<Transcript[]> {
  return getTranscriptsByTarget('Audio', aid)
}

// ============================================================================
// Mutation Operations
// ============================================================================

export async function saveTranscript(input: TranscriptInput): Promise<string> {
  const now = new Date().toISOString()
  const id = generateTranscriptId(
    input.targetType,
    input.targetId,
    input.language,
    input.source
  )

  const existing = await db.transcripts.get(id)
  if (existing) {
    await db.transcripts.update(id, {
      ...input,
      updatedAt: now,
    })
    return id
  }

  const transcript: Transcript = {
    ...input,
    id,
    createdAt: now,
    updatedAt: now,
  }
  await db.transcripts.put(transcript)
  return id
}

export async function updateTranscript(
  id: string,
  updates: Partial<Omit<Transcript, 'id' | 'createdAt'>>
): Promise<void> {
  const now = new Date().toISOString()
  await db.transcripts.update(id, {
    ...updates,
    updatedAt: now,
  })
}

export async function deleteTranscript(id: string): Promise<void> {
  await db.transcripts.delete(id)
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
// Store Object (Alternative API)
// ============================================================================

export const transcriptStore = {
  // Queries
  getById: getTranscriptById,
  getByTarget: getTranscriptsByTarget,
  getByTargetLanguageSource: getTranscriptByTargetLanguageSource,
  getBySyncStatus: getTranscriptsBySyncStatus,
  getByLanguage: getTranscriptsByLanguage,
  getBySource: getTranscriptsBySource,
  getAll: getAllTranscripts,
  // Deprecated
  getByVid: getTranscriptsByVid,
  getByAid: getTranscriptsByAid,
  // Mutations
  save: saveTranscript,
  update: updateTranscript,
  delete: deleteTranscript,
  // Utilities
  getTrackId,
}

