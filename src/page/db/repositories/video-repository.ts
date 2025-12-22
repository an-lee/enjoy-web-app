/**
 * Video Repository - Database operations for Video entity
 */

import { getCurrentDatabase } from '../schema'
import { generateVideoId, generateLocalVideoVid } from '../id-generator'
import { queueVideoSync } from '../utils/auto-sync'
import type { Video, VideoProvider, SyncStatus, VideoInput } from '@/page/types/db'

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
  return getCurrentDatabase().videos.get(id)
}

export async function getVideoByProviderAndVid(
  provider: VideoProvider,
  vid: string
): Promise<Video | undefined> {
  return getCurrentDatabase().videos.where('[vid+provider]').equals([vid, provider]).first()
}

export async function getVideosBySyncStatus(status: SyncStatus): Promise<Video[]> {
  return getCurrentDatabase().videos.where('syncStatus').equals(status).toArray()
}


export async function getVideosByProvider(provider: VideoProvider): Promise<Video[]> {
  return getCurrentDatabase().videos.where('provider').equals(provider).toArray()
}

export async function getVideosByLanguage(language: string): Promise<Video[]> {
  return getCurrentDatabase().videos.where('language').equals(language).toArray()
}

export async function getAllVideos(): Promise<Video[]> {
  return getCurrentDatabase().videos.toArray()
}

// ============================================================================
// Mutation Operations
// ============================================================================

/**
 * Save video from server (download sync)
 * Uses the id from server directly, no generation needed
 */
export async function saveVideoFromServer(input: Video): Promise<string> {
  const now = new Date().toISOString()

  // Server video should have id, vid, and syncStatus
  if (!input.id) {
    throw new Error('Server video must have id')
  }
  if (!input.vid) {
    throw new Error('Server video must have vid')
  }

  const existing = await getCurrentDatabase().videos.get(input.id)
  if (existing) {
    // Update existing video
    await getCurrentDatabase().videos.update(input.id, {
      ...input,
      updatedAt: now,
      // Don't overwrite local-only fields
      fileHandle: existing.fileHandle,
    })
    return input.id
  }

  // Create new video from server
  const video: Video = {
    ...input,
    syncStatus: input.syncStatus || 'synced',
    createdAt: input.createdAt || now,
    updatedAt: input.updatedAt || now,
  }
  await getCurrentDatabase().videos.put(video)
  return input.id
}

export async function saveVideo(input: VideoInput): Promise<string> {
  const now = new Date().toISOString()
  const normalizedInput = ensureUserProvider(input)
  const id = generateVideoId(normalizedInput.provider, normalizedInput.vid)

  const existing = await getCurrentDatabase().videos.get(id)
  if (existing) {
    await getCurrentDatabase().videos.update(id, {
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
  await getCurrentDatabase().videos.put(video)
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
 * @param file - Optional File object to avoid multiple getFile() calls
 */
export async function saveLocalVideo(
  fileHandle: FileSystemFileHandle,
  input: Omit<VideoInput, 'vid' | 'provider' | 'fileHandle' | 'md5' | 'size'>,
  source?: string,
  file?: File
): Promise<string> {
  const now = new Date().toISOString()

  // Get file to calculate hash and size (use provided file if available to avoid multiple getFile() calls)
  const fileObj = file || await fileHandle.getFile()
  const vid = await generateLocalVideoVid(fileObj)
  const md5 = vid // md5 is same as vid (both are SHA-256 hash)
  const size = fileObj.size
  const id = generateVideoId('user', vid)

  const existing = await getCurrentDatabase().videos.get(id)
  if (existing) {
    await getCurrentDatabase().videos.update(id, {
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
  await getCurrentDatabase().videos.put(video)
  // Queue for sync
  await queueVideoSync(id, 'create', 'local')
  return id
}

export async function updateVideo(
  id: string,
  updates: Partial<Omit<Video, 'id' | 'createdAt'>>
): Promise<void> {
  const now = new Date().toISOString()
  const existing = await getCurrentDatabase().videos.get(id)
  await getCurrentDatabase().videos.update(id, {
    ...updates,
    updatedAt: now,
  })
  // Queue for sync if not already synced (unless syncStatus is being explicitly set)
  if (!updates.syncStatus && existing) {
    await queueVideoSync(id, 'update', existing.syncStatus)
  }
}

export async function deleteVideo(id: string): Promise<void> {
  const existing = await getCurrentDatabase().videos.get(id)
  await getCurrentDatabase().videos.delete(id)
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
  saveFromServer: saveVideoFromServer,
  saveLocal: saveLocalVideo,
  update: updateVideo,
  delete: deleteVideo,
}

