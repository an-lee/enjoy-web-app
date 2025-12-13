/**
 * EchoSession Repository - Database operations for EchoSession entity
 */

import { db } from '../schema'
import { generateEchoSessionId } from '../id-generator'
import type {
  EchoSession,
  TargetType,
  SyncStatus,
  EchoSessionInput,
} from '@/types/db'

// ============================================================================
// Query Operations
// ============================================================================

export async function getEchoSessionById(
  id: string
): Promise<EchoSession | undefined> {
  return db.echoSessions.get(id)
}

export async function getEchoSessionsByTarget(
  targetType: TargetType,
  targetId: string
): Promise<EchoSession[]> {
  return db.echoSessions
    .where('[targetType+targetId]')
    .equals([targetType, targetId])
    .toArray()
}

/**
 * Get the most recent active session for a target media
 * Returns the session with the latest lastActiveAt timestamp
 */
export async function getLatestEchoSessionByTarget(
  targetType: TargetType,
  targetId: string
): Promise<EchoSession | undefined> {
  const sessions = await getEchoSessionsByTarget(targetType, targetId)
  if (sessions.length === 0) return undefined

  // Sort by lastActiveAt descending and return the first one
  return sessions.sort(
    (a, b) =>
      new Date(b.lastActiveAt).getTime() - new Date(a.lastActiveAt).getTime()
  )[0]
}

export async function getEchoSessionsBySyncStatus(
  status: SyncStatus
): Promise<EchoSession[]> {
  return db.echoSessions.where('syncStatus').equals(status).toArray()
}

export async function getEchoSessionsByLanguage(
  language: string
): Promise<EchoSession[]> {
  return db.echoSessions.where('language').equals(language).toArray()
}

/**
 * Get all active sessions (not completed)
 */
export async function getActiveEchoSessions(): Promise<EchoSession[]> {
  return db.echoSessions
    .filter((session) => !session.completedAt)
    .toArray()
}

/**
 * Get all completed sessions
 */
export async function getCompletedEchoSessions(): Promise<EchoSession[]> {
  return db.echoSessions
    .filter((session) => !!session.completedAt)
    .toArray()
}

export async function getAllEchoSessions(): Promise<EchoSession[]> {
  return db.echoSessions.toArray()
}

// ============================================================================
// Mutation Operations
// ============================================================================

export async function saveEchoSession(input: EchoSessionInput): Promise<string> {
  const now = new Date().toISOString()
  const id = generateEchoSessionId()

  const session: EchoSession = {
    ...input,
    id,
    recordingsCount: input.recordingsCount ?? 0,
    recordingsDuration: input.recordingsDuration ?? 0,
    createdAt: now,
    updatedAt: now,
  }
  await db.echoSessions.put(session)
  return id
}

export async function updateEchoSession(
  id: string,
  updates: Partial<Omit<EchoSession, 'id' | 'createdAt'>>
): Promise<void> {
  const now = new Date().toISOString()
  await db.echoSessions.update(id, {
    ...updates,
    updatedAt: now,
  })
}

/**
 * Update session progress and mark as active
 */
export async function updateEchoSessionProgress(
  id: string,
  progress: {
    currentTime?: number
    playbackRate?: number
    volume?: number
    echoStartTime?: number
    echoEndTime?: number
    transcriptId?: string
  }
): Promise<void> {
  const now = new Date().toISOString()
  await db.echoSessions.update(id, {
    ...progress,
    lastActiveAt: now,
    updatedAt: now,
  })
}

/**
 * Increment recording statistics
 */
export async function incrementEchoSessionRecording(
  id: string,
  recordingDuration: number // milliseconds
): Promise<void> {
  const session = await db.echoSessions.get(id)
  if (!session) return

  const now = new Date().toISOString()
  const newCount = session.recordingsCount + 1
  const newTotalDuration = session.recordingsDuration + recordingDuration

  await db.echoSessions.update(id, {
    recordingsCount: newCount,
    recordingsDuration: newTotalDuration,
    lastRecordingAt: now,
    lastActiveAt: now,
    updatedAt: now,
  })
}

/**
 * Mark session as completed
 */
export async function completeEchoSession(id: string): Promise<void> {
  const now = new Date().toISOString()
  await db.echoSessions.update(id, {
    completedAt: now,
    lastActiveAt: now,
    updatedAt: now,
  })
}

export async function deleteEchoSession(id: string): Promise<void> {
  await db.echoSessions.delete(id)
}

// ============================================================================
// Repository Object (Alternative API)
// ============================================================================

export const echoSessionRepository = {
  // Queries
  getById: getEchoSessionById,
  getByTarget: getEchoSessionsByTarget,
  getLatestByTarget: getLatestEchoSessionByTarget,
  getBySyncStatus: getEchoSessionsBySyncStatus,
  getByLanguage: getEchoSessionsByLanguage,
  getActive: getActiveEchoSessions,
  getCompleted: getCompletedEchoSessions,
  getAll: getAllEchoSessions,
  // Mutations
  save: saveEchoSession,
  update: updateEchoSession,
  updateProgress: updateEchoSessionProgress,
  incrementRecording: incrementEchoSessionRecording,
  complete: completeEchoSession,
  delete: deleteEchoSession,
}

