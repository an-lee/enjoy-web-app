import { db } from './database'
import type { UserEcho, SyncStatus } from './schema'

export async function getUserEchoByVideo(
  userId: number,
  vid: string
): Promise<UserEcho | undefined> {
  return db.userEchos.where('[userId+vid]').equals([userId, vid]).first()
}

export async function getUserEchoByAudio(
  userId: number,
  aid: string
): Promise<UserEcho | undefined> {
  return db.userEchos.where('[userId+aid]').equals([userId, aid]).first()
}

export async function getUserEchosByUserId(userId: number): Promise<UserEcho[]> {
  return db.userEchos.where('userId').equals(userId).toArray()
}

export async function getUserEchosByVid(vid: string): Promise<UserEcho[]> {
  return db.userEchos.where('vid').equals(vid).toArray()
}

export async function getUserEchosByAid(aid: string): Promise<UserEcho[]> {
  return db.userEchos.where('aid').equals(aid).toArray()
}

export async function getUserEchosByStatus(
  status: NonNullable<UserEcho['status']>
): Promise<UserEcho[]> {
  return db.userEchos.where('status').equals(status).toArray()
}

export async function getUserEchosBySyncStatus(
  status: SyncStatus
): Promise<UserEcho[]> {
  return db.userEchos.where('syncStatus').equals(status).toArray()
}

