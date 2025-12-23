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
 * Task status
 */
export type TaskStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled'

/**
 * Task information for tracking individual tasks
 */
export interface WorkerTask {
  taskId: string
  status: TaskStatus
  startedAt: number
  completedAt?: number
  cancelledAt?: number
  error?: string
  cancel?: () => void // Cancel function for active tasks
  metadata?: Record<string, any>
}

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
  tasks: Map<string, WorkerTask> // Track individual tasks by taskId

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
  registerTask: (workerId: string, taskId: string, cancel?: () => void, metadata?: Record<string, any>) => void
  updateTask: (workerId: string, taskId: string, status: TaskStatus, error?: string) => void
  cancelTask: (workerId: string, taskId: string) => void
  updateWorkerMetadata: (workerId: string, metadata: Record<string, any>) => void
  unregisterWorker: (workerId: string) => void
  resetWorker: (workerId: string) => void
  clearCompletedTasks: (workerId: string, olderThan?: number) => void // Clear completed tasks older than specified ms

  // Getters
  getWorkerStatus: (workerId: string) => StandardWorkerStatus | undefined
  getWorkersByType: (workerType: WorkerType) => StandardWorkerStatus[]
  getAllWorkers: () => StandardWorkerStatus[]
  getAllTasks: () => WorkerTask[]
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
  tasks: new Map(),
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

  registerTask: (workerId, taskId, cancel, metadata) => {
    set((state) => {
      const newWorkers = new Map(state.workers)
      const worker = newWorkers.get(workerId)
      if (worker) {
        const newTasks = new Map(worker.tasks)
        newTasks.set(taskId, {
          taskId,
          status: 'pending',
          startedAt: Date.now(),
          cancel,
          metadata,
        })
        newWorkers.set(workerId, {
          ...worker,
          tasks: newTasks,
          activeTasks: worker.activeTasks + 1,
          lastActivityAt: Date.now(),
        })
      }
      return { workers: newWorkers }
    })
  },

  updateTask: (workerId, taskId, status, error) => {
    set((state) => {
      const newWorkers = new Map(state.workers)
      const worker = newWorkers.get(workerId)
      if (worker) {
        const newTasks = new Map(worker.tasks)
        const task = newTasks.get(taskId)
        if (task) {
          const updates: Partial<WorkerTask> = { status }
          if (status === 'completed' || status === 'failed' || status === 'cancelled') {
            updates.completedAt = Date.now()
            if (status === 'cancelled') {
              updates.cancelledAt = Date.now()
            }
            if (error) {
              updates.error = error
            }
            updates.cancel = undefined // Remove cancel function
          }
          newTasks.set(taskId, { ...task, ...updates })

          // Update task counts
          const updates2: Partial<StandardWorkerStatus> = {
            tasks: newTasks,
            lastActivityAt: Date.now(),
          }
          if (status === 'completed') {
            updates2.activeTasks = Math.max(0, worker.activeTasks - 1)
            updates2.completedTasks = worker.completedTasks + 1
          } else if (status === 'failed' || status === 'cancelled') {
            updates2.activeTasks = Math.max(0, worker.activeTasks - 1)
            updates2.failedTasks = worker.failedTasks + 1
          } else if (status === 'running') {
            // Task started running
            const wasPending = task.status === 'pending'
            if (wasPending) {
              // Already counted as active in registerTask
            }
          }

          newWorkers.set(workerId, { ...worker, ...updates2 })
        }
      }
      return { workers: newWorkers }
    })
  },

  cancelTask: (workerId, taskId) => {
    const state = get()
    const worker = state.workers.get(workerId)
    if (worker) {
      const task = worker.tasks.get(taskId)
      if (task && task.cancel) {
        task.cancel()
        // updateTask will be called by the service handling the cancellation
      }
    }
  },

  clearCompletedTasks: (workerId, olderThan = 3600000) => {
    // Default: clear tasks older than 1 hour
    set((state) => {
      const newWorkers = new Map(state.workers)
      const worker = newWorkers.get(workerId)
      if (worker) {
        const now = Date.now()
        const newTasks = new Map(worker.tasks)
        for (const [taskId, task] of newTasks.entries()) {
          const completedAt = task.completedAt || task.cancelledAt
          if (
            completedAt &&
            (task.status === 'completed' || task.status === 'failed' || task.status === 'cancelled') &&
            now - completedAt > olderThan
          ) {
            newTasks.delete(taskId)
          }
        }
        newWorkers.set(workerId, {
          ...worker,
          tasks: newTasks,
        })
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

  getAllTasks: () => {
    const allTasks: WorkerTask[] = []
    for (const worker of get().workers.values()) {
      for (const task of worker.tasks.values()) {
        allTasks.push(task)
      }
    }
    return allTasks.sort((a, b) => b.startedAt - a.startedAt) // Most recent first
  },
}))

