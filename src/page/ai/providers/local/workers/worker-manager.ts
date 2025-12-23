/**
 * Worker Management
 * Creates and manages Web Workers for local model inference
 */

import { useLocalModelsStore } from '@/page/stores/local-models'
import { useWorkerStatusStore, type WorkerType } from '@/page/stores/worker-status'
import { normalizeProgress } from '../utils/progress'
import { createLogger } from '@/shared/lib/utils'

// ============================================================================
// Logger
// ============================================================================

const log = createLogger({ name: 'WorkerManager' })

// ============================================================================
// Types
// ============================================================================

type ModelType = 'asr' | 'smartTranslation' | 'smartDictionary' | 'tts'

interface WorkerConfig {
  workerId: string
  workerName: string
  workerType: WorkerType
  modelType: ModelType
  workerFile: string
  enableDetailedErrorLogging?: boolean
}

interface WorkerMessage {
  type: string
  data?: any
  taskId?: string
}

// ============================================================================
// Worker Configuration
// ============================================================================

const WORKER_CONFIGS: Record<string, WorkerConfig> = {
  asr: {
    workerId: 'asr-worker',
    workerName: 'ASR Worker',
    workerType: 'asr',
    modelType: 'asr',
    workerFile: './asr-worker.ts',
  },
  smartTranslation: {
    workerId: 'smart-translation-worker',
    workerName: 'Smart Translation Worker',
    workerType: 'smart-translation',
    modelType: 'smartTranslation',
    workerFile: './smart-translation-worker.ts',
    enableDetailedErrorLogging: true,
  },
  dictionary: {
    workerId: 'dictionary-worker',
    workerName: 'Dictionary Worker',
    workerType: 'smart-dictionary',
    modelType: 'smartDictionary',
    workerFile: './dictionary-worker.ts',
  },
  tts: {
    workerId: 'tts-worker',
    workerName: 'TTS Worker',
    workerType: 'tts',
    modelType: 'tts',
    workerFile: './tts-worker.ts',
  },
}

// ============================================================================
// Worker Instance Storage
// ============================================================================

const workerInstances = new Map<string, Worker | null>()

// ============================================================================
// Common Worker Management Logic
// ============================================================================

/**
 * Create a message handler for a worker
 */
function createMessageHandler(config: WorkerConfig) {
  return (event: MessageEvent<WorkerMessage>) => {
    const { type, data, taskId } = event.data
    const statusStore = useWorkerStatusStore.getState()
    const modelsStore = useLocalModelsStore.getState()

    if (type === 'ready') {
      modelsStore.setModelLoaded(config.modelType, data.model)
      statusStore.updateWorkerStatus(config.workerId, 'ready')
    } else if (type === 'progress') {
      // Normalize progress value to 0-1 range
      const normalizedProgress = normalizeProgress(data)
      // Update local models store
      modelsStore.setModelProgress(config.modelType, {
        ...data,
        progress: normalizedProgress,
      })
      // Update worker progress
      statusStore.updateWorkerProgress(config.workerId, {
        current: data.loaded || 0,
        total: data.total || 100,
        percentage: normalizedProgress * 100,
        message: data.message || data.status || 'Loading model...',
      })
    } else if (type === 'error') {
      // Log detailed error if enabled
      if (config.enableDetailedErrorLogging) {
        log.error('Error received from worker')
        log.error('Error message:', data.message)
        log.error('Error stack:', data.stack)
        log.error('Error name:', data.name)
        log.error('Error cause:', data.cause)
        log.error('Original error:', data.originalError)
        log.error('Full error data:', data)
      }

      // Update local models store
      modelsStore.setModelError(
        config.modelType,
        data.message,
        config.enableDetailedErrorLogging
          ? {
              stack: data.stack,
              name: data.name,
              cause: data.cause,
              originalError: data.originalError,
            }
          : undefined
      )

      // Update worker status store
      statusStore.updateWorkerError(config.workerId, data.message, {
        message: data.message,
        stack: data.stack,
        name: data.name,
        cause: data.cause,
      })

      // If error has taskId, it's a task error
      if (taskId) {
        statusStore.incrementTask(config.workerId, 'failed')
        updateWorkerStatusIfIdle(config.workerId)
      }
    } else if (type === 'result' && taskId) {
      // Task completed successfully
      statusStore.incrementTask(config.workerId, 'completed')
      updateWorkerStatusIfIdle(config.workerId)
    } else if (type === 'cancelled' && taskId) {
      // Task cancelled
      statusStore.incrementTask(config.workerId, 'failed')
      updateWorkerStatusIfIdle(config.workerId)
    }
  }
}

/**
 * Update worker status to ready if no active tasks
 */
function updateWorkerStatusIfIdle(workerId: string): void {
  const statusStore = useWorkerStatusStore.getState()
  const currentStatus = statusStore.getWorkerStatus(workerId)
  if (currentStatus && currentStatus.activeTasks === 0) {
    statusStore.updateWorkerStatus(workerId, 'ready')
  }
}

/**
 * Create error handler for a worker
 */
function createErrorHandler(config: WorkerConfig) {
  return (error: ErrorEvent) => {
    const statusStore = useWorkerStatusStore.getState()
    const errorMessage = error.message || 'Worker error occurred'
    statusStore.updateWorkerError(config.workerId, errorMessage, {
      message: errorMessage,
      name: (error as any).name || 'Error',
    })
  }
}

/**
 * Create message error handler for a worker
 */
function createMessageErrorHandler(config: WorkerConfig) {
  return () => {
    const statusStore = useWorkerStatusStore.getState()
    statusStore.updateWorkerError(config.workerId, 'Worker message error', {
      message: 'Failed to deserialize message',
    })
  }
}

/**
 * Create and initialize a worker with the given configuration
 */
function createWorker(config: WorkerConfig): Worker {
  const statusStore = useWorkerStatusStore.getState()

  // Register worker in status store
  statusStore.registerWorker(config.workerId, config.workerName, config.workerType)
  statusStore.updateWorkerStatus(config.workerId, 'initializing')

  try {
    const worker = new Worker(new URL(config.workerFile, import.meta.url), {
      type: 'module',
    })

    // Set up message handler
    worker.addEventListener('message', createMessageHandler(config))

    // Set up error handlers
    worker.onerror = createErrorHandler(config)
    worker.onmessageerror = createMessageErrorHandler(config)

    return worker
  } catch (error) {
    statusStore.updateWorkerStatus(config.workerId, 'error')
    statusStore.updateWorkerError(
      config.workerId,
      error instanceof Error ? error.message : 'Failed to initialize worker',
      {
        message: error instanceof Error ? error.message : 'Failed to initialize worker',
        stack: error instanceof Error ? error.stack : undefined,
      }
    )
    throw error
  }
}

/**
 * Get or create a worker instance
 */
function getWorker(configKey: keyof typeof WORKER_CONFIGS): Worker {
  const config = WORKER_CONFIGS[configKey]
  let worker = workerInstances.get(config.workerId)

  if (!worker) {
    worker = createWorker(config)
    workerInstances.set(config.workerId, worker)
  }

  return worker
}

// ============================================================================
// Public API - Worker Getters
// ============================================================================

/**
 * Get ASR worker instance
 */
export function getASRWorker(): Worker {
  return getWorker('asr')
}

/**
 * Get Smart Translation worker instance
 */
export function getSmartTranslationWorker(): Worker {
  return getWorker('smartTranslation')
}

/**
 * Legacy: Get Translation worker (for backward compatibility)
 * Maps to smart translation worker
 */
export function getTranslationWorker(): Worker {
  return getSmartTranslationWorker()
}

/**
 * Get Dictionary worker instance
 */
export function getDictionaryWorker(): Worker {
  return getWorker('dictionary')
}

/**
 * Get TTS worker instance
 */
export function getTTSWorker(): Worker {
  return getWorker('tts')
}
