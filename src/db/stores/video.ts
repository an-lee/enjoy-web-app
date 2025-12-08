/**
 * Video Store - Database operations for Video entity
 */

import { db } from '../schema'
import { generateVideoId, generateLocalVideoId } from '../id-generator'
import type { Video, VideoProvider, SyncStatus, VideoInput } from '@/types/db'

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

export async function getStarredVideos(): Promise<Video[]> {
  return db.videos.where('starred').equals(1).toArray()
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
  const id = generateVideoId(input.provider, input.vid)

  const existing = await db.videos.get(id)
  if (existing) {
    await db.videos.update(id, {
      ...input,
      updatedAt: now,
    })
    return id
  }

  const video: Video = {
    ...input,
    id,
    createdAt: now,
    updatedAt: now,
  }
  await db.videos.put(video)
  return id
}

export async function saveLocalVideo(
  blob: Blob,
  input: Omit<VideoInput, 'vid' | 'provider'>
): Promise<string> {
  const now = new Date().toISOString()
  const id = await generateLocalVideoId(blob)

  const existing = await db.videos.get(id)
  if (existing) {
    await db.videos.update(id, {
      ...input,
      blob,
      updatedAt: now,
    })
    return id
  }

  const video: Video = {
    ...input,
    id,
    vid: id,
    provider: 'youtube', // Default, local videos use hash as vid
    blob,
    createdAt: now,
    updatedAt: now,
  } as Video
  await db.videos.put(video)
  return id
}

export async function updateVideo(
  id: string,
  updates: Partial<Omit<Video, 'id' | 'createdAt'>>
): Promise<void> {
  const now = new Date().toISOString()
  await db.videos.update(id, {
    ...updates,
    updatedAt: now,
  })
}

export async function deleteVideo(id: string): Promise<void> {
  await db.videos.delete(id)
}

// ============================================================================
// Store Object (Alternative API)
// ============================================================================

export const videoStore = {
  // Queries
  getById: getVideoById,
  getByProviderAndVid: getVideoByProviderAndVid,
  getBySyncStatus: getVideosBySyncStatus,
  getStarred: getStarredVideos,
  getByProvider: getVideosByProvider,
  getByLanguage: getVideosByLanguage,
  getAll: getAllVideos,
  // Mutations
  save: saveVideo,
  saveLocal: saveLocalVideo,
  update: updateVideo,
  delete: deleteVideo,
}

