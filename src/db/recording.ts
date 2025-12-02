import { db } from './database'
import type { Recording, SyncStatus } from './schema'

export async function getRecordingsByVid(vid: string): Promise<Recording[]> {
  return db.recordings.where('vid').equals(vid).toArray()
}

export async function getRecordingsByAid(aid: string): Promise<Recording[]> {
  return db.recordings.where('aid').equals(aid).toArray()
}

export async function getRecordingsBySyncStatus(
  status: SyncStatus
): Promise<Recording[]> {
  return db.recordings.where('syncStatus').equals(status).toArray()
}

export async function getRecordingsByUserId(userId: number): Promise<Recording[]> {
  return db.recordings.where('userId').equals(userId).toArray()
}

export async function getRecordingsByEchoId(echoId: string): Promise<Recording[]> {
  return db.recordings.where('echoId').equals(echoId).toArray()
}

