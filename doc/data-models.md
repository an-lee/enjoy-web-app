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

```typescript
// db/schema.ts

// Stores metadata for study materials
interface LocalMaterial {
  id: string; // UUID
  serverId?: string; // Links to backend ID if synced
  title: string;
  type: 'video' | 'audio';
  // Blobs are stored directly in IDB for offline access
  mediaBlobKey?: string;
  thumbnailBlobKey?: string;
  syncStatus: 'local' | 'synced' | 'pending';
  createdAt: number;
}

// Subtitles/Sentences
interface LocalSegment {
  id: string;
  materialId: string;
  startTime: number;
  endTime: number;
  text: string;
  translation?: string;
}

// User Recordings
interface LocalRecording {
  id: string;
  segmentId: string;
  blob: Blob;
  duration: number;
  syncStatus: 'pending' | 'synced'; // 'synced' implies uploaded to S3
}

// Dictionary Cache to reduce API calls
interface CachedDefinition {
  word: string;
  languagePair: string; // e.g., 'en:zh'
  data: JSON;
  expiresAt: number;
}
```

## 3. Synchronization Strategy

### Initial Phase: One-way Backup

1. User creates data (imports material, records audio) -> Saved to `IndexedDB` with `syncStatus: 'local'`.
2. Background worker detects `syncStatus: 'local'` or `'pending'`.
3. Uploads to API.
4. On success, updates `serverId` and sets `syncStatus: 'synced'`.

**Note**: Large media files (video/audio) might not be synced for free users or may be strictly local to save bandwidth, while metadata (progress, vocabulary) is always synced.
