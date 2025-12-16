# API Response Format Specification

This document defines the expected response format for the Rails API backend endpoints for audio and video synchronization.

## Overview

The client-side API client automatically converts server responses from `snake_case` to `camelCase`. Therefore, **the server should return data in `snake_case` format**.

## Response Format

### GET /api/v1/mine/audios

**Query Parameters:**
- `provider` (optional): Filter by provider (`user`, `youtube`, `spotify`, `podcast`)
- `limit` (optional): Items per page (default: 50, max: 100)
- `updated_after` (optional): ISO 8601 timestamp - cursor-based pagination, only return records updated after this time

**Response Format:**
```json
[
  {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "aid": "sha256-hash-of-audio-file",
    "provider": "user",
    "title": "Audio Title",
    "description": "Audio description",
    "thumbnail_url": "https://example.com/thumbnail.jpg",
    "duration": 120.5,
    "language": "en",
    "created_at": "2024-01-01T00:00:00Z",
    "updated_at": "2024-01-01T00:00:00Z",

    "translation_key": "translation-id-if-tts",
    "source_text": "Original text for TTS",
    "voice": "en-US-JennyNeural",

    "source": "https://example.com/original-audio.mp3",
    "md5": "sha256-hash-same-as-aid",
    "size": 1024000,
    "media_url": "https://cdn.example.com/audio.mp3",

    "sync_status": "synced",
    "server_updated_at": "2024-01-01T00:00:00Z"
  }
]
```

**Notes:**
- Response is an array of audio objects
- All timestamps are ISO 8601 format (UTC)
- `sync_status` and `server_updated_at` are optional (used for sync tracking)
- Fields marked with `?` are optional

### GET /api/v1/mine/audios/:id

**Response Format:**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "aid": "sha256-hash-of-audio-file",
  "provider": "user",
  "title": "Audio Title",
  "description": "Audio description",
  "thumbnail_url": "https://example.com/thumbnail.jpg",
  "duration": 120.5,
  "language": "en",
  "created_at": "2024-01-01T00:00:00Z",
  "updated_at": "2024-01-01T00:00:00Z",

  "translation_key": "translation-id-if-tts",
  "source_text": "Original text for TTS",
  "voice": "en-US-JennyNeural",

  "source": "https://example.com/original-audio.mp3",
  "md5": "sha256-hash-same-as-aid",
  "size": 1024000,
  "media_url": "https://cdn.example.com/audio.mp3",

  "sync_status": "synced",
  "server_updated_at": "2024-01-01T00:00:00Z"
}
```

### POST /api/v1/mine/audios

**Request Body:**
```json
{
  "audio": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "aid": "sha256-hash-of-audio-file",
    "provider": "user",
    "title": "Audio Title",
    "description": "Audio description",
    "thumbnail_url": "https://example.com/thumbnail.jpg",
    "duration": 120.5,
    "language": "en",
    "source": "https://example.com/original-audio.mp3",
    "md5": "sha256-hash-same-as-aid",
    "size": 1024000,
    "media_url": "https://cdn.example.com/audio.mp3",
    "translation_key": "translation-id-if-tts",
    "source_text": "Original text for TTS",
    "voice": "en-US-JennyNeural"
  }
}
```

**Response Format:**
Same as GET /api/v1/mine/audios/:id

**Notes:**
- Server should validate and return the created/updated audio
- Server should set `created_at` and `updated_at` timestamps
- Server may generate `media_url` if file is uploaded

### DELETE /api/v1/mine/audios/:id

**Response Format:**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "deleted": true
}
```

Or return 204 No Content.

---

### GET /api/v1/mine/videos

**Query Parameters:**
- `provider` (optional): Filter by provider (`user`, `youtube`, `netflix`)
- `limit` (optional): Items per page (default: 50, max: 100)
- `updated_after` (optional): ISO 8601 timestamp - cursor-based pagination, only return records updated after this time

**Response Format:**
```json
[
  {
    "id": "550e8400-e29b-41d4-a716-446655440001",
    "vid": "sha256-hash-of-video-file",
    "provider": "user",
    "title": "Video Title",
    "description": "Video description",
    "thumbnail_url": "https://example.com/thumbnail.jpg",
    "duration": 3600.0,
    "language": "en",
    "created_at": "2024-01-01T00:00:00Z",
    "updated_at": "2024-01-01T00:00:00Z",

    "source": "https://example.com/original-video.mp4",
    "md5": "sha256-hash-same-as-vid",
    "size": 104857600,
    "media_url": "https://cdn.example.com/video.mp4",

    "sync_status": "synced",
    "server_updated_at": "2024-01-01T00:00:00Z"
  }
]
```

### GET /api/v1/mine/videos/:id

**Response Format:**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440001",
  "vid": "sha256-hash-of-video-file",
  "provider": "user",
  "title": "Video Title",
  "description": "Video description",
  "thumbnail_url": "https://example.com/thumbnail.jpg",
  "duration": 3600.0,
  "language": "en",
  "created_at": "2024-01-01T00:00:00Z",
  "updated_at": "2024-01-01T00:00:00Z",

  "source": "https://example.com/original-video.mp4",
  "md5": "sha256-hash-same-as-vid",
  "size": 104857600,
  "media_url": "https://cdn.example.com/video.mp4",

  "sync_status": "synced",
  "server_updated_at": "2024-01-01T00:00:00Z"
}
```

### POST /api/v1/mine/videos

**Request Body:**
```json
{
  "video": {
    "id": "550e8400-e29b-41d4-a716-446655440001",
    "vid": "sha256-hash-of-video-file",
    "provider": "user",
    "title": "Video Title",
    "description": "Video description",
    "thumbnail_url": "https://example.com/thumbnail.jpg",
    "duration": 3600.0,
    "language": "en",
    "source": "https://example.com/original-video.mp4",
    "md5": "sha256-hash-same-as-vid",
    "size": 104857600,
    "media_url": "https://cdn.example.com/video.mp4"
  }
}
```

**Response Format:**
Same as GET /api/v1/mine/videos/:id

### DELETE /api/v1/mine/videos/:id

**Response Format:**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440001",
  "deleted": true
}
```

Or return 204 No Content.

---

## Field Descriptions

### Common Fields (Audio & Video)

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | string (UUID v5) | Yes | Deterministic UUID generated from provider + aid/vid |
| `aid` / `vid` | string | Yes | SHA-256 hash of the media file |
| `provider` | string | Yes | Provider type: `user`, `youtube`, `netflix`, `spotify`, `podcast` |
| `title` | string | Yes | Media title |
| `description` | string | No | Media description |
| `thumbnail_url` | string | No | Thumbnail image URL |
| `duration` | number | Yes | Duration in seconds (float) |
| `language` | string | Yes | BCP 47 language code (e.g., `en`, `zh-TW`) |
| `created_at` | string (ISO 8601) | Yes | Creation timestamp |
| `updated_at` | string (ISO 8601) | Yes | Last update timestamp |
| `source` | string | No | Original URL if downloaded from web |
| `md5` | string | No | File hash (SHA-256, same as aid/vid) |
| `size` | number | No | File size in bytes |
| `media_url` | string | No | Server CDN URL if file is uploaded |
| `sync_status` | string | No | Sync status: `local`, `pending`, `synced` |
| `server_updated_at` | string (ISO 8601) | No | Server-side update timestamp |

### Audio-Specific Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `translation_key` | string | No | Reference to Translation.id (for TTS audio) |
| `source_text` | string | No | Original text synthesized (for TTS audio) |
| `voice` | string | No | Voice identifier used (for TTS audio) |

## Field Mapping (snake_case → camelCase)

The client automatically converts field names:

| Server (snake_case) | Client (camelCase) |
|---------------------|-------------------|
| `created_at` | `createdAt` |
| `updated_at` | `updatedAt` |
| `thumbnail_url` | `thumbnailUrl` |
| `translation_key` | `translationKey` |
| `source_text` | `sourceText` |
| `sync_status` | `syncStatus` |
| `server_updated_at` | `serverUpdatedAt` |
| `media_url` | `mediaUrl` |

## Local-Only Fields (Not Synced)

The following fields are **never sent to or received from the server**:

- `fileHandle`: FileSystemFileHandle (browser-only, not serializable)
- `blob`: Blob data (stored locally in IndexedDB)

These fields are preserved locally during sync operations.

## Cursor-Based Pagination

The API uses **cursor-based pagination** instead of offset-based pagination:

1. Accept `limit` and `updated_after` query parameters
2. Return items where `updated_at >= updated_after`, ordered by `updated_at` ascending
3. Limit the number of results to `limit` (default: 50, max: 100)
4. Return empty array `[]` when no more items are available

**How it works:**
- Client sends `updated_after` with the last sync timestamp (or `null` for first sync)
- Server returns records updated after that timestamp, ordered by `updated_at`
- Client processes the batch and uses the latest `updated_at` from the batch as the new cursor
- Client continues fetching with the new `updated_after` until an empty array is returned

**Example:**
```
# First request
GET /api/v1/mine/audios?limit=50

# If 50 items returned, use the latest updated_at as cursor
GET /api/v1/mine/audios?limit=50&updated_after=2024-01-01T12:00:00Z

# Continue until empty array returned
GET /api/v1/mine/audios?limit=50&updated_after=2024-01-01T13:30:00Z
```

**Benefits:**
- More efficient for incremental sync
- No duplicate records when new data is added during pagination
- Natural fit for time-based filtering

## Incremental Sync

The `updated_after` parameter enables incremental synchronization:

1. **First Sync**: Client sends request without `updated_after` (or with `null`)
   - Server returns all records, ordered by `updated_at` ascending

2. **Subsequent Syncs**: Client sends `updated_after` with the last sync timestamp
   - Server returns only records where `updated_at > updated_after`
   - Records are ordered by `updated_at` ascending

3. **Cursor Pagination**: For large datasets, client uses cursor-based pagination:
   - Uses the latest `updated_at` from current batch as the new `updated_after`
   - Continues fetching until empty array is returned

**Example:**
```
# First sync - get all records
GET /api/v1/mine/audios?limit=50

# Incremental sync - get updates since last sync
GET /api/v1/mine/audios?limit=50&updated_after=2024-01-15T10:30:00Z

# Continue pagination if needed
GET /api/v1/mine/audios?limit=50&updated_after=2024-01-15T12:45:00Z
```

**Server Requirements:**
- Records must be ordered by `updated_at` ascending
- Records with `updated_at > updated_after` should be returned
- If multiple records have the same `updated_at`, all should be included

## Error Responses

All endpoints should return standard HTTP status codes:

- `200 OK`: Success
- `201 Created`: Resource created (for POST)
- `204 No Content`: Success with no body (for DELETE)
- `400 Bad Request`: Invalid request parameters
- `401 Unauthorized`: Authentication required
- `404 Not Found`: Resource not found
- `422 Unprocessable Entity`: Validation errors
- `500 Internal Server Error`: Server error

**Error Response Format:**
```json
{
  "error": "Error message",
  "errors": {
    "field_name": ["Error message 1", "Error message 2"]
  }
}
```

## Authentication

All endpoints require authentication via Bearer token:

```
Authorization: Bearer <jwt_token>
```

The client automatically includes the token in request headers.

## Example: Complete Sync Flow

### 1. First Sync (Download All)

**Request:**
```
GET /api/v1/mine/audios?limit=50
```

**Response:**
```json
[
  {
    "id": "audio-1",
    "aid": "hash-1",
    "provider": "user",
    "title": "Audio 1",
    "duration": 120,
    "language": "en",
    "created_at": "2024-01-01T00:00:00Z",
    "updated_at": "2024-01-01T00:00:00Z"
  },
  {
    "id": "audio-2",
    "aid": "hash-2",
    "provider": "user",
    "title": "Audio 2",
    "duration": 180,
    "language": "en",
    "created_at": "2024-01-01T01:00:00Z",
    "updated_at": "2024-01-01T01:00:00Z"
  }
]
```

### 2. Incremental Sync (Download Updates Only)

**Request:**
```
GET /api/v1/mine/audios?limit=50&updated_after=2024-01-01T00:00:00Z
```

**Note:** If the response contains 50 items, the client will continue fetching using the latest `updated_at` as the new cursor.

**Response:**
```json
[
  {
    "id": "audio-2",
    "aid": "hash-2",
    "provider": "user",
    "title": "Audio 2 Updated",
    "duration": 180,
    "language": "en",
    "created_at": "2024-01-01T01:00:00Z",
    "updated_at": "2024-01-02T00:00:00Z"
  }
]
```

### 3. Upload New Audio

**Request:**
```
POST /api/v1/mine/audios
Content-Type: application/json

{
  "audio": {
    "id": "audio-3",
    "aid": "hash-3",
    "provider": "user",
    "title": "New Audio",
    "duration": 90,
    "language": "en"
  }
}
```

**Response:**
```json
{
  "id": "audio-3",
  "aid": "hash-3",
  "provider": "user",
  "title": "New Audio",
  "duration": 90,
  "language": "en",
  "created_at": "2024-01-03T00:00:00Z",
  "updated_at": "2024-01-03T00:00:00Z"
}
```

