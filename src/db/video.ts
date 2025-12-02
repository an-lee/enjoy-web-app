import { db } from './database'
import type { Video, SyncStatus } from './schema'

export async function getVideosBySyncStatus(
  status: SyncStatus
): Promise<Video[]> {
  return db.videos.where('syncStatus').equals(status).toArray()
}

export async function getVideoById(id: string): Promise<Video | undefined> {
  return db.videos.get(id)
}

export async function getStarredVideos(): Promise<Video[]> {
  return db.videos.where('starred').equals(1).toArray()
}

