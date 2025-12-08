/**
 * UserEcho Store - Database operations for UserEcho entity
 */

import { db } from '../schema'
import { generateUserEchoId } from '../id-generator'
import type { UserEcho, TargetType, SyncStatus, UserEchoInput } from '@/types/db'

// ============================================================================
// Query Operations
// ============================================================================

export async function getUserEchoById(id: string): Promise<UserEcho | undefined> {
  return db.userEchos.get(id)
}

export async function getUserEchoByTarget(
  userId: number,
  targetType: TargetType,
  targetId: string
): Promise<UserEcho | undefined> {
  return db.userEchos
    .where('[userId+targetType+targetId]')
    .equals([userId, targetType, targetId])
    .first()
}

export async function getUserEchosByUserId(userId: number): Promise<UserEcho[]> {
  return db.userEchos.where('userId').equals(userId).toArray()
}

export async function getUserEchosByStatus(
  status: NonNullable<UserEcho['status']>
): Promise<UserEcho[]> {
  return db.userEchos.where('status').equals(status).toArray()
}

export async function getUserEchosBySyncStatus(status: SyncStatus): Promise<UserEcho[]> {
  return db.userEchos.where('syncStatus').equals(status).toArray()
}

export async function getAllUserEchos(): Promise<UserEcho[]> {
  return db.userEchos.toArray()
}

// ============================================================================
// Deprecated Query Operations (for backward compatibility)
// ============================================================================

/**
 * @deprecated Use getUserEchoByTarget(userId, 'Video', videoId) instead
 */
export async function getUserEchoByVideo(
  userId: number,
  vid: string
): Promise<UserEcho | undefined> {
  return getUserEchoByTarget(userId, 'Video', vid)
}

/**
 * @deprecated Use getUserEchoByTarget(userId, 'Audio', audioId) instead
 */
export async function getUserEchoByAudio(
  userId: number,
  aid: string
): Promise<UserEcho | undefined> {
  return getUserEchoByTarget(userId, 'Audio', aid)
}

/**
 * @deprecated Use getUserEchosByTarget instead
 */
export async function getUserEchosByVid(vid: string): Promise<UserEcho[]> {
  return db.userEchos.where('targetId').equals(vid).toArray()
}

/**
 * @deprecated Use getUserEchosByTarget instead
 */
export async function getUserEchosByAid(aid: string): Promise<UserEcho[]> {
  return db.userEchos.where('targetId').equals(aid).toArray()
}

// ============================================================================
// Mutation Operations
// ============================================================================

export async function saveUserEcho(input: UserEchoInput): Promise<string> {
  const now = new Date().toISOString()
  const id = generateUserEchoId(input.targetType, input.targetId, input.userId)

  const existing = await db.userEchos.get(id)
  if (existing) {
    await db.userEchos.update(id, {
      ...input,
      updatedAt: now,
    })
    return id
  }

  const userEcho: UserEcho = {
    ...input,
    id,
    createdAt: now,
    updatedAt: now,
  }
  await db.userEchos.put(userEcho)
  return id
}

export async function updateUserEcho(
  id: string,
  updates: Partial<Omit<UserEcho, 'id' | 'createdAt'>>
): Promise<void> {
  const now = new Date().toISOString()
  await db.userEchos.update(id, {
    ...updates,
    updatedAt: now,
  })
}

export async function deleteUserEcho(id: string): Promise<void> {
  await db.userEchos.delete(id)
}

// ============================================================================
// Store Object (Alternative API)
// ============================================================================

export const userEchoStore = {
  // Queries
  getById: getUserEchoById,
  getByTarget: getUserEchoByTarget,
  getByUserId: getUserEchosByUserId,
  getByStatus: getUserEchosByStatus,
  getBySyncStatus: getUserEchosBySyncStatus,
  getAll: getAllUserEchos,
  // Deprecated
  getByVideo: getUserEchoByVideo,
  getByAudio: getUserEchoByAudio,
  getByVid: getUserEchosByVid,
  getByAid: getUserEchosByAid,
  // Mutations
  save: saveUserEcho,
  update: updateUserEcho,
  delete: deleteUserEcho,
}

