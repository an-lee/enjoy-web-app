/**
 * Player Stores - Unified exports
 *
 * All player-related stores are organized here.
 * Use individual stores for better performance and separation of concerns.
 */

// Individual stores
export { usePlayerUIStore } from './player-ui-store'
export { usePlayerSessionStore } from './player-session-store'
export { usePlayerSettingsStore } from './player-settings-store'
export { usePlayerEchoStore } from './player-echo-store'
export { usePlayerTranscriptionStore } from './player-transcription-store'
export { usePlayerRecordingStore } from './player-recording-store'

// Types
export type { PlayerMode, PlaybackSession } from './types'
