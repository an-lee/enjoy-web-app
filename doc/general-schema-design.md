# Enjoy Data Schema Design

**Last reviewed:** December 8, 2025

> This document defines the data schema specification for Enjoy project, applicable to both the browser extension and web application. Both platforms use the same offline-first IndexedDB architecture.

## Table of Contents

1. [Design Principles](#design-principles)
2. [ID Generation Rules](#id-generation-rules)
3. [Core Entities](#core-entities)
4. [Sync API](#sync-api)

---

## Design Principles

| Principle | Description |
|-----------|-------------|
| Offline-first | Data is stored locally in IndexedDB first, then synced to server |
| Deterministic ID | Video/Transcript use UUID v5, ensuring same content generates same ID |
| Time Units | Timeline uses milliseconds (integer); Video.duration uses seconds; timestamps use ISO 8601 |
| Language Codes | Use BCP 47 format (e.g., `en`, `zh-TW`) |
| Polymorphic Association | Recording/Dictation associate with Video/Audio via `targetType` + `targetId` |

---

## ID Generation Rules

**Namespace:** `6ba7b811-9dad-11d1-80b4-00c04fd430c8` (RFC 4122 URL namespace)

| Entity | ID Type | Generation Rule |
|--------|---------|-----------------|
| Video | UUID v5 | `video:${provider}:${vid}` |
| Transcript | UUID v5 | `transcript:${targetType}:${targetId}:${language}:${source}` |
| Recording | UUID v4 | Random |
| Dictation | UUID v4 | Random |

```typescript
import { v4 as uuidv4, v5 as uuidv5 } from 'uuid';

const NAMESPACE = '6ba7b811-9dad-11d1-80b4-00c04fd430c8';

// Video ID: same provider + vid always generates same UUID
const videoId = uuidv5(`video:youtube:dQw4w9WgXcQ`, NAMESPACE);

// Transcript ID: same video + language + source always generates same UUID
const transcriptId = uuidv5(`transcript:Video:${videoId}:en:official`, NAMESPACE);

// Recording/Dictation: always new
const recordingId = uuidv4();
```

---

## Core Entities

### Video

```typescript
interface Video {
  id: string;                    // UUID v5
  vid: string;                   // Platform video ID (YouTube: "dQw4w9WgXcQ")
  provider: 'youtube' | 'netflix';
  title: string;
  description?: string;
  thumbnailUrl?: string;
  duration: number;              // seconds
  language: string;              // BCP 47
  season?: number;               // for TV series
  episode?: number;              // for TV series
  createdAt: string;             // ISO 8601
  updatedAt: string;
}
```

### Transcript

```typescript
interface Transcript {
  id: string;                    // UUID v5
  targetType: 'Video' | 'Audio';
  targetId: string;              // Video.id
  language: string;              // BCP 47
  source: 'official' | 'auto' | 'ai' | 'user';
  timeline: TranscriptLine[];
  referenceId?: string;          // source transcript for translations
  createdAt: string;
  updatedAt: string;
}

interface TranscriptLine {
  text: string;
  start: number;                 // milliseconds
  duration: number;              // milliseconds
  timeline?: TranscriptLine[];   // nested: Line → Word → Phoneme
  confidence?: number;           // 0-1
}
```

**Track ID Convention:** `${language}:${source}` (e.g., `en:official`, `zh-TW:ai`)

### Recording

```typescript
interface Recording {
  id: string;                    // UUID v4
  targetType: 'Video' | 'Audio';
  targetId: string;              // Video.id
  referenceStart: number;        // milliseconds
  referenceDuration: number;     // milliseconds
  referenceText: string;
  language: string;              // BCP 47
  duration: number;              // actual recording duration (milliseconds)
  md5?: string;                  // audio file MD5
  audioUrl?: string;             // synced audio URL
  pronunciationScore?: number;   // 0-100
  assessment?: PronunciationAssessmentResult;
  createdAt: string;
  updatedAt: string;
}
```

### Dictation

```typescript
interface Dictation {
  id: string;                    // UUID v4
  targetType: 'Video' | 'Audio';
  targetId: string;              // Video.id
  referenceStart: number;        // milliseconds
  referenceDuration: number;     // milliseconds
  referenceText: string;
  language: string;              // BCP 47
  userInput: string;
  accuracy: number;              // 0-100
  correctWords: number;
  missedWords: number;
  extraWords: number;
  createdAt: string;
  updatedAt: string;
}
```

### Sync Status

```typescript
type SyncStatus = 'local' | 'synced' | 'pending';

interface SyncableEntity {
  syncStatus: SyncStatus;
  serverUpdatedAt?: string;      // server version timestamp
}
```

> **Sync Strategy:** Server data is authoritative. During sync, server data overwrites local data.

---

## Sync API

### Sync Queue

Local changes are queued first, then batch-synced to server:

```typescript
interface SyncQueueItem {
  id: number;                    // auto-increment
  entityType: 'video' | 'transcript' | 'recording' | 'dictation';
  entityId: string;              // UUID
  action: 'create' | 'update' | 'delete';
  payload?: unknown;
  retryCount: number;
  lastAttempt?: string;
  error?: string;
  createdAt: string;
}
```

### API Endpoints

#### Batch Sync

```http
POST /api/v1/sync
```

**Request:**

```typescript
interface SyncRequest {
  videos?: VideoSyncItem[];
  transcripts?: TranscriptSyncItem[];
  recordings?: RecordingSyncItem[];
  dictations?: DictationSyncItem[];
  lastSyncAt?: string;           // for incremental sync
}

interface VideoSyncItem {
  action: 'create' | 'update' | 'delete';
  data: Video;                   // only id needed for delete
}

// TranscriptSyncItem, RecordingSyncItem, DictationSyncItem have same structure
```

**Response:**

```typescript
interface SyncResponse {
  success: boolean;

  // changes confirmed by server
  synced: {
    videos?: string[];           // synced ID list
    transcripts?: string[];
    recordings?: string[];
    dictations?: string[];
  };

  // server updates (client overwrites local)
  updates?: {
    videos?: Video[];
    transcripts?: Transcript[];
    recordings?: Recording[];
    dictations?: Dictation[];
  };

  serverTime: string;            // for next incremental sync
}
```

#### Upload Recording Audio

```http
POST /api/v1/recordings/:id/audio
Content-Type: multipart/form-data

file: <audio blob>
md5: <string>
```

**Response:**

```typescript
interface UploadResponse {
  success: boolean;
  audioUrl: string;              // CDN URL
}
```

#### Get Server Transcripts

```http
GET /api/v1/videos/:id/transcripts
```

**Response:**

```typescript
interface TranscriptsResponse {
  availableTranscripts: AvailableTranscript[];
  transcripts: Record<string, Transcript>;  // trackId -> Transcript
}

interface AvailableTranscript {
  id: string;                    // trackId: "en:official"
  language: string;
  source: 'official' | 'auto' | 'ai' | 'user';
  label: string;                 // display name
  isTranslatable: boolean;
}
```
