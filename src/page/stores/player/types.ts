/**
 * Shared types for player stores
 */

/**
 * Player mode: mini (bar) or expanded (full)
 */
export type PlayerMode = 'mini' | 'expanded'

/**
 * Playback session - represents a media being played
 * This is a lightweight in-memory representation
 * Full state is persisted in EchoSession database
 */
export interface PlaybackSession {
  // Media info
  mediaId: string
  mediaType: 'audio' | 'video'
  mediaTitle: string
  thumbnailUrl?: string
  duration: number // seconds

  // Progress
  currentTime: number // seconds
  currentSegmentIndex: number

  // Metadata
  language: string
  transcriptId?: string

  // Timestamps
  startedAt: string // ISO 8601
  lastActiveAt: string // ISO 8601
}
