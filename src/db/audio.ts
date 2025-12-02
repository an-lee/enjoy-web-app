import { db } from './database'
import type { Audio, SyncStatus } from './schema'

export async function getAudiosBySyncStatus(
  status: SyncStatus
): Promise<Audio[]> {
  return db.audios.where('syncStatus').equals(status).toArray()
}

export async function getAudioById(id: string): Promise<Audio | undefined> {
  return db.audios.get(id)
}

export async function getStarredAudios(): Promise<Audio[]> {
  return db.audios.where('starred').equals(1).toArray()
}

export async function getAudioByTranslationKey(
  translationKey: string
): Promise<Audio | undefined> {
  return db.audios.where('translationKey').equals(translationKey).first()
}

export async function getAudiosByTranslationKey(
  translationKey: string
): Promise<Audio[]> {
  return db.audios.where('translationKey').equals(translationKey).toArray()
}

export async function saveAudio(
  audio: Omit<Audio, 'createdAt' | 'updatedAt'>
): Promise<string> {
  const now = Date.now()
  const audioRecord: Audio = {
    ...audio,
    createdAt: now,
    updatedAt: now,
  }
  await db.audios.put(audioRecord)
  return audioRecord.id
}

