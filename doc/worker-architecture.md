# Web Workers Architecture

## Overview

The application uses **Web Workers** extensively to offload CPU-intensive tasks from the main thread, ensuring a responsive UI during heavy computations. All workers are managed through a centralized **Worker Status Store** that provides standardized status tracking and monitoring.

## Design Principles

1. **Standardized Status Management**: All workers report to a unified status store (`useWorkerStatusStore`) for consistent monitoring
2. **Lifecycle Tracking**: Workers track initialization, ready state, task execution, and error states
3. **Task Management**: Workers support concurrent task tracking (active, completed, failed tasks)
4. **Progress Reporting**: Workers report progress for long-running operations (model loading, processing)
5. **Error Handling**: Standardized error reporting with detailed error information

## Worker Status Store

**Location**: `src/page/stores/worker-status.ts`

The Worker Status Store (`useWorkerStatusStore`) provides a centralized Zustand store for managing all worker statuses:

```typescript
interface StandardWorkerStatus {
  // Basic identification
  status: WorkerStatus // 'idle' | 'initializing' | 'ready' | 'running' | 'error' | 'terminated'
  workerId: string
  workerName: string
  workerType: WorkerType

  // Timestamps
  createdAt: number
  lastActivityAt: number | null
  initializedAt: number | null

  // Error tracking
  error: string | null
  errorDetails?: { message?, stack?, name?, cause? }

  // Task statistics
  activeTasks: number
  completedTasks: number
  failedTasks: number

  // Progress (optional)
  progress?: { current, total, percentage, message? }

  // Metadata (worker-specific)
  metadata?: Record<string, any>
}
```

**Worker Types**:

- `audio-analysis`: Audio decoding and analysis
- `asr`: Automatic Speech Recognition (Whisper)
- `smart-translation`: LLM-based translation
- `smart-dictionary`: Dictionary lookup
- `tts`: Text-to-Speech
- `sync`: Sync operations

**Store Actions**:

- `registerWorker()`: Register a new worker with initial status
- `updateWorkerStatus()`: Update worker status state
- `updateWorkerError()`: Report errors with details
- `updateWorkerProgress()`: Update progress for long-running tasks
- `incrementTask()`: Track task lifecycle (active → completed/failed)
- `updateWorkerMetadata()`: Update worker-specific metadata
- `resetWorker()`: Reset worker to initial state
- `unregisterWorker()`: Remove worker from store

## Worker Implementations

### 1. AI Workers (Local Provider)

**Location**: `src/page/ai/providers/local/workers/`

**Manager**: `worker-manager.ts` - Centralized worker creation and management

All AI workers follow the same pattern managed by `worker-manager.ts`:

**ASR Worker** (`asr-worker.ts`):

- **Purpose**: Automatic Speech Recognition using Whisper models (transformers.js)
- **Worker ID**: `asr-worker`
- **Worker Type**: `asr`
- **Model**: Whisper (default from constants)
- **Features**:
  - Model initialization with progress tracking
  - Audio transcription with word-level timestamps
  - Chunking support for long audio (30-second chunks)
  - Language detection support

**Smart Translation Worker** (`smart-translation-worker.ts`):

- **Purpose**: LLM-based style-aware translation using generative models
- **Worker ID**: `smart-translation-worker`
- **Worker Type**: `smart-translation`
- **Model**: Qwen3-based models (default from constants)
- **Features**:
  - Text generation pipeline with WebGPU support
  - Style-aware translation (literal, natural, casual, formal, etc.)
  - Task cancellation support
  - Aggressive output cleanup for smaller models

**Dictionary Worker** (`dictionary-worker.ts`):

- **Purpose**: Contextual dictionary lookup using LLM
- **Worker ID**: `dictionary-worker`
- **Worker Type**: `smart-dictionary`
- **Model**: Text generation models (default from constants)
- **Features**:
  - Word lookup with context support
  - Structured dictionary response parsing
  - Definition, etymology, and contextual explanation extraction

**TTS Worker** (`tts-worker.ts`):

- **Purpose**: Text-to-Speech synthesis using Kokoro TTS
- **Worker ID**: `tts-worker`
- **Worker Type**: `tts`
- **Model**: Kokoro TTS (82M ONNX timestamped)
- **Features**:
  - Voice selection support
  - Word-level timestamp generation
  - Task cancellation support
  - Audio format conversion (Float32Array → WAV)

**Common Pattern** (all AI workers):

- Singleton pattern for model instances (prevents duplicate loading)
- Progress callbacks during model loading
- Message-based communication with main thread
- Error handling with detailed error information
- Task-based execution model

**Integration with Worker Status Store**:

```typescript
// In worker-manager.ts
statusStore.registerWorker(workerId, workerName, workerType)
statusStore.updateWorkerStatus(workerId, 'initializing')

// On ready
statusStore.updateWorkerStatus(workerId, 'ready')

// On task start
statusStore.updateWorkerStatus(workerId, 'running')
statusStore.incrementTask(workerId, 'active')

// On task completion
statusStore.incrementTask(workerId, 'completed')
statusStore.updateWorkerStatus(workerId, 'ready') // if no active tasks

// On error
statusStore.updateWorkerError(workerId, error.message, errorDetails)
```

### 2. Audio Analysis Worker

**Location**: `src/page/lib/audio/workers/`

**Worker File**: `audio-analysis-worker.ts`
**Manager**: `audio-analysis-worker-manager.ts`

- **Purpose**: Audio decoding and analysis (WebCodecs + Web Audio API fallback)
- **Worker ID**: `audio-analysis-worker`
- **Worker Type**: `audio-analysis`
- **Features**:
  - WebCodecs API support for streaming decoding (when available)
  - Web Audio API fallback for compatibility
  - Mono PCM segment extraction
  - Time range extraction (start/end time support)
  - Transferable objects for efficient data transfer

**Manager Pattern**:

- Singleton manager instance (`getAudioAnalysisWorkerManager()`)
- Task queue management
- Automatic worker initialization
- Status updates via worker status store

**Integration**:

```typescript
// Register and initialize
store.registerWorker(workerId, workerName, 'audio-analysis', { webCodecsSupported })
store.updateWorkerStatus(workerId, 'initializing')
store.updateWorkerStatus(workerId, 'ready')

// Task execution
store.updateWorkerStatus(workerId, 'running')
store.incrementTask(workerId, 'active')
// ... on completion
store.incrementTask(workerId, 'completed')
store.updateWorkerStatus(workerId, 'ready')
```

### 3. Sync Worker

**Location**: `src/page/db/services/sync-worker.ts`

- **Purpose**: Network requests for sync operations (download/upload)
- **Worker ID**: `sync-worker`
- **Worker Type**: `sync`
- **Features**:
  - Inline worker (Blob URL, no separate file)
  - HTTP request handling (GET/POST)
  - JSON payload processing
  - Note: IndexedDB operations remain on main thread (workers can't access IndexedDB)

**Integration**:

```typescript
// Registration and initialization
store.registerWorker(workerId, workerName, 'sync')
store.updateWorkerStatus(workerId, 'initializing')
store.updateWorkerStatus(workerId, 'ready')

// Task execution
store.updateWorkerStatus(workerId, 'running')
store.incrementTask(workerId, 'active')
// ... on completion/error
store.incrementTask(workerId, 'completed' | 'failed')
store.updateWorkerStatus(workerId, 'ready')
```

## Worker Lifecycle

All workers follow a standardized lifecycle:

```text
1. Registration
   └─ registerWorker() → status: 'idle'

2. Initialization
   └─ updateWorkerStatus('initializing')
   └─ Create Worker instance
   └─ Set up message/error handlers
   └─ updateWorkerStatus('ready')

3. Task Execution
   └─ updateWorkerStatus('running')
   └─ incrementTask('active')
   └─ Execute task in worker
   └─ incrementTask('completed' | 'failed')
   └─ updateWorkerStatus('ready') if no active tasks

4. Error Handling
   └─ updateWorkerError(error, errorDetails)
   └─ status: 'error'

5. Termination (optional)
   └─ worker.terminate()
   └─ updateWorkerStatus('terminated')
   └─ unregisterWorker()
```

## Status Monitoring

**UI Components**:

- `worker-monitor-panel.tsx`: Full worker status panel
- `worker-monitor-floating.tsx`: Floating monitor widget

Both components use `useWorkerStatusStore` to display real-time worker status, including:

- Current status badges
- Task statistics (active/completed/failed)
- Progress indicators
- Error messages and details
- Last activity timestamps

## Worker Message Protocol

All workers use a standardized message protocol:

**Main Thread → Worker**:

```typescript
{
  type: 'init' | 'transcribe' | 'translate' | 'synthesize' | 'lookup' | 'decode' | ...
  data?: { ...worker-specific data... }
  taskId?: string  // For task tracking
}
```

**Worker → Main Thread**:

```typescript
{
  type: 'ready' | 'progress' | 'result' | 'error' | 'status' | 'cancelled'
  data?: { ...result data... }
  taskId?: string  // For task correlation
}
```

## Best Practices

1. **Always Register Workers**: Use `registerWorker()` before creating worker instances
2. **Update Status Consistently**: Report all state changes to the status store
3. **Track Tasks**: Use `incrementTask()` for all task lifecycle events
4. **Report Progress**: Use `updateWorkerProgress()` for long-running operations
5. **Handle Errors**: Always call `updateWorkerError()` with detailed error information
6. **Clean Up**: Unregister or terminate workers when no longer needed
7. **Use Task IDs**: Include `taskId` in messages for proper task correlation
8. **Transferable Objects**: Use Transferable objects (ArrayBuffer) for large data transfers

## Code Organization

```text
src/page/
├── stores/
│   └── worker-status.ts              # Centralized status store
├── ai/providers/local/workers/
│   ├── worker-manager.ts             # AI workers manager
│   ├── asr-worker.ts                 # ASR worker
│   ├── smart-translation-worker.ts   # Translation worker
│   ├── dictionary-worker.ts          # Dictionary worker
│   └── tts-worker.ts                 # TTS worker
├── lib/audio/workers/
│   ├── audio-analysis-worker.ts      # Audio decoding worker
│   └── audio-analysis-worker-manager.ts  # Manager
├── db/services/
│   └── sync-worker.ts                # Sync operations worker
└── components/worker-monitor/
    ├── worker-monitor-panel.tsx      # Status panel UI
    └── worker-monitor-floating.tsx   # Floating monitor UI
```

## Worker Types Summary

| Worker Type | Worker ID | Purpose | Model/Tech |
| ----------- | --------- | ------- | ---------- |
| `asr` | `asr-worker` | Speech-to-text transcription | Whisper (transformers.js) |
| `smart-translation` | `smart-translation-worker` | Style-aware translation | LLM (transformers.js) |
| `smart-dictionary` | `dictionary-worker` | Contextual dictionary lookup | LLM (transformers.js) |
| `tts` | `tts-worker` | Text-to-speech synthesis | Kokoro TTS (kokoro-js) |
| `audio-analysis` | `audio-analysis-worker` | Audio decoding/analysis | WebCodecs / Web Audio API |
| `sync` | `sync-worker` | Network sync operations | Fetch API |

All workers integrate with the Worker Status Store for unified monitoring and management.
