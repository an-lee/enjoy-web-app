import { db } from './database'
import type { Transcript, SyncStatus } from './schema'

export async function getTranscriptsByVid(vid: string): Promise<Transcript[]> {
  return db.transcripts.where('vid').equals(vid).toArray()
}

export async function getTranscriptsByAid(aid: string): Promise<Transcript[]> {
  return db.transcripts.where('aid').equals(aid).toArray()
}

export async function getTranscriptsBySyncStatus(
  status: SyncStatus
): Promise<Transcript[]> {
  return db.transcripts.where('syncStatus').equals(status).toArray()
}

