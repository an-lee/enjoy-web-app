# Data Models

This document defines the data structures for both the Backend (PostgreSQL) and the Client (IndexedDB).

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

The local database mirrors the remote schema but includes synchronization flags and handles large binary blobs.

### Core Entities

```typescript
// db/schema.ts

// Video content
interface Video {
  id: string; // UUID (see ID Generation Strategy below)
  title: string;
  provider: 'youtube' | 'netflix' | 'local_upload' | 'other';
  language: string;
  duration: number; // seconds
  blob?: Blob; // Video blob for offline access
  syncStatus?: 'local' | 'synced' | 'pending';
  createdAt: number;
  updatedAt: number;
}

// Audio content
interface Audio {
  id: string; // UUID (see ID Generation Strategy below)
  title: string;
  provider: 'youtube' | 'netflix' | 'local_upload' | 'other';
  language: string;
  duration: number; // seconds
  blob?: Blob; // Audio blob for offline access
  translationKey?: string; // Reference to Translation.id (for TTS audio)
  sourceText?: string; // Original text (for TTS audio)
  voice?: string; // Voice identifier (for TTS audio)
  syncStatus?: 'local' | 'synced' | 'pending';
  createdAt: number;
  updatedAt: number;
}

// Transcript for video or audio
interface Transcript {
  id: string; // UUID (see ID Generation Strategy below)
  vid?: string; // Video.id (UUID)
  aid?: string; // Audio.id (UUID)
  language?: string;
  timeline: TranscriptLine[];
  syncStatus?: 'local' | 'synced' | 'pending';
  createdAt?: number;
  updatedAt?: number;
}

// User Echo - Practice session
interface UserEcho {
  id: string; // UUID (see ID Generation Strategy below)
  userId: number;
  vid?: string; // Video.id (UUID)
  aid?: string; // Audio.id (UUID)
  status?: 'in_progress' | 'completed' | 'paused';
  syncStatus?: 'local' | 'synced' | 'pending';
  createdAt: number;
  updatedAt: number;
}

// User Recording
interface Recording {
  id: string; // UUID (see ID Generation Strategy below)
  echoId?: string; // Reference to UserEcho.id (UUID)
  userId: number;
  vid?: string; // Video.id (UUID)
  aid?: string; // Audio.id (UUID)
  blob?: Blob; // Audio blob for offline access
  syncStatus?: 'local' | 'synced' | 'pending';
  createdAt: number;
  updatedAt?: number;
}

// Translation
interface Translation {
  id: string; // UUID (see ID Generation Strategy below)
  sourceText: string;
  sourceLanguage: string;
  targetLanguage: string;
  translatedText: string;
  style: TranslationStyle;
  customPrompt?: string;
  syncStatus?: 'local' | 'synced' | 'pending';
  createdAt: number;
  updatedAt: number;
}

// Dictionary Cache
interface CachedDefinition {
  id: string; // UUID (see ID Generation Strategy below)
  word: string;
  languagePair: string; // e.g., 'en:zh'
  data: unknown; // JSON data
  expiresAt: number;
  createdAt: number;
  updatedAt: number;
}
```

## 3. UUID ID Generation Strategy

**All entities use UUID v5 (deterministic UUIDs) to ensure consistency across devices and servers.** This eliminates the need for separate `serverId` fields and simplifies synchronization.

### Implementation

ID generation functions are located in `src/db/id-generator.ts`. All functions use UUID v5 with a fixed namespace to ensure deterministic generation.

### ID Generation Rules

#### Video

- **Third-party videos** (YouTube, Netflix, etc.): `uuid5(vid + provider)`
  - Example: YouTube video `LBiF4-GoMLE` → `uuid5("LBiF4-GoMLE:youtube", namespace)`
- **Local uploads**: `uuid5(hash(fileBlob))`
  - Uses SHA-256 hash of the file blob

#### Audio

- **Third-party audio**: `uuid5(aid + provider)`
- **TTS-generated from translation**: `uuid5(translationId + voice)`
- **TTS-generated (no translation)**: `uuid5(hash(blob) + voice)`
- **Local uploads**: `uuid5(hash(fileBlob))`

#### UserEcho

- `uuid5(videoId/audioId + userId)`
- Ensures one echo session per user per media item

#### Recording

- `uuid5(hash(recordingBlob) + userId + referenceOffset)` or
- `uuid5(echoId + referenceOffset + hash(recordingBlob))`
- Ensures uniqueness even for multiple recordings of the same text

#### Transcript

- `uuid5(videoId/audioId + language)`
- Ensures one transcript per language per media item

#### Translation

- `uuid5(sourceText + targetLanguage + style + customPrompt?)`
- Same translation parameters always generate the same ID (enables caching/reuse)

#### CachedDefinition

- `uuid5(word + languagePair)`
- Also uses composite key `[word, languagePair]` for efficient lookups

### Benefits

1. **Unified ID System**: Same ID used locally and on server, eliminating `serverId` mapping
2. **Deterministic**: Same inputs always produce the same UUID, ensuring consistency
3. **Simplified Sync**: No need to map local IDs to server IDs during synchronization
4. **Cross-Device Consistency**: Same content generates the same ID on different devices

## 4. Synchronization Strategy

### Initial Phase: One-way Backup

1. User creates data (imports material, records audio) -> Saved to `IndexedDB` with `syncStatus: 'local'`.
2. Background worker detects `syncStatus: 'local'` or `'pending'`.
3. Uploads to API using the same UUID as the local ID.
4. On success, sets `syncStatus: 'synced'`.

**Key Points**:

- **No ID Mapping Required**: Since local and server use the same UUID, no `serverId` field is needed.
- **Idempotent Operations**: Same content always generates the same ID, making sync operations safe to retry.
- **Large Files**: Video/audio blobs might not be synced for free users or may be strictly local to save bandwidth, while metadata (progress, vocabulary) is always synced.

### Sync Status Flow

```text
local → pending → synced
  ↑        ↓
  └────────┘ (retry on failure)
```

- **local**: Created locally, not yet attempted to sync
- **pending**: Sync attempt in progress or failed (will retry)
- **synced**: Successfully synced with server
