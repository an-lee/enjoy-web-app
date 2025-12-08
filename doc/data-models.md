# Data Models

This document defines the data structures for both the Backend (PostgreSQL) and the Client (IndexedDB).

> **Note**: The local schema is aligned with the Enjoy browser extension schema specification ([SCHEMA_DESIGN.md](./SCHEMA_DESIGN.md)) to enable shared backend API compatibility.

## 1. Remote Schema (PostgreSQL)

### Users & Auth

- **users**: `id, email, password_digest, native_language`
- **subscriptions**: `id, user_id, plan (free/pro), status, stripe_ids`

### Content

- **materials**:
  - `id`: UUID
  - `user_id`: FK
  - `type`: 'video' | 'audio'
  - `source_type`: 'youtube' | 'netflix' | 'local_upload'
  - `metadata`: JSONB (thumbnails, external IDs)
  - `media_url`: S3 URL (for uploaded content)
- **segments**:
  - `id`: UUID
  - `material_id`: FK
  - `start_time`: Integer (ms)
  - `end_time`: Integer (ms)
  - `text`: Text
  - `translation`: Text
  - `origin`: 'original' | 'asr_cloud'

### Learning Data

- **learning_progress**: Tracks progress per material.
  - `last_segment_index`
  - `status`: 'in_progress' | 'completed'
- **recordings**: User audio files.
  - `id`, `segment_id`, `duration`, `cloud_url`
- **pronunciation_assessments**:
  - `recording_id`, `overall_score`, `word_results` (JSONB)

### Dictionary & Vocab

- **word_cores**: Global dictionary entries (shared).
  - `word`, `language`, `ipa`, `parts_of_speech`
- **vocabulary_items**: User specific word list.
  - `user_id`, `word_core_id`, `status` (new/learning/mastered), `next_review_at`

## 2. Local Schema (IndexedDB via Dexie.js)

The local database implements an offline-first architecture aligned with the Enjoy browser extension schema specification.

### Design Principles

| Principle | Description |
|-----------|-------------|
| Offline-first | Data is stored locally in IndexedDB first, then synced to server |
| Deterministic ID | Video/Audio/Transcript use UUID v5, ensuring same content generates same ID |
| Time Units | Timeline uses milliseconds (integer); Video/Audio.duration uses seconds; timestamps use ISO 8601 |
| Language Codes | Use BCP 47 format (e.g., `en`, `zh-TW`) |
| Polymorphic Association | Recording/Dictation/Transcript associate with Video/Audio via `targetType` + `targetId` |

### Core Entities (Synced with Server)

```typescript
// src/db/schema.ts

type VideoProvider = 'youtube' | 'netflix'
type AudioProvider = 'youtube' | 'spotify' | 'podcast' | 'tts' | 'local_upload'
type TranscriptSource = 'official' | 'auto' | 'ai' | 'user'
type TargetType = 'Video' | 'Audio'
type SyncStatus = 'local' | 'synced' | 'pending'

// Base interface for syncable entities
interface SyncableEntity {
  syncStatus?: SyncStatus
  serverUpdatedAt?: string // ISO 8601 - server version timestamp
}

// Video content
// ID generation: UUID v5 with `video:${provider}:${vid}`
interface Video extends SyncableEntity {
  id: string           // UUID v5
  vid: string          // Platform video ID (e.g., YouTube: "dQw4w9WgXcQ")
  provider: VideoProvider
  title: string
  description?: string
  thumbnailUrl?: string
  duration: number     // seconds
  language: string     // BCP 47 (e.g., 'en', 'zh-TW')
  season?: number      // for TV series
  episode?: number     // for TV series
  createdAt: string    // ISO 8601
  updatedAt: string    // ISO 8601
  // Local-only extensions
  level?: Level
  starred?: boolean
  summary?: string
  blob?: Blob          // Video blob for offline access
}

// Audio content (follows same design as Video)
// ID generation: UUID v5 with `audio:${provider}:${aid}`
interface Audio extends SyncableEntity {
  id: string           // UUID v5
  aid: string          // Platform audio ID or unique identifier
  provider: AudioProvider
  title: string
  description?: string
  thumbnailUrl?: string
  duration: number     // seconds
  language: string     // BCP 47
  createdAt: string    // ISO 8601
  updatedAt: string    // ISO 8601
  // Local-only extensions
  level?: Level
  starred?: boolean
  summary?: string
  // TTS-specific fields (for provider: 'tts')
  translationKey?: string  // Reference to Translation.id
  sourceText?: string      // Original text synthesized
  voice?: string           // Voice identifier used
  blob?: Blob              // Audio blob for offline access
}

// Transcript for video or audio
// ID generation: UUID v5 with `transcript:${targetType}:${targetId}:${language}:${source}`
// Track ID Convention: `${language}:${source}` (e.g., `en:official`, `zh-TW:ai`)
interface Transcript extends SyncableEntity {
  id: string                // UUID v5
  targetType: TargetType    // 'Video' | 'Audio'
  targetId: string          // Video.id or Audio.id
  language: string          // BCP 47
  source: TranscriptSource  // 'official' | 'auto' | 'ai' | 'user'
  timeline: TranscriptLine[]
  referenceId?: string      // Source transcript ID for translations
  createdAt: string         // ISO 8601
  updatedAt: string         // ISO 8601
}

interface TranscriptLine {
  text: string
  start: number        // milliseconds
  duration: number     // milliseconds
  timeline?: TranscriptLine[]  // nested: Line → Word → Phoneme
  confidence?: number  // 0-1
}

// User Recording for pronunciation practice
// ID generation: UUID v4 (random)
interface Recording extends SyncableEntity {
  id: string           // UUID v4
  targetType: TargetType
  targetId: string     // Video.id or Audio.id
  referenceStart: number     // milliseconds
  referenceDuration: number  // milliseconds
  referenceText: string
  language: string     // BCP 47
  duration: number     // actual recording duration (milliseconds)
  md5?: string         // audio file MD5
  audioUrl?: string    // synced audio URL (CDN)
  pronunciationScore?: number  // 0-100
  assessment?: PronunciationAssessmentResult
  createdAt: string    // ISO 8601
  updatedAt: string    // ISO 8601
  // Local-only
  blob?: Blob          // Audio blob for offline access
}

// User Dictation for listening practice
// ID generation: UUID v4 (random)
interface Dictation extends SyncableEntity {
  id: string           // UUID v4
  targetType: TargetType
  targetId: string     // Video.id or Audio.id
  referenceStart: number     // milliseconds
  referenceDuration: number  // milliseconds
  referenceText: string
  language: string     // BCP 47
  userInput: string
  accuracy: number     // 0-100
  correctWords: number
  missedWords: number
  extraWords: number
  createdAt: string    // ISO 8601
  updatedAt: string    // ISO 8601
}
```

### Local-Only Entities (Not Synced)

```typescript
// User Echo - Practice session (local tracking)
// ID generation: UUID v5 with `echo:${targetType}:${targetId}:${userId}`
interface UserEcho {
  id: string
  userId: number
  targetType: TargetType
  targetId: string
  currentSegmentIndex?: number
  totalSegments?: number
  status?: 'in_progress' | 'completed' | 'paused'
  totalPracticeTime?: number  // milliseconds
  averageScore?: number
  lastPracticedAt?: string    // ISO 8601
  syncStatus?: SyncStatus
  createdAt: string           // ISO 8601
  updatedAt: string           // ISO 8601
}

// Translation - AI-generated translation
// ID generation: UUID v5 with `translation:${sourceText}:${targetLanguage}:${style}:${customPrompt}`
interface Translation {
  id: string
  sourceText: string
  sourceLanguage: string
  targetLanguage: string
  translatedText: string
  style: TranslationStyle
  customPrompt?: string
  aiModel?: string
  syncStatus?: SyncStatus
  createdAt: string           // ISO 8601
  updatedAt: string           // ISO 8601
}

// Dictionary Cache
// ID generation: UUID v5 with `cache:${word}:${languagePair}`
interface CachedDefinition {
  id: string
  word: string
  languagePair: string  // e.g., 'en:zh'
  data: unknown
  expiresAt: number     // timestamp (milliseconds)
  syncStatus?: SyncStatus
  createdAt: string     // ISO 8601
  updatedAt: string     // ISO 8601
}
```

## 3. UUID ID Generation Strategy

**All entities use UUID v5 (deterministic) or UUID v4 (random) as specified in the schema design.**

- **Namespace**: `6ba7b811-9dad-11d1-80b4-00c04fd430c8` (RFC 4122 URL namespace)
- **Implementation**: `src/db/id-generator.ts`

### ID Generation Rules

| Entity | ID Type | Generation Rule |
|--------|---------|-----------------|
| Video | UUID v5 | `video:${provider}:${vid}` |
| Audio | UUID v5 | `audio:${provider}:${aid}` (or `audio:tts:${sourceText}:${voice}` for TTS) |
| Transcript | UUID v5 | `transcript:${targetType}:${targetId}:${language}:${source}` |
| Recording | UUID v4 | Random |
| Dictation | UUID v4 | Random |
| UserEcho | UUID v5 | `echo:${targetType}:${targetId}:${userId}` |
| Translation | UUID v5 | `translation:${sourceText}:${targetLanguage}:${style}:${customPrompt}` |
| CachedDefinition | UUID v5 | `cache:${word}:${languagePair}` |

### Benefits

1. **Unified ID System**: Same ID used locally and on server
2. **Deterministic**: Same inputs always produce the same UUID (for UUID v5)
3. **Cross-Platform**: Consistent with browser extension schema
4. **Simplified Sync**: No need to map local IDs to server IDs

## 4. Synchronization Strategy

### Sync Queue

Local changes are queued first, then batch-synced to server:

```typescript
interface SyncQueueItem {
  id: number                // auto-increment
  entityType: 'video' | 'transcript' | 'recording' | 'dictation'
  entityId: string          // UUID
  action: 'create' | 'update' | 'delete'
  payload?: unknown
  retryCount: number
  lastAttempt?: string      // ISO 8601
  error?: string
  createdAt: string         // ISO 8601
}
```

### Sync Status Flow

```text
local → pending → synced
  ↑        ↓
  └────────┘ (retry on failure)
```

- **local**: Created locally, not yet attempted to sync
- **pending**: Sync attempt in progress or failed (will retry)
- **synced**: Successfully synced with server

### API Endpoints

See [SCHEMA_DESIGN.md](./SCHEMA_DESIGN.md) for the complete Sync API specification including:

- `POST /api/v1/sync` - Batch sync endpoint
- `POST /api/v1/recordings/:id/audio` - Upload recording audio
- `GET /api/v1/videos/:id/transcripts` - Get server transcripts

## 5. Related Files

| File | Description |
|------|-------------|
| `src/db/schema.ts` | TypeScript type definitions |
| `src/db/database.ts` | Dexie.js database configuration |
| `src/db/id-generator.ts` | UUID generation utilities |
| `src/db/*.ts` | Entity-specific helper functions |
| `doc/SCHEMA_DESIGN.md` | Browser extension schema specification |
