/**
 * Worker Management
 * Creates and manages Web Workers for local model inference
 */

import { useLocalModelsStore } from '@/stores/local-models'
import { normalizeProgress } from '../utils/progress'

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
        useLocalModelsStore.getState().setModelError('smartTranslation', data.message)
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
        useLocalModelsStore.getState().setModelLoaded('dictionary', data.model)
      } else if (type === 'progress') {
        // Normalize progress value to 0-1 range
        const normalizedProgress = normalizeProgress(data)
        useLocalModelsStore.getState().setModelProgress('dictionary', {
          ...data,
          progress: normalizedProgress,
        })
      } else if (type === 'error') {
        useLocalModelsStore.getState().setModelError('dictionary', data.message)
      }
    })
  }

  return dictionaryWorker
}

