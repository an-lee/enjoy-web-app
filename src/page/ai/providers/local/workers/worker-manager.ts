/**
 * Worker Management
 * Creates and manages Web Workers for local model inference
 */

import { useLocalModelsStore } from '@/page/stores/local-models'
import { useWorkerStatusStore } from '@/page/stores/worker-status'
import { normalizeProgress } from '../utils/progress'
import { createLogger } from '@/shared/lib/utils'

// ============================================================================
// Logger
// ============================================================================

const log = createLogger({ name: 'WorkerManager' })

// ============================================================================
// Worker IDs and Names
// ============================================================================

const ASR_WORKER_ID = 'asr-worker'
const ASR_WORKER_NAME = 'ASR Worker'

const SMART_TRANSLATION_WORKER_ID = 'smart-translation-worker'
const SMART_TRANSLATION_WORKER_NAME = 'Smart Translation Worker'

const DICTIONARY_WORKER_ID = 'dictionary-worker'
const DICTIONARY_WORKER_NAME = 'Dictionary Worker'

const TTS_WORKER_ID = 'tts-worker'
const TTS_WORKER_NAME = 'TTS Worker'

/**
 * Create and manage ASR worker
 */
let asrWorker: Worker | null = null

export function getASRWorker(): Worker {
  if (!asrWorker) {
    const store = useWorkerStatusStore.getState()

    // Register worker in status store
    store.registerWorker(ASR_WORKER_ID, ASR_WORKER_NAME, 'asr')
    store.updateWorkerStatus(ASR_WORKER_ID, 'initializing')

    try {
      asrWorker = new Worker(
        new URL('./asr-worker.ts', import.meta.url),
        { type: 'module' }
      )

      asrWorker.addEventListener('message', (event) => {
        const { type, data, taskId } = event.data
        const statusStore = useWorkerStatusStore.getState()

        if (type === 'ready') {
          useLocalModelsStore.getState().setModelLoaded('asr', data.model)
          statusStore.updateWorkerStatus(ASR_WORKER_ID, 'ready')
        } else if (type === 'progress') {
          // Normalize progress value to 0-1 range
          const normalizedProgress = normalizeProgress(data)
          // Preserve all progress fields including file, filename, name, status, etc.
          useLocalModelsStore.getState().setModelProgress('asr', {
            ...data,
            progress: normalizedProgress,
          })
          // Update worker progress
          statusStore.updateWorkerProgress(ASR_WORKER_ID, {
            current: data.loaded || 0,
            total: data.total || 100,
            percentage: normalizedProgress * 100,
            message: data.message || data.status || 'Loading model...',
          })
        } else if (type === 'error') {
          useLocalModelsStore.getState().setModelError('asr', data.message)
          statusStore.updateWorkerError(ASR_WORKER_ID, data.message, {
            message: data.message,
            stack: data.stack,
            name: data.name,
            cause: data.cause,
          })
          // If error has taskId, it's a task error
          if (taskId) {
            statusStore.incrementTask(ASR_WORKER_ID, 'failed')
            // Update status to ready if no active tasks
            const currentStatus = statusStore.getWorkerStatus(ASR_WORKER_ID)
            if (currentStatus && currentStatus.activeTasks === 0) {
              statusStore.updateWorkerStatus(ASR_WORKER_ID, 'ready')
            }
          }
        } else if (type === 'result' && taskId) {
          // Task completed successfully
          statusStore.incrementTask(ASR_WORKER_ID, 'completed')
          // Update status to ready if no active tasks
          const currentStatus = statusStore.getWorkerStatus(ASR_WORKER_ID)
          if (currentStatus && currentStatus.activeTasks === 0) {
            statusStore.updateWorkerStatus(ASR_WORKER_ID, 'ready')
          }
        }
      })

      asrWorker.onerror = (error) => {
        const statusStore = useWorkerStatusStore.getState()
        const errorMessage = error.message || 'Worker error occurred'
        statusStore.updateWorkerError(ASR_WORKER_ID, errorMessage, {
          message: errorMessage,
          name: (error as any).name || 'Error',
        })
      }

      asrWorker.onmessageerror = () => {
        const statusStore = useWorkerStatusStore.getState()
        statusStore.updateWorkerError(ASR_WORKER_ID, 'Worker message error', {
          message: 'Failed to deserialize message',
        })
      }
    } catch (error) {
      const statusStore = useWorkerStatusStore.getState()
      statusStore.updateWorkerStatus(ASR_WORKER_ID, 'error')
      statusStore.updateWorkerError(
        ASR_WORKER_ID,
        error instanceof Error ? error.message : 'Failed to initialize worker',
        {
          message: error instanceof Error ? error.message : 'Failed to initialize worker',
          stack: error instanceof Error ? error.stack : undefined,
        }
      )
      throw error
    }
  }

  return asrWorker
}

/**
 * Create and manage Smart Translation worker
 */
let smartTranslationWorker: Worker | null = null

export function getSmartTranslationWorker(): Worker {
  if (!smartTranslationWorker) {
    const store = useWorkerStatusStore.getState()

    // Register worker in status store
    store.registerWorker(SMART_TRANSLATION_WORKER_ID, SMART_TRANSLATION_WORKER_NAME, 'smart-translation')
    store.updateWorkerStatus(SMART_TRANSLATION_WORKER_ID, 'initializing')

    try {
      smartTranslationWorker = new Worker(
        new URL('./smart-translation-worker.ts', import.meta.url),
        { type: 'module' }
      )

      smartTranslationWorker.addEventListener('message', (event) => {
        const { type, data, taskId } = event.data
        const statusStore = useWorkerStatusStore.getState()

        if (type === 'ready') {
          useLocalModelsStore.getState().setModelLoaded('smartTranslation', data.model)
          statusStore.updateWorkerStatus(SMART_TRANSLATION_WORKER_ID, 'ready')
        } else if (type === 'progress') {
          // Normalize progress value to 0-1 range
          const normalizedProgress = normalizeProgress(data)
          useLocalModelsStore.getState().setModelProgress('smartTranslation', {
            ...data,
            progress: normalizedProgress,
          })
          // Update worker progress
          statusStore.updateWorkerProgress(SMART_TRANSLATION_WORKER_ID, {
            current: data.loaded || 0,
            total: data.total || 100,
            percentage: normalizedProgress * 100,
            message: data.message || data.status || 'Loading model...',
          })
        } else if (type === 'error') {
          // Log detailed error for debugging
          log.error('Error received from worker')
          log.error('Error message:', data.message)
          log.error('Error stack:', data.stack)
          log.error('Error name:', data.name)
          log.error('Error cause:', data.cause)
          log.error('Original error:', data.originalError)
          log.error('Full error data:', data)
          useLocalModelsStore.getState().setModelError('smartTranslation', data.message, {
            stack: data.stack,
            name: data.name,
            cause: data.cause,
            originalError: data.originalError,
          })
          statusStore.updateWorkerError(SMART_TRANSLATION_WORKER_ID, data.message, {
            message: data.message,
            stack: data.stack,
            name: data.name,
            cause: data.cause,
          })
          // If error has taskId, it's a task error
          if (taskId) {
            statusStore.incrementTask(SMART_TRANSLATION_WORKER_ID, 'failed')
            // Update status to ready if no active tasks
            const currentStatus = statusStore.getWorkerStatus(SMART_TRANSLATION_WORKER_ID)
            if (currentStatus && currentStatus.activeTasks === 0) {
              statusStore.updateWorkerStatus(SMART_TRANSLATION_WORKER_ID, 'ready')
            }
          }
        } else if (type === 'result' && taskId) {
          // Task completed successfully
          statusStore.incrementTask(SMART_TRANSLATION_WORKER_ID, 'completed')
          // Update status to ready if no active tasks
          const currentStatus = statusStore.getWorkerStatus(SMART_TRANSLATION_WORKER_ID)
          if (currentStatus && currentStatus.activeTasks === 0) {
            statusStore.updateWorkerStatus(SMART_TRANSLATION_WORKER_ID, 'ready')
          }
        } else if (type === 'cancelled' && taskId) {
          // Task cancelled
          statusStore.incrementTask(SMART_TRANSLATION_WORKER_ID, 'failed')
          // Update status to ready if no active tasks
          const currentStatus = statusStore.getWorkerStatus(SMART_TRANSLATION_WORKER_ID)
          if (currentStatus && currentStatus.activeTasks === 0) {
            statusStore.updateWorkerStatus(SMART_TRANSLATION_WORKER_ID, 'ready')
          }
        }
      })

      smartTranslationWorker.onerror = (error) => {
        const statusStore = useWorkerStatusStore.getState()
        const errorMessage = error.message || 'Worker error occurred'
        statusStore.updateWorkerError(SMART_TRANSLATION_WORKER_ID, errorMessage, {
          message: errorMessage,
          name: (error as any).name || 'Error',
        })
      }

      smartTranslationWorker.onmessageerror = () => {
        const statusStore = useWorkerStatusStore.getState()
        statusStore.updateWorkerError(SMART_TRANSLATION_WORKER_ID, 'Worker message error', {
          message: 'Failed to deserialize message',
        })
      }
    } catch (error) {
      const statusStore = useWorkerStatusStore.getState()
      statusStore.updateWorkerStatus(SMART_TRANSLATION_WORKER_ID, 'error')
      statusStore.updateWorkerError(
        SMART_TRANSLATION_WORKER_ID,
        error instanceof Error ? error.message : 'Failed to initialize worker',
        {
          message: error instanceof Error ? error.message : 'Failed to initialize worker',
          stack: error instanceof Error ? error.stack : undefined,
        }
      )
      throw error
    }
  }

  return smartTranslationWorker
}

/**
 * Legacy: Create and manage Translation worker (for backward compatibility)
 * Maps to smart translation worker
 */
export function getTranslationWorker(): Worker {
  return getSmartTranslationWorker()
}

/**
 * Create and manage Dictionary worker
 */
let dictionaryWorker: Worker | null = null

export function getDictionaryWorker(): Worker {
  if (!dictionaryWorker) {
    const store = useWorkerStatusStore.getState()

    // Register worker in status store
    store.registerWorker(DICTIONARY_WORKER_ID, DICTIONARY_WORKER_NAME, 'smart-dictionary')
    store.updateWorkerStatus(DICTIONARY_WORKER_ID, 'initializing')

    try {
      dictionaryWorker = new Worker(
        new URL('./dictionary-worker.ts', import.meta.url),
        { type: 'module' }
      )

      dictionaryWorker.addEventListener('message', (event) => {
        const { type, data, taskId } = event.data
        const statusStore = useWorkerStatusStore.getState()

        if (type === 'ready') {
          useLocalModelsStore.getState().setModelLoaded('smartDictionary', data.model)
          statusStore.updateWorkerStatus(DICTIONARY_WORKER_ID, 'ready')
        } else if (type === 'progress') {
          // Normalize progress value to 0-1 range
          const normalizedProgress = normalizeProgress(data)
          useLocalModelsStore.getState().setModelProgress('smartDictionary', {
            ...data,
            progress: normalizedProgress,
          })
          // Update worker progress
          statusStore.updateWorkerProgress(DICTIONARY_WORKER_ID, {
            current: data.loaded || 0,
            total: data.total || 100,
            percentage: normalizedProgress * 100,
            message: data.message || data.status || 'Loading model...',
          })
        } else if (type === 'error') {
          useLocalModelsStore.getState().setModelError('smartDictionary', data.message)
          statusStore.updateWorkerError(DICTIONARY_WORKER_ID, data.message, {
            message: data.message,
            stack: data.stack,
            name: data.name,
            cause: data.cause,
          })
          // If error has taskId, it's a task error
          if (taskId) {
            statusStore.incrementTask(DICTIONARY_WORKER_ID, 'failed')
            // Update status to ready if no active tasks
            const currentStatus = statusStore.getWorkerStatus(DICTIONARY_WORKER_ID)
            if (currentStatus && currentStatus.activeTasks === 0) {
              statusStore.updateWorkerStatus(DICTIONARY_WORKER_ID, 'ready')
            }
          }
        } else if (type === 'result' && taskId) {
          // Task completed successfully
          statusStore.incrementTask(DICTIONARY_WORKER_ID, 'completed')
          // Update status to ready if no active tasks
          const currentStatus = statusStore.getWorkerStatus(DICTIONARY_WORKER_ID)
          if (currentStatus && currentStatus.activeTasks === 0) {
            statusStore.updateWorkerStatus(DICTIONARY_WORKER_ID, 'ready')
          }
        }
      })

      dictionaryWorker.onerror = (error) => {
        const statusStore = useWorkerStatusStore.getState()
        const errorMessage = error.message || 'Worker error occurred'
        statusStore.updateWorkerError(DICTIONARY_WORKER_ID, errorMessage, {
          message: errorMessage,
          name: (error as any).name || 'Error',
        })
      }

      dictionaryWorker.onmessageerror = () => {
        const statusStore = useWorkerStatusStore.getState()
        statusStore.updateWorkerError(DICTIONARY_WORKER_ID, 'Worker message error', {
          message: 'Failed to deserialize message',
        })
      }
    } catch (error) {
      const statusStore = useWorkerStatusStore.getState()
      statusStore.updateWorkerStatus(DICTIONARY_WORKER_ID, 'error')
      statusStore.updateWorkerError(
        DICTIONARY_WORKER_ID,
        error instanceof Error ? error.message : 'Failed to initialize worker',
        {
          message: error instanceof Error ? error.message : 'Failed to initialize worker',
          stack: error instanceof Error ? error.stack : undefined,
        }
      )
      throw error
    }
  }

  return dictionaryWorker
}

/**
 * Create and manage TTS worker
 */
let ttsWorker: Worker | null = null

export function getTTSWorker(): Worker {
  if (!ttsWorker) {
    const store = useWorkerStatusStore.getState()

    // Register worker in status store
    store.registerWorker(TTS_WORKER_ID, TTS_WORKER_NAME, 'tts')
    store.updateWorkerStatus(TTS_WORKER_ID, 'initializing')

    try {
      ttsWorker = new Worker(
        new URL('./tts-worker.ts', import.meta.url),
        { type: 'module' }
      )

      ttsWorker.addEventListener('message', (event) => {
        const { type, data, taskId } = event.data
        const statusStore = useWorkerStatusStore.getState()

        if (type === 'ready') {
          useLocalModelsStore.getState().setModelLoaded('tts', data.model)
          statusStore.updateWorkerStatus(TTS_WORKER_ID, 'ready')
        } else if (type === 'progress') {
          // Normalize progress value to 0-1 range
          const normalizedProgress = normalizeProgress(data)
          useLocalModelsStore.getState().setModelProgress('tts', {
            ...data,
            progress: normalizedProgress,
          })
          // Update worker progress
          statusStore.updateWorkerProgress(TTS_WORKER_ID, {
            current: data.loaded || 0,
            total: data.total || 100,
            percentage: normalizedProgress * 100,
            message: data.message || data.status || 'Loading model...',
          })
        } else if (type === 'error') {
          useLocalModelsStore.getState().setModelError('tts', data.message)
          statusStore.updateWorkerError(TTS_WORKER_ID, data.message, {
            message: data.message,
            stack: data.stack,
            name: data.name,
            cause: data.cause,
          })
          // If error has taskId, it's a task error
          if (taskId) {
            statusStore.incrementTask(TTS_WORKER_ID, 'failed')
            // Update status to ready if no active tasks
            const currentStatus = statusStore.getWorkerStatus(TTS_WORKER_ID)
            if (currentStatus && currentStatus.activeTasks === 0) {
              statusStore.updateWorkerStatus(TTS_WORKER_ID, 'ready')
            }
          }
        } else if (type === 'result' && taskId) {
          // Task completed successfully
          statusStore.incrementTask(TTS_WORKER_ID, 'completed')
          // Update status to ready if no active tasks
          const currentStatus = statusStore.getWorkerStatus(TTS_WORKER_ID)
          if (currentStatus && currentStatus.activeTasks === 0) {
            statusStore.updateWorkerStatus(TTS_WORKER_ID, 'ready')
          }
        } else if (type === 'cancelled' && taskId) {
          // Task cancelled
          statusStore.incrementTask(TTS_WORKER_ID, 'failed')
          // Update status to ready if no active tasks
          const currentStatus = statusStore.getWorkerStatus(TTS_WORKER_ID)
          if (currentStatus && currentStatus.activeTasks === 0) {
            statusStore.updateWorkerStatus(TTS_WORKER_ID, 'ready')
          }
        }
      })

      ttsWorker.onerror = (error) => {
        const statusStore = useWorkerStatusStore.getState()
        const errorMessage = error.message || 'Worker error occurred'
        statusStore.updateWorkerError(TTS_WORKER_ID, errorMessage, {
          message: errorMessage,
          name: (error as any).name || 'Error',
        })
      }

      ttsWorker.onmessageerror = () => {
        const statusStore = useWorkerStatusStore.getState()
        statusStore.updateWorkerError(TTS_WORKER_ID, 'Worker message error', {
          message: 'Failed to deserialize message',
        })
      }
    } catch (error) {
      const statusStore = useWorkerStatusStore.getState()
      statusStore.updateWorkerStatus(TTS_WORKER_ID, 'error')
      statusStore.updateWorkerError(
        TTS_WORKER_ID,
        error instanceof Error ? error.message : 'Failed to initialize worker',
        {
          message: error instanceof Error ? error.message : 'Failed to initialize worker',
          stack: error instanceof Error ? error.stack : undefined,
        }
      )
      throw error
    }
  }

  return ttsWorker
}

