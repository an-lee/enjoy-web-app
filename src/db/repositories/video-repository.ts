/**
 * Video Repository - Database operations for Video entity
 */

import { db } from '../schema'
import { generateVideoId, generateLocalVideoVid } from '../id-generator'
import { queueVideoSync } from '../utils/auto-sync'
import type { Video, VideoProvider, SyncStatus, VideoInput } from '@/types/db'

// Ensure provider defaults to 'user'
function ensureUserProvider(input: VideoInput): VideoInput {
  return {
    ...input,
    provider: input.provider || 'user',
  }
}

// ============================================================================
// Query Operations
// ============================================================================

export async function getVideoById(id: string): Promise<Video | undefined> {
  return db.videos.get(id)
}

export async function getVideoByProviderAndVid(
  provider: VideoProvider,
  vid: string
): Promise<Video | undefined> {
  return db.videos.where('[vid+provider]').equals([vid, provider]).first()
}

export async function getVideosBySyncStatus(status: SyncStatus): Promise<Video[]> {
  return db.videos.where('syncStatus').equals(status).toArray()
}


export async function getVideosByProvider(provider: VideoProvider): Promise<Video[]> {
  return db.videos.where('provider').equals(provider).toArray()
}

export async function getVideosByLanguage(language: string): Promise<Video[]> {
  return db.videos.where('language').equals(language).toArray()
}

export async function getAllVideos(): Promise<Video[]> {
  return db.videos.toArray()
}

// ============================================================================
// Mutation Operations
// ============================================================================

export async function saveVideo(input: VideoInput): Promise<string> {
  const now = new Date().toISOString()
  const normalizedInput = ensureUserProvider(input)
  const id = generateVideoId(normalizedInput.provider, normalizedInput.vid)

  const existing = await db.videos.get(id)
  if (existing) {
    await db.videos.update(id, {
      ...normalizedInput,
      updatedAt: now,
    })
    // Queue for sync if not already synced
    await queueVideoSync(id, 'update', existing.syncStatus)
    return id
  }

  const video: Video = {
    ...normalizedInput,
    id,
    syncStatus: 'local', // New local entity
    createdAt: now,
    updatedAt: now,
  }
  await db.videos.put(video)
  // Queue for sync
  await queueVideoSync(id, 'create', 'local')
  return id
}

/**
 * Save local video file to database using fileHandle
 * vid is the hash of the file, provider is 'user'
 *
 * @param fileHandle - FileSystemFileHandle for the video file
 * @param input - Video metadata (without vid and provider)
 * @param source - Optional original URL if downloaded from web
 */
export async function saveLocalVideo(
  fileHandle: FileSystemFileHandle,
  input: Omit<VideoInput, 'vid' | 'provider' | 'fileHandle' | 'md5' | 'size'>,
  source?: string
): Promise<string> {
  const now = new Date().toISOString()

  // Get file to calculate hash and size
  const file = await fileHandle.getFile()
  const vid = await generateLocalVideoVid(file)
  const md5 = vid // md5 is same as vid (both are SHA-256 hash)
  const size = file.size
  const id = generateVideoId('user', vid)

  const existing = await db.videos.get(id)
  if (existing) {
    await db.videos.update(id, {
      ...input,
      fileHandle,
      md5,
      size,
      source: source || input.source,
      updatedAt: now,
    })
    // Queue for sync if not already synced
    await queueVideoSync(id, 'update', existing.syncStatus)
    return id
  }

  const video: Video = {
    ...input,
    id,
    vid,
    provider: 'user',
    fileHandle,
    md5,
    size,
    source: source || input.source,
    syncStatus: 'local', // New local entity
    createdAt: now,
    updatedAt: now,
  }
  await db.videos.put(video)
  // Queue for sync
  await queueVideoSync(id, 'create', 'local')
  return id
}

export async function updateVideo(
  id: string,
  updates: Partial<Omit<Video, 'id' | 'createdAt'>>
): Promise<void> {
  const now = new Date().toISOString()
  const existing = await db.videos.get(id)
  await db.videos.update(id, {
    ...updates,
    updatedAt: now,
  })
  // Queue for sync if not already synced (unless syncStatus is being explicitly set)
  if (!updates.syncStatus && existing) {
    await queueVideoSync(id, 'update', existing.syncStatus)
  }
}

export async function deleteVideo(id: string): Promise<void> {
  const existing = await db.videos.get(id)
  await db.videos.delete(id)
  // Queue for sync if was synced
  if (existing?.syncStatus === 'synced') {
    await queueVideoSync(id, 'delete', existing.syncStatus)
  }
}

// ============================================================================
// Repository Object (Alternative API)
// ============================================================================

export const videoRepository = {
  // Queries
  getById: getVideoById,
  getByProviderAndVid: getVideoByProviderAndVid,
  getBySyncStatus: getVideosBySyncStatus,
  getByProvider: getVideosByProvider,
  getByLanguage: getVideosByLanguage,
  getAll: getAllVideos,
  // Mutations
  save: saveVideo,
  saveLocal: saveLocalVideo,
  update: updateVideo,
  delete: deleteVideo,
}

