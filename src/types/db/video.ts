/**
 * Video entity types
 */

import type { SyncableEntity, VideoProvider, Level } from './common'

// ============================================================================
// Core Entity
// ============================================================================

/**
 * Video content
 * ID generation: UUID v5 with `video:${provider}:${vid}`
 */
export interface Video extends SyncableEntity {
  id: string // UUID v5
  vid: string // Platform video ID (e.g., YouTube: "dQw4w9WgXcQ")
  provider: VideoProvider
  title: string
  description?: string
  thumbnailUrl?: string
  duration: number // seconds
  language: string // BCP 47
  season?: number
  episode?: number
  createdAt: string // ISO 8601
  updatedAt: string // ISO 8601
  // Local-only extensions
  level?: Level
  starred?: boolean
  summary?: string
  blob?: Blob
  mediaBlobKey?: string
  thumbnailBlobKey?: string
}

// ============================================================================
// Store Input Types
// ============================================================================

/**
 * Input type for creating/updating Video
 */
export type VideoInput = Omit<Video, 'id' | 'createdAt' | 'updatedAt'> & {
  vid: string
}

