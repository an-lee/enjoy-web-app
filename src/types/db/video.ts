/**
 * Video entity types
 */

import type { SyncableEntity, VideoProvider } from './common'

// ============================================================================
// Core Entity
// ============================================================================

/**
 * Video content
 *
 * In this project, all videos are user-uploaded (provider is always 'user').
 * Videos can be added from local files or downloaded from URLs.
 *
 * ID generation: UUID v5 with `video:user:${vid}`
 * - vid is SHA-256 hash of the video file
 */
export interface Video extends SyncableEntity {
  id: string // UUID v5 (generated from provider='user' + vid)
  vid: string // SHA-256 hash of the video file (used as vid with provider 'user')
  provider: VideoProvider // Always 'user' in this project (kept for backend compatibility)
  title: string
  description?: string
  thumbnailUrl?: string
  duration: number // seconds
  language: string // BCP 47
  createdAt: string // ISO 8601
  updatedAt: string // ISO 8601

  // Original source (if added from URL)
  source?: string // ✅ 可同步 - Original URL if downloaded from web

  // Local file storage - always use fileHandle stored in IndexedDB
  fileHandle?: FileSystemFileHandle // ❌ 本地 - Stored in IndexedDB, not serializable

  // File verification (synced for cross-device verification)
  md5?: string // ✅ 可同步 - File hash (SHA-256, same as vid)
  size?: number // ✅ 可同步 - File size in bytes

  // Server storage (optional, for small files or user preference)
  mediaUrl?: string // ✅ 可同步 - Server URL if file is uploaded (optional)
}

// ============================================================================
// Store Input Types
// ============================================================================

/**
 * Input type for creating/updating Video
 */
export type VideoInput = Omit<Video, 'id' | 'createdAt' | 'updatedAt'> & {
  vid: string // File hash (SHA-256)
  provider?: VideoProvider // Optional, defaults to 'user'
}

