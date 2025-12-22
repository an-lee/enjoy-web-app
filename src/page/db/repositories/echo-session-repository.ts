/**
 * EchoSession Repository - Database operations for EchoSession entity
 */

import { getCurrentDatabase } from '../schema'
import { generateEchoSessionId } from '../id-generator'
import type {
  EchoSession,
  TargetType,
  SyncStatus,
  EchoSessionInput,
} from '@/page/types/db'

// ============================================================================
// Query Operations
// ============================================================================

export async function getEchoSessionById(
  id: string
): Promise<EchoSession | undefined> {
  return getCurrentDatabase().echoSessions.get(id)
}

export async function getEchoSessionsByTarget(
  targetType: TargetType,
  targetId: string
): Promise<EchoSession[]> {
  return getCurrentDatabase().echoSessions
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

/**
 * Get the active (not completed) session for a target media
 * Ensures only one active session exists per media
 * If multiple active sessions exist, returns the most recent one
 */
export async function getActiveEchoSessionByTarget(
  targetType: TargetType,
  targetId: string
): Promise<EchoSession | undefined> {
  const sessions = await getEchoSessionsByTarget(targetType, targetId)
  const activeSessions = sessions.filter((s) => !s.completedAt)

  if (activeSessions.length === 0) return undefined

  // If multiple active sessions exist, return the most recent one
  // (This shouldn't happen in normal operation, but handle it gracefully)
  return activeSessions.sort(
    (a, b) =>
      new Date(b.lastActiveAt).getTime() - new Date(a.lastActiveAt).getTime()
  )[0]
}

/**
 * Get or create an active EchoSession for a target media
 * Ensures only one active session exists per media:
 * - If an active session exists, returns it
 * - If only completed sessions exist, creates a new one
 * - If no sessions exist, creates a new one
 *
 * @param targetType - 'Video' or 'Audio'
 * @param targetId - Video.id or Audio.id
 * @param language - BCP 47 language code
 * @param initialValues - Optional initial values for new session
 * @returns The active EchoSession ID
 */
export async function getOrCreateActiveEchoSession(
  targetType: TargetType,
  targetId: string,
  language: string,
  initialValues?: {
    currentTime?: number
    playbackRate?: number
    volume?: number
    transcriptId?: string
  }
): Promise<string> {
  // Try to get existing active session
  const activeSession = await getActiveEchoSessionByTarget(targetType, targetId)

  if (activeSession) {
    // Update lastActiveAt to mark it as recently used
    const now = new Date().toISOString()
    await getCurrentDatabase().echoSessions.update(activeSession.id, {
      lastActiveAt: now,
      updatedAt: now,
    })
    return activeSession.id
  }

  // No active session exists, create a new one
  const now = new Date().toISOString()
  const id = generateEchoSessionId()

  const session: EchoSession = {
    id,
    targetType,
    targetId,
    language,
    currentTime: initialValues?.currentTime ?? 0,
    playbackRate: initialValues?.playbackRate ?? 1,
    volume: initialValues?.volume ?? 1,
    transcriptId: initialValues?.transcriptId,
    recordingsCount: 0,
    recordingsDuration: 0,
    startedAt: now,
    lastActiveAt: now,
    createdAt: now,
    updatedAt: now,
  }

  await getCurrentDatabase().echoSessions.put(session)
  return id
}

export async function getEchoSessionsBySyncStatus(
  status: SyncStatus
): Promise<EchoSession[]> {
  return getCurrentDatabase().echoSessions.where('syncStatus').equals(status).toArray()
}

export async function getEchoSessionsByLanguage(
  language: string
): Promise<EchoSession[]> {
  return getCurrentDatabase().echoSessions.where('language').equals(language).toArray()
}

/**
 * Get all active sessions (not completed)
 */
export async function getActiveEchoSessions(): Promise<EchoSession[]> {
  return getCurrentDatabase().echoSessions
    .filter((session) => !session.completedAt)
    .toArray()
}

/**
 * Get all completed sessions
 */
export async function getCompletedEchoSessions(): Promise<EchoSession[]> {
  return getCurrentDatabase().echoSessions
    .filter((session) => !!session.completedAt)
    .toArray()
}

export async function getAllEchoSessions(): Promise<EchoSession[]> {
  return getCurrentDatabase().echoSessions.toArray()
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
  await getCurrentDatabase().echoSessions.put(session)
  return id
}

export async function updateEchoSession(
  id: string,
  updates: Partial<Omit<EchoSession, 'id' | 'createdAt'>>
): Promise<void> {
  const now = new Date().toISOString()
  await getCurrentDatabase().echoSessions.update(id, {
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
  await getCurrentDatabase().echoSessions.update(id, {
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
  const session = await getCurrentDatabase().echoSessions.get(id)
  if (!session) return

  const now = new Date().toISOString()
  const newCount = session.recordingsCount + 1
  const newTotalDuration = session.recordingsDuration + recordingDuration

  await getCurrentDatabase().echoSessions.update(id, {
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
  await getCurrentDatabase().echoSessions.update(id, {
    completedAt: now,
    lastActiveAt: now,
    updatedAt: now,
  })
}

export async function deleteEchoSession(id: string): Promise<void> {
  await getCurrentDatabase().echoSessions.delete(id)
}

// ============================================================================
// Repository Object (Alternative API)
// ============================================================================

export const echoSessionRepository = {
  // Queries
  getById: getEchoSessionById,
  getByTarget: getEchoSessionsByTarget,
  getLatestByTarget: getLatestEchoSessionByTarget,
  getActiveByTarget: getActiveEchoSessionByTarget,
  getOrCreateActive: getOrCreateActiveEchoSession,
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

