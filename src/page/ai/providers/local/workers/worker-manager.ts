/**
 * Worker Management
 * Creates and manages Web Workers for local model inference
 */

import { useLocalModelsStore } from '@/page/stores/local-models'
import { normalizeProgress } from '../utils/progress'
import { createLogger } from '@/shared/lib/utils'

// ============================================================================
// Logger
// ============================================================================

const log = createLogger({ name: 'WorkerManager' })

/**
 * Create and manage ASR worker
 */
let asrWorker: Worker | null = null

export function getASRWorker(): Worker {
  if (!asrWorker) {
    asrWorker = new Worker(
      new URL('./asr-worker.ts', import.meta.url),
      { type: 'module' }
    )

    asrWorker.addEventListener('message', (event) => {
      const { type, data } = event.data

      if (type === 'ready') {
        useLocalModelsStore.getState().setModelLoaded('asr', data.model)
      } else if (type === 'progress') {
        // Normalize progress value to 0-1 range
        const normalizedProgress = normalizeProgress(data)
        // Preserve all progress fields including file, filename, name, status, etc.
        useLocalModelsStore.getState().setModelProgress('asr', {
          ...data,
          progress: normalizedProgress,
        })
      } else if (type === 'error') {
        useLocalModelsStore.getState().setModelError('asr', data.message)
      }
    })
  }

  return asrWorker
}

/**
 * Create and manage Smart Translation worker
 */
let smartTranslationWorker: Worker | null = null

export function getSmartTranslationWorker(): Worker {
  if (!smartTranslationWorker) {
    smartTranslationWorker = new Worker(
      new URL('./smart-translation-worker.ts', import.meta.url),
      { type: 'module' }
    )

    smartTranslationWorker.addEventListener('message', (event) => {
      const { type, data } = event.data

      if (type === 'ready') {
        useLocalModelsStore.getState().setModelLoaded('smartTranslation', data.model)
      } else if (type === 'progress') {
        // Normalize progress value to 0-1 range
        const normalizedProgress = normalizeProgress(data)
        useLocalModelsStore.getState().setModelProgress('smartTranslation', {
          ...data,
          progress: normalizedProgress,
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
      }
    })
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
    dictionaryWorker = new Worker(
      new URL('./dictionary-worker.ts', import.meta.url),
      { type: 'module' }
    )

    dictionaryWorker.addEventListener('message', (event) => {
      const { type, data } = event.data

      if (type === 'ready') {
        useLocalModelsStore.getState().setModelLoaded('smartDictionary', data.model)
      } else if (type === 'progress') {
        // Normalize progress value to 0-1 range
        const normalizedProgress = normalizeProgress(data)
        useLocalModelsStore.getState().setModelProgress('smartDictionary', {
          ...data,
          progress: normalizedProgress,
        })
      } else if (type === 'error') {
        useLocalModelsStore.getState().setModelError('smartDictionary', data.message)
      }
    })
  }

  return dictionaryWorker
}

/**
 * Create and manage TTS worker
 */
let ttsWorker: Worker | null = null

export function getTTSWorker(): Worker {
  if (!ttsWorker) {
    ttsWorker = new Worker(
      new URL('./tts-worker.ts', import.meta.url),
      { type: 'module' }
    )

    ttsWorker.addEventListener('message', (event) => {
      const { type, data } = event.data

      if (type === 'ready') {
        useLocalModelsStore.getState().setModelLoaded('tts', data.model)
      } else if (type === 'progress') {
        // Normalize progress value to 0-1 range
        const normalizedProgress = normalizeProgress(data)
        useLocalModelsStore.getState().setModelProgress('tts', {
          ...data,
          progress: normalizedProgress,
        })
      } else if (type === 'error') {
        useLocalModelsStore.getState().setModelError('tts', data.message)
      }
    })
  }

  return ttsWorker
}

