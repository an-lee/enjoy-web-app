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
  UserAudioInput,
} from '@/types/db'

// Ensure provider defaults to 'user'
function ensureUserProvider(input: UserAudioInput): UserAudioInput {
  return {
    ...input,
    provider: input.provider || 'user',
  }
}

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
// Mutation Operations
// ============================================================================

/**
 * Save audio to database
 *
 * For user-uploaded audio: uses fileHandle (local files)
 *
 * Note: TTS audio should use saveTTSAudio() instead, which handles
 * the conversion from blob to fileHandle.
 */
export async function saveAudio(input: UserAudioInput): Promise<string> {
  const now = new Date().toISOString()
  const normalizedInput = ensureUserProvider(input) as UserAudioInput

  let id: string
  let aid: string
  let audioData: Partial<Audio>

  // User-uploaded audio: should have fileHandle or aid (from sync)
  if (!normalizedInput.fileHandle && !normalizedInput.aid) {
    throw new Error('User audio must have either fileHandle or aid')
  }

  if (normalizedInput.fileHandle) {
    // Calculate hash from fileHandle
    const file = await normalizedInput.fileHandle.getFile()
    aid = await generateLocalAudioAid(file)
    id = generateAudioId('user', aid)
    audioData = {
      ...normalizedInput,
      aid,
      md5: aid, // md5 is same as aid
      size: file.size,
    }
  } else {
    // aid provided (e.g., from sync) - metadata only
    id = generateAudioId('user', normalizedInput.aid)
    aid = normalizedInput.aid
    audioData = normalizedInput
  }

  const existing = await db.audios.get(id)
  if (existing) {
    await db.audios.update(id, {
      ...audioData,
      aid,
      updatedAt: now,
    })
    return id
  }

  const audio: Audio = {
    ...audioData,
    id,
    aid,
    provider: 'user',
    createdAt: now,
    updatedAt: now,
  } as Audio
  await db.audios.put(audio)
  return id
}

/**
 * Save TTS-generated audio
 *
 * Note: TTS audio is AI-generated from a blob. Since TTS audio is usually small
 * (< 1MB), we store it directly as blob in IndexedDB instead of using fileHandle.
 * This avoids requiring user interaction to save the file.
 *
 * @param input - TTS audio input with blob
 */
export async function saveTTSAudio(input: TTSAudioInput): Promise<string> {
  const now = new Date().toISOString()

  if (!input.blob) {
    throw new Error('TTS audio must have a blob')
  }

  // Calculate hash and metadata from the blob
  const aid = await generateTTSAudioAid(input.blob)
  const md5 = aid
  const size = input.blob.size
  const id = generateAudioId('user', aid)

  // Extract blob to store separately
  const { blob, ...rest } = input

  const existing = await db.audios.get(id)
  if (existing) {
    await db.audios.update(id, {
      ...rest,
      blob, // Store blob directly in IndexedDB for TTS audio
      md5,
      size,
      updatedAt: now,
    })
    return id
  }

  const audio: Audio = {
    ...rest,
    id,
    aid,
    provider: 'user',
    blob, // Store blob directly in IndexedDB for TTS audio
    md5,
    size,
    createdAt: now,
    updatedAt: now,
  }
  await db.audios.put(audio)
  return id
}

/**
 * Save local audio file to database using fileHandle
 * aid is the hash of the file, provider is 'user'
 *
 * @param fileHandle - FileSystemFileHandle for the audio file
 * @param input - Audio metadata (without aid, provider, fileHandle, md5, size)
 * @param source - Optional original URL if downloaded from web
 */
export async function saveLocalAudio(
  fileHandle: FileSystemFileHandle,
  input: Omit<UserAudioInput, 'aid' | 'provider' | 'fileHandle' | 'md5' | 'size'>,
  source?: string
): Promise<string> {
  const now = new Date().toISOString()

  // Get file to calculate hash and size
  const file = await fileHandle.getFile()
  const aid = await generateLocalAudioAid(file)
  const md5 = aid // md5 is same as aid (both are SHA-256 hash)
  const size = file.size
  const id = generateAudioId('user', aid)

  const existing = await db.audios.get(id)
  if (existing) {
    await db.audios.update(id, {
      ...input,
      fileHandle,
      md5,
      size,
      source: source || input.source,
      updatedAt: now,
    })
    return id
  }

  const audio: Audio = {
    ...input,
    id,
    aid,
    provider: 'user',
    fileHandle,
    md5,
    size,
    source: source || input.source,
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
  getByTranslationKey: getAudioByTranslationKey,
  getAllByTranslationKey: getAudiosByTranslationKey,
  getByProvider: getAudiosByProvider,
  getByLanguage: getAudiosByLanguage,
  getByVoice: getAudiosByVoice,
  getAll: getAllAudios,
  // Mutations
  save: saveAudio,
  saveLocal: saveLocalAudio,
  saveTTS: saveTTSAudio,
  update: updateAudio,
  delete: deleteAudio,
}

// Re-export types for convenience
export type { TTSAudioInput, UserAudioInput }

