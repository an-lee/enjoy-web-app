/**
 * Worker Status Store
 * Manages standardized status for all Web Workers in the application
 */

import { create } from 'zustand'

// ============================================================================
// Types
// ============================================================================

/**
 * Standard worker status state
 */
export type WorkerStatus = 'idle' | 'initializing' | 'ready' | 'running' | 'error' | 'terminated'

/**
 * Standard worker status interface
 */
export interface StandardWorkerStatus {
  // Basic status
  status: WorkerStatus
  workerId: string
  workerName: string
  workerType: WorkerType

  // Timestamps
  createdAt: number
  lastActivityAt: number | null
  initializedAt: number | null

  // Error information
  error: string | null
  errorDetails?: {
    message?: string
    stack?: string
    name?: string
    cause?: any
  }

  // Task information
  activeTasks: number
  completedTasks: number
  failedTasks: number

  // Progress information (optional, for workers that support it)
  progress?: {
    current: number
    total: number
    percentage: number
    message?: string
  }

  // Additional metadata (for specific worker types)
  metadata?: Record<string, any>
}

/**
 * Worker types in the application
 */
export type WorkerType =
  | 'audio-analysis' // Audio decoding and analysis
  | 'asr' // Automatic Speech Recognition
  | 'smart-translation' // Smart translation
  | 'smart-dictionary' // Dictionary lookup
  | 'tts' // Text-to-Speech
  | 'sync' // Sync operations

// ============================================================================
// Store Interface
// ============================================================================

interface WorkerStatusState {
  // Worker statuses by workerId
  workers: Map<string, StandardWorkerStatus>

  // Actions
  registerWorker: (
    workerId: string,
    workerName: string,
    workerType: WorkerType,
    metadata?: Record<string, any>
  ) => void
  updateWorkerStatus: (workerId: string, status: WorkerStatus) => void
  updateWorkerError: (workerId: string, error: string | null, errorDetails?: StandardWorkerStatus['errorDetails']) => void
  updateWorkerProgress: (workerId: string, progress: StandardWorkerStatus['progress']) => void
  incrementTask: (workerId: string, type: 'active' | 'completed' | 'failed') => void
  updateWorkerMetadata: (workerId: string, metadata: Record<string, any>) => void
  unregisterWorker: (workerId: string) => void
  resetWorker: (workerId: string) => void

  // Getters
  getWorkerStatus: (workerId: string) => StandardWorkerStatus | undefined
  getWorkersByType: (workerType: WorkerType) => StandardWorkerStatus[]
  getAllWorkers: () => StandardWorkerStatus[]
}

// ============================================================================
// Store Implementation
// ============================================================================

const createDefaultStatus = (
  workerId: string,
  workerName: string,
  workerType: WorkerType,
  metadata?: Record<string, any>
): StandardWorkerStatus => ({
  status: 'idle',
  workerId,
  workerName,
  workerType,
  createdAt: Date.now(),
  lastActivityAt: null,
  initializedAt: null,
  error: null,
  activeTasks: 0,
  completedTasks: 0,
  failedTasks: 0,
  metadata,
})

export const useWorkerStatusStore = create<WorkerStatusState>((set, get) => ({
  workers: new Map(),

  registerWorker: (workerId, workerName, workerType, metadata) => {
    set((state) => {
      const newWorkers = new Map(state.workers)
      if (!newWorkers.has(workerId)) {
        newWorkers.set(workerId, createDefaultStatus(workerId, workerName, workerType, metadata))
      }
      return { workers: newWorkers }
    })
  },

  updateWorkerStatus: (workerId, status) => {
    set((state) => {
      const newWorkers = new Map(state.workers)
      const worker = newWorkers.get(workerId)
      if (worker) {
        const now = Date.now()
        newWorkers.set(workerId, {
          ...worker,
          status,
          lastActivityAt: now,
          initializedAt: status === 'ready' && !worker.initializedAt ? now : worker.initializedAt,
        })
      }
      return { workers: newWorkers }
    })
  },

  updateWorkerError: (workerId, error, errorDetails) => {
    set((state) => {
      const newWorkers = new Map(state.workers)
      const worker = newWorkers.get(workerId)
      if (worker) {
        newWorkers.set(workerId, {
          ...worker,
          error,
          errorDetails: error ? errorDetails : undefined,
          status: error ? 'error' : worker.status,
          lastActivityAt: Date.now(),
        })
      }
      return { workers: newWorkers }
    })
  },

  updateWorkerProgress: (workerId, progress) => {
    set((state) => {
      const newWorkers = new Map(state.workers)
      const worker = newWorkers.get(workerId)
      if (worker) {
        newWorkers.set(workerId, {
          ...worker,
          progress,
          lastActivityAt: Date.now(),
        })
      }
      return { workers: newWorkers }
    })
  },

  incrementTask: (workerId, type) => {
    set((state) => {
      const newWorkers = new Map(state.workers)
      const worker = newWorkers.get(workerId)
      if (worker) {
        const updates: Partial<StandardWorkerStatus> = {
          lastActivityAt: Date.now(),
        }

        if (type === 'active') {
          updates.activeTasks = worker.activeTasks + 1
        } else if (type === 'completed') {
          updates.activeTasks = Math.max(0, worker.activeTasks - 1)
          updates.completedTasks = worker.completedTasks + 1
        } else if (type === 'failed') {
          updates.activeTasks = Math.max(0, worker.activeTasks - 1)
          updates.failedTasks = worker.failedTasks + 1
        }

        newWorkers.set(workerId, { ...worker, ...updates })
      }
      return { workers: newWorkers }
    })
  },

  updateWorkerMetadata: (workerId, metadata) => {
    set((state) => {
      const newWorkers = new Map(state.workers)
      const worker = newWorkers.get(workerId)
      if (worker) {
        newWorkers.set(workerId, {
          ...worker,
          metadata: { ...worker.metadata, ...metadata },
          lastActivityAt: Date.now(),
        })
      }
      return { workers: newWorkers }
    })
  },

  unregisterWorker: (workerId) => {
    set((state) => {
      const newWorkers = new Map(state.workers)
      newWorkers.delete(workerId)
      return { workers: newWorkers }
    })
  },

  resetWorker: (workerId) => {
    set((state) => {
      const newWorkers = new Map(state.workers)
      const worker = newWorkers.get(workerId)
      if (worker) {
        newWorkers.set(workerId, {
          ...createDefaultStatus(worker.workerId, worker.workerName, worker.workerType, worker.metadata),
          createdAt: worker.createdAt,
        })
      }
      return { workers: newWorkers }
    })
  },

  getWorkerStatus: (workerId) => {
    return get().workers.get(workerId)
  },

  getWorkersByType: (workerType) => {
    return Array.from(get().workers.values()).filter((w) => w.workerType === workerType)
  },

  getAllWorkers: () => {
    return Array.from(get().workers.values())
  },
}))

