// Database schema types for IndexedDB

export type VideoProvider = 'youtube' | 'netflix' | 'local_upload' | 'other'
export type Level = 'beginner' | 'intermediate' | 'advanced'
export type SyncStatus = 'local' | 'synced' | 'pending'
export type TranslationStyle =
  | 'literal' // Word-for-word translation
  | 'natural' // Natural, fluent translation
  | 'casual' // Casual, conversational style
  | 'formal' // Formal, professional style
  | 'simplified' // Simplified for learners
  | 'detailed' // Detailed with explanations
  | 'custom' // Custom style with user-defined prompt

/**
 * Transcript line with timing information
 */
export interface TranscriptLine {
  text: string
  offset: number // milliseconds
  duration: number // milliseconds
  timeline?: TranscriptLine[] // nested word-level timing
}

/**
 * Complete transcript for a video or audio
 */
export interface Transcript {
  id: string // local unique ID
  vid?: string // Video.vid (provider-specific ID, available locally)
  aid?: string // Audio.aid (provider-specific ID, available locally)
  // Note: Either vid or aid must be set, but not both
  language?: string
  referenceId?: number // If exists, this is a translation of the reference transcript
  timeline: TranscriptLine[]
  // local storage
  syncStatus?: SyncStatus
  serverId?: number // Links to backend ID if synced
  createdAt?: number
  updatedAt?: number
}

/**
 * Video content
 */
export interface Video {
  id: string // Provider-specific video ID (used as vid for association)
  title: string
  description?: string
  thumbnailUrl?: string
  duration: number // seconds
  language: string
  provider: VideoProvider
  season?: number
  episode?: number
  level?: Level
  starred?: boolean
  summary?: string
  // Local storage
  mediaBlobKey?: string // Blob key for offline access
  thumbnailBlobKey?: string
  syncStatus?: SyncStatus
  serverId?: string // Links to backend ID if synced
  createdAt: number
  updatedAt: number
}

/**
 * Audio content
 */
export interface Audio {
  id: string // Provider-specific audio ID (used as aid for association)
  title: string
  description?: string
  thumbnailUrl?: string
  duration: number // seconds
  language: string
  provider: VideoProvider // Reuse VideoProvider for audio sources
  level?: Level
  starred?: boolean
  summary?: string
  // Local storage
  mediaBlobKey?: string // Blob key for offline access
  thumbnailBlobKey?: string
  syncStatus?: SyncStatus
  serverId?: string // Links to backend ID if synced
  createdAt: number
  updatedAt: number
}

/**
 * User Echo - Practice session for a Video or Audio
 * Acts as an intermediate table between Video/Audio and Recording
 */
export interface UserEcho {
  id: string // local unique ID
  userId: number
  vid?: string // Video.vid (provider-specific ID, available locally)
  aid?: string // Audio.aid (provider-specific ID, available locally)
  // Note: Either vid or aid must be set, but not both
  // Practice progress
  currentSegmentIndex?: number // Current segment being practiced
  totalSegments?: number // Total number of segments
  status?: 'in_progress' | 'completed' | 'paused'
  // Practice statistics
  totalPracticeTime?: number // Total practice time in milliseconds
  averageScore?: number // Average pronunciation score
  lastPracticedAt?: number // Timestamp of last practice
  // Local storage
  syncStatus?: SyncStatus
  serverId?: number // Links to backend ID if synced
  createdAt: number
  updatedAt: number
}

/**
 * User Recording
 */
export interface Recording {
  id: string // local unique ID
  echoId?: string // Reference to UserEcho.id (optional for backward compatibility)
  duration: number // milliseconds
  userId: number
  vid?: string // Video.vid (provider-specific ID, available locally)
  aid?: string // Audio.aid (provider-specific ID, available locally)
  // Note: Either vid or aid must be set, but not both
  referenceText?: string
  referenceOffset?: number // milliseconds
  referenceDuration?: number // milliseconds
  pronunciationScore?: number
  audioUrl?: string
  assessmentUrl?: string
  // Local storage
  blob?: Blob // Audio blob for offline access
  syncStatus?: SyncStatus
  serverId?: number // Links to backend ID if synced
  createdAt: number
  updatedAt?: number
}

/**
 * Translation - AI-generated translation of a single text segment
 * Independent of videos/audios, users can translate any text
 * Supports custom translation styles via custom prompts
 * Note: If user generates TTS audio, a new Audio record will be created
 * with aid generated from translation (e.g., hash of translation id or content)
 */
export interface Translation {
  id: string // local unique ID
  // Source text
  sourceText: string // Original text to translate
  sourceLanguage: string // Source language code (e.g., 'en', 'ja')
  // Translation
  targetLanguage: string // Target language code (e.g., 'zh', 'ja', 'es')
  translatedText: string // Translated text
  style: TranslationStyle // Translation style
  customPrompt?: string // Custom prompt for AI translation (used when style is 'custom')
  aiModel?: string // AI model used for translation (e.g., 'gpt-4', 'claude-3')
  // Local storage
  syncStatus?: SyncStatus
  serverId?: number // Links to backend ID if synced
  createdAt: number
  updatedAt: number
}

/**
 * Dictionary Cache to reduce API calls
 */
export interface CachedDefinition {
  id: string // local unique ID
  word: string
  languagePair: string // e.g., 'en:zh'
  data: unknown // JSON data
  expiresAt: number // timestamp
  // local storage
  syncStatus?: SyncStatus
  serverId?: number // Links to backend ID if synced
  createdAt: number
  updatedAt: number
}