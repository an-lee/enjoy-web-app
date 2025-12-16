# Synchronization Strategy

This document describes the offline-first synchronization strategy for audio and video entities between local IndexedDB and the remote server.

## Design Principles

1. **Offline-First**: All reads are from local IndexedDB (always available, even offline)
2. **Write Locally First**: All writes go to local IndexedDB first, then queued for sync
3. **Background Sync**: Sync happens in background, doesn't block UI
4. **Conflict Resolution**: Last-write-wins based on `serverUpdatedAt` timestamp
5. **Retry Mechanism**: Exponential backoff for failed sync attempts
6. **Incremental Sync**: Only downloads records updated since last sync (using timestamps)
7. **Pagination**: Downloads are paginated to handle large datasets efficiently
8. **Non-Blocking**: Uses `requestIdleCallback` or Web Workers to avoid blocking main thread

## Architecture

### Components

```
┌─────────────────────────────────────────────────────────────┐
│                    Application Layer                          │
│  (React Components, Hooks, etc.)                             │
└────────────────────┬────────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│                  Repository Layer                             │
│  (audio-repository, video-repository)                       │
│  - Auto-queues sync on create/update/delete                  │
└────────────────────┬────────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│                  Sync Manager                                 │
│  (sync-manager.ts)                                            │
│  - Orchestrates sync operations                              │
│  - Handles automatic triggers                                │
└────────────────────┬────────────────────────────────────────┘
                      │
        ┌─────────────┴─────────────┐
        ▼                           ▼
┌──────────────────┐      ┌──────────────────┐
│  Sync Service    │      │  Sync Queue      │
│  (sync-service)  │      │  (sync-queue-    │
│                  │      │   repository)    │
│  - Upload sync   │      │                  │
│  - Download sync │      │  - Queue items   │
│  - Conflict      │      │  - Retry logic   │
│    resolution    │      │                  │
└──────────────────┘      └──────────────────┘
        │                           │
        └─────────────┬─────────────┘
                      ▼
        ┌─────────────────────────────┐
        │      Remote API             │
        │  (audioApi, videoApi)       │
        └─────────────────────────────┘
```

## Sync Status Flow

```
local → pending → synced
  ↑        ↓
  └────────┘ (retry on failure)
```

- **local**: Created locally, not yet attempted to sync
- **pending**: Sync attempt in progress or failed (will retry)
- **synced**: Successfully synced with server

## Usage

### Initialization

Initialize the sync manager on app startup:

```typescript
import { initSyncManager } from '@/db'

// In your app initialization code
await initSyncManager({
  autoSyncOnStartup: true,
  autoSyncOnNetworkRecovery: true,
  periodicSyncInterval: 5 * 60 * 1000, // 5 minutes
})
```

### Automatic Sync

The sync system automatically handles sync when entities are created, updated, or deleted:

```typescript
import { saveAudio, updateAudio, deleteAudio } from '@/db'

// Creating an audio automatically queues it for sync
const audioId = await saveLocalAudio(fileHandle, {
  title: 'My Audio',
  language: 'en',
  // ... other fields
})

// Updating an audio automatically queues it for sync
await updateAudio(audioId, {
  title: 'Updated Title',
})

// Deleting a synced audio automatically queues deletion for sync
await deleteAudio(audioId)
```

### Manual Sync

You can manually trigger sync:

```typescript
import { triggerSync, fullSync } from '@/db'

// Trigger full sync (download + upload)
await triggerSync()

// Or use the service directly
import { fullSync, downloadAudios, downloadVideos, processSyncQueue } from '@/db'

// Download from server
await downloadAudios()
await downloadVideos()

// Process pending uploads
await processSyncQueue({ background: false })
```

### Queue Management

You can manage the sync queue directly:

```typescript
import {
  getPendingSyncQueueItems,
  getFailedSyncQueueItems,
  removeSyncQueueItem,
} from '@/db'

// Get pending items
const pending = await getPendingSyncQueueItems()

// Get failed items (max retries reached)
const failed = await getFailedSyncQueueItems()

// Remove a specific item
await removeSyncQueueItem(itemId)
```

## Incremental Sync

The sync system uses **incremental sync** to avoid downloading all records every time:

1. **Last Sync Timestamp**: Each entity type (`audio`, `video`) stores its last sync timestamp
2. **API Filtering**: When downloading, sends `updatedAfter` parameter to only fetch records updated since last sync
3. **First Sync**: On first sync (no timestamp), downloads all records
4. **Subsequent Syncs**: Only downloads records that have been updated since last sync

This significantly reduces:
- Network bandwidth usage
- Sync time
- Server load

## Pagination

Downloads are paginated to handle large datasets:

- **Page Size**: 50 items per page (configurable)
- **Automatic Pagination**: Automatically fetches all pages until no more data
- **Efficient Processing**: Processes each page in batches to avoid blocking

## Conflict Resolution

When downloading from server, conflicts are resolved using **last-write-wins** strategy:

1. Compare `serverUpdatedAt` timestamps
2. If server version is newer or equal, use server version (preserving local-only fields like `fileHandle` and `blob`)
3. If local version is newer, keep local version and update `serverUpdatedAt`

## Retry Mechanism

Failed sync attempts are automatically retried with exponential backoff:

- **Max Retries**: 5 attempts
- **Base Delay**: 1 second
- **Backoff**: `delay = base * 2^retryCount`
- **Retry Schedule**: 1s, 2s, 4s, 8s, 16s

After max retries, items remain in the queue but won't be automatically retried. You can manually retry them or clear the queue.

## Network Detection

The sync manager automatically detects network status:

- **Online**: Syncs automatically when network is available
- **Offline**: Queues changes locally, syncs when network recovers
- **Network Recovery**: Automatically triggers full sync when network comes back online

## File Handling

### Local-Only Fields

The following fields are **never synced** (local-only):

- `fileHandle`: FileSystemFileHandle for local files
- `blob`: Blob data for TTS-generated audio

These fields are preserved during conflict resolution.

### Synced Fields

All other fields are synced, including:

- Metadata: `title`, `description`, `thumbnailUrl`, `duration`, `language`
- File info: `md5`, `size`, `source` (original URL)
- Server storage: `mediaUrl` (if file is uploaded to server)

## API Integration

The sync service integrates with the Rails API backend:

- **GET** `/api/v1/mine/audios` - Download audios
- **GET** `/api/v1/mine/videos` - Download videos
- **POST** `/api/v1/mine/audios` - Upload audio
- **POST** `/api/v1/mine/videos` - Upload video
- **DELETE** `/api/v1/mine/audios/:id` - Delete audio
- **DELETE** `/api/v1/mine/videos/:id` - Delete video

## Non-Blocking Processing

The sync system uses several techniques to avoid blocking the main thread:

1. **requestIdleCallback**: Uses browser's idle time to process sync batches (default)
2. **Web Worker Support**: Optional Web Worker for network requests (experimental)
3. **Batch Processing**: Processes items in small batches with delays between batches
4. **Background Mode**: Sync operations run in background by default

### Using Web Workers

You can optionally use Web Workers for network requests (experimental):

```typescript
import { fullSync } from '@/db'

// Use Web Worker for network requests
await fullSync({ useWorker: true })
```

**Note**: IndexedDB operations must still happen on the main thread, so Workers only handle network requests.

## Best Practices

1. **Always use repository functions**: Don't directly modify IndexedDB, use repository functions which handle sync automatically

2. **Handle sync errors gracefully**: Sync failures don't block local operations, but you should handle errors appropriately

3. **Monitor sync status**: Use `getSyncManagerStatus()` to check sync manager state

4. **Periodic sync**: Enable periodic background sync for better data consistency

5. **Manual sync on critical operations**: For critical operations, trigger manual sync to ensure immediate synchronization

6. **Force sync when needed**: Use `force: true` to bypass incremental sync and download all records

7. **Check sync timestamps**: Use `getLastSyncAt()` to check when last sync occurred

## Troubleshooting

### Items stuck in pending

If items are stuck in pending state:

1. Check network connectivity
2. Check API authentication
3. Review error messages in sync queue items
4. Manually retry or clear failed items

### Conflicts not resolving

If conflicts aren't resolving correctly:

1. Check `serverUpdatedAt` timestamps
2. Verify conflict resolution logic
3. Manually inspect local vs server data

### Sync not triggering

If sync isn't triggering automatically:

1. Verify sync manager is initialized
2. Check sync status of entities (should be 'local' or 'pending')
3. Ensure network is online
4. Check sync queue for pending items

