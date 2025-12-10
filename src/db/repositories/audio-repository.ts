/**
 * Audio Repository - Database operations for Audio entity
 */

import { db } from '../schema'
import { generateAudioId, generateLocalAudioAid, generateTTSAudioAid } from '../id-generator'
import type {
  Audio,
  AudioProvider,
  SyncStatus,
  TTSAudioInput,
  PlatformAudioInput,
  AudioInput,
} from '@/types/db'

// ============================================================================
// Query Operations
// ============================================================================

export async function getAudioById(id: string): Promise<Audio | undefined> {
  return db.audios.get(id)
}

export async function getAudioByProviderAndAid(
  provider: AudioProvider,
  aid: string
): Promise<Audio | undefined> {
  return db.audios.where('[aid+provider]').equals([aid, provider]).first()
}

export async function getAudiosBySyncStatus(status: SyncStatus): Promise<Audio[]> {
  return db.audios.where('syncStatus').equals(status).toArray()
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

export async function getAudiosByProvider(provider: AudioProvider): Promise<Audio[]> {
  return db.audios.where('provider').equals(provider).toArray()
}

export async function getAudiosByLanguage(language: string): Promise<Audio[]> {
  return db.audios.where('language').equals(language).toArray()
}

export async function getAudiosByVoice(voice: string): Promise<Audio[]> {
  return db.audios.where('voice').equals(voice).toArray()
}

export async function getAllAudios(): Promise<Audio[]> {
  return db.audios.toArray()
}

// ============================================================================
// Type Guards
// ============================================================================

function isTTSAudioInput(input: AudioInput): input is TTSAudioInput {
  return input.provider === 'user' && 'sourceText' in input && 'voice' in input
}

// ============================================================================
// Mutation Operations
// ============================================================================

/**
 * Save audio to database
 * For TTS audio (with sourceText, voice, and blob), aid is generated from blob hash
 * For platform audio, aid is provided in input
 */
export async function saveAudio(input: AudioInput): Promise<string> {
  const now = new Date().toISOString()

  let id: string
  let aid: string

  if (isTTSAudioInput(input)) {
    // TTS audio: aid is the hash of the blob
    if (!input.blob) {
      throw new Error('TTS audio must have a blob')
    }
    aid = await generateTTSAudioAid(input.blob)
    id = generateAudioId('user', aid)
  } else {
    id = generateAudioId(input.provider, input.aid)
    aid = input.aid
  }

  const existing = await db.audios.get(id)
  if (existing) {
    await db.audios.update(id, {
      ...input,
      aid,
      updatedAt: now,
    })
    return id
  }

  const audio: Audio = {
    ...input,
    id,
    aid,
    createdAt: now,
    updatedAt: now,
  } as Audio
  await db.audios.put(audio)
  return id
}

/**
 * Save local audio file to database
 * aid is the hash of the blob, provider is 'user'
 */
export async function saveLocalAudio(
  blob: Blob,
  input: Omit<PlatformAudioInput, 'aid' | 'provider'>
): Promise<string> {
  const now = new Date().toISOString()
  const aid = await generateLocalAudioAid(blob)
  const id = generateAudioId('user', aid)

  const existing = await db.audios.get(id)
  if (existing) {
    await db.audios.update(id, {
      ...input,
      blob,
      updatedAt: now,
    })
    return id
  }

  const audio: Audio = {
    ...input,
    id,
    aid,
    provider: 'user',
    blob,
    createdAt: now,
    updatedAt: now,
  }
  await db.audios.put(audio)
  return id
}

export async function updateAudio(
  id: string,
  updates: Partial<Omit<Audio, 'id' | 'createdAt'>>
): Promise<void> {
  const now = new Date().toISOString()
  await db.audios.update(id, {
    ...updates,
    updatedAt: now,
  })
}

export async function deleteAudio(id: string): Promise<void> {
  await db.audios.delete(id)
}

// ============================================================================
// Repository Object (Alternative API)
// ============================================================================

export const audioRepository = {
  // Queries
  getById: getAudioById,
  getByProviderAndAid: getAudioByProviderAndAid,
  getBySyncStatus: getAudiosBySyncStatus,
  getStarred: getStarredAudios,
  getByTranslationKey: getAudioByTranslationKey,
  getAllByTranslationKey: getAudiosByTranslationKey,
  getByProvider: getAudiosByProvider,
  getByLanguage: getAudiosByLanguage,
  getByVoice: getAudiosByVoice,
  getAll: getAllAudios,
  // Mutations
  save: saveAudio,
  saveLocal: saveLocalAudio,
  update: updateAudio,
  delete: deleteAudio,
}

// Re-export types for convenience
export type { TTSAudioInput, PlatformAudioInput, AudioInput }

