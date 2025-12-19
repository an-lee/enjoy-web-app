/**
 * Model Initializer Service
 * Handles model preloading for faster inference
 */

import type { LocalModelConfig } from '../../../types'
import { useLocalModelsStore } from '@/page/stores/local-models'
import { createLogger } from '@/lib/utils'

// ============================================================================
// Logger
// ============================================================================

const log = createLogger({ name: 'ModelInitializer' })
import {
  getASRWorker,
  getSmartTranslationWorker,
  getDictionaryWorker,
  getTTSWorker,
} from '../workers/worker-manager'
import {
  DEFAULT_ASR_MODEL,
  DEFAULT_SMART_TRANSLATION_MODEL,
  DEFAULT_DICTIONARY_MODEL,
  DEFAULT_TTS_MODEL,
} from '../constants'

/**
 * Check if a model is cached in IndexedDB (transformers.js cache)
 * transformers.js stores models in IndexedDB with keys containing the model name
 */
async function isModelCached(modelName: string): Promise<boolean> {
  try {
    // transformers.js uses IndexedDB to cache models
    // The cache database name is typically 'hf-transformers-cache' or similar
    // We can check by trying to access the IndexedDB
    const dbName = 'hf-transformers-cache'
    return new Promise((resolve) => {
      const request = indexedDB.open(dbName)
      request.onsuccess = () => {
        const db = request.result
        if (!db) {
          resolve(false)
          return
        }

        // Check if there are any object stores (indicating cache exists)
        const objectStoreNames = db.objectStoreNames
        if (objectStoreNames.length === 0) {
          db.close()
          resolve(false)
          return
        }

        // Try to find model files in cache
        // transformers.js stores files with keys containing the model name
        // We'll search for keys that contain the model name
        const transaction = db.transaction([objectStoreNames[0]], 'readonly')
        const store = transaction.objectStore(objectStoreNames[0])
        const indexRequest = store.openCursor()
        let foundModel = false

        indexRequest.onsuccess = (event: any) => {
          const cursor = event.target.result
          if (cursor) {
            const key = cursor.key
            // Check if the key contains the model name (normalize for comparison)
            const keyStr = String(key).toLowerCase()
            const modelNameLower = modelName.toLowerCase().replace(/\//g, '-')
            if (keyStr.includes(modelNameLower) || keyStr.includes(modelName.toLowerCase())) {
              foundModel = true
              db.close()
              resolve(true)
              return
            }
            cursor.continue()
          } else {
            // No more entries, check if we found the model
            db.close()
            resolve(foundModel)
          }
        }

        indexRequest.onerror = () => {
          db.close()
          resolve(false)
        }
      }

      request.onerror = () => {
        // Database doesn't exist or can't be accessed
        resolve(false)
      }

      request.onblocked = () => {
        resolve(false)
      }
    })
  } catch (error) {
    log.warn('Failed to check model cache:', error)
    return false
  }
}

/**
 * Check if model is cached
 */
export async function checkModelCache(
  modelType: 'asr' | 'smartTranslation' | 'smartDictionary' | 'tts',
  modelConfig?: LocalModelConfig
): Promise<boolean> {
  const modelName =
    modelConfig?.model ||
    (modelType === 'asr'
      ? DEFAULT_ASR_MODEL
      : modelType === 'smartTranslation'
        ? DEFAULT_SMART_TRANSLATION_MODEL
        : modelType === 'smartDictionary'
          ? DEFAULT_DICTIONARY_MODEL
          : DEFAULT_TTS_MODEL)

  return await isModelCached(modelName)
}

/**
 * Check if model is already loaded in worker
 */
export async function checkModelLoaded(
  modelType: 'asr' | 'smartTranslation' | 'smartDictionary' | 'tts',
  modelConfig?: LocalModelConfig
): Promise<{ loaded: boolean; modelName: string | null }> {
  const modelName =
    modelConfig?.model ||
    (modelType === 'asr'
      ? DEFAULT_ASR_MODEL
      : modelType === 'smartTranslation'
        ? DEFAULT_SMART_TRANSLATION_MODEL
        : modelType === 'smartDictionary'
          ? DEFAULT_DICTIONARY_MODEL
          : DEFAULT_TTS_MODEL)

  return new Promise((resolve) => {
    let worker: Worker
    if (modelType === 'asr') {
      worker = getASRWorker()
    } else if (modelType === 'smartTranslation') {
      worker = getSmartTranslationWorker()
    } else if (modelType === 'smartDictionary') {
      worker = getDictionaryWorker()
    } else {
      worker = getTTSWorker()
    }

    const timeout = setTimeout(() => {
      worker.removeEventListener('message', messageHandler)
      resolve({ loaded: false, modelName: null })
    }, 5000)

    const messageHandler = (event: MessageEvent) => {
      const { type, data } = event.data
      if (type === 'status') {
        clearTimeout(timeout)
        worker.removeEventListener('message', messageHandler)
        resolve({
          loaded: data.loaded && data.model === modelName,
          modelName: data.model,
        })
      }
    }

    worker.addEventListener('message', messageHandler)
    worker.postMessage({ type: 'checkStatus' })
  })
}

/**
 * Initialize model (preload for faster inference)
 */
export async function initializeModel(
  modelType: 'asr' | 'smartTranslation' | 'smartDictionary' | 'tts',
  modelConfig?: LocalModelConfig
): Promise<void> {
  const store = useLocalModelsStore.getState()

  if (modelType === 'asr') {
    const modelName = modelConfig?.model || DEFAULT_ASR_MODEL
    const worker = getASRWorker()

    store.setModelLoading('asr', true)

    return new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Model initialization timeout'))
      }, 300000)

      const messageHandler = (event: MessageEvent) => {
        const { type, data } = event.data

        // Progress messages are handled by worker-manager.ts global listener
        // We only handle ready and error here
        if (type === 'ready' && data.model === modelName) {
          clearTimeout(timeout)
          worker.removeEventListener('message', messageHandler)
          // Ensure loading state is cleared (setModelLoaded is called by worker-manager.ts)
          store.setModelLoading('asr', false)
          resolve()
        } else if (type === 'error') {
          clearTimeout(timeout)
          worker.removeEventListener('message', messageHandler)
          store.setModelLoading('asr', false)
          reject(new Error(data.message))
        }
        // Note: progress messages are handled by worker-manager.ts global listener
      }

      worker.addEventListener('message', messageHandler)

      worker.postMessage({
        type: 'init',
        data: { model: modelName },
      })
    })
  } else if (modelType === 'smartTranslation') {
    const modelName = modelConfig?.model || DEFAULT_SMART_TRANSLATION_MODEL
    const worker = getSmartTranslationWorker()

    store.setModelLoading('smartTranslation', true)

    return new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Model initialization timeout'))
      }, 300000)

      const messageHandler = (event: MessageEvent) => {
        const { type, data } = event.data

        // Progress messages are handled by worker-manager.ts global listener
        // We only handle ready and error here
        if (type === 'ready' && data.model === modelName) {
          clearTimeout(timeout)
          worker.removeEventListener('message', messageHandler)
          // Ensure loading state is cleared (setModelLoaded is called by worker-manager.ts)
          store.setModelLoading('smartTranslation', false)
          resolve()
        } else if (type === 'error') {
          clearTimeout(timeout)
          worker.removeEventListener('message', messageHandler)
          store.setModelLoading('smartTranslation', false)

          // Log detailed error for debugging
          log.error('SmartTranslation error')
          log.error('Model name:', modelName)
          log.error('Error message:', data.message)
          log.error('Error stack:', data.stack)
          log.error('Error name:', data.name)
          log.error('Error cause:', data.cause)
          log.error('Full error data:', data)

          reject(new Error(data.message || 'Failed to initialize model'))
        }
        // Note: progress messages are handled by worker-manager.ts global listener
      }

      worker.addEventListener('message', messageHandler)

      worker.postMessage({
        type: 'init',
        data: { model: modelName },
      })
    })
  } else if (modelType === 'smartDictionary') {
    const modelName = modelConfig?.model || DEFAULT_DICTIONARY_MODEL
    const worker = getDictionaryWorker()

    store.setModelLoading('smartDictionary', true)

    return new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Model initialization timeout'))
      }, 300000)

      const messageHandler = (event: MessageEvent) => {
        const { type, data } = event.data

        // Progress messages are handled by worker-manager.ts global listener
        // We only handle ready and error here
        if (type === 'ready' && data.model === modelName) {
          clearTimeout(timeout)
          worker.removeEventListener('message', messageHandler)
          // Ensure loading state is cleared (setModelLoaded is called by worker-manager.ts)
          store.setModelLoading('smartDictionary', false)
          resolve()
        } else if (type === 'error') {
          clearTimeout(timeout)
          worker.removeEventListener('message', messageHandler)
          store.setModelLoading('smartDictionary', false)
          reject(new Error(data.message))
        }
        // Note: progress messages are handled by worker-manager.ts global listener
      }

      worker.addEventListener('message', messageHandler)

      worker.postMessage({
        type: 'init',
        data: { model: modelName },
      })
    })
  } else if (modelType === 'tts') {
    const modelName = modelConfig?.model || DEFAULT_TTS_MODEL
    const worker = getTTSWorker()

    store.setModelLoading('tts', true)

    return new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Model initialization timeout'))
      }, 300000)

      const messageHandler = (event: MessageEvent) => {
        const { type, data } = event.data

        // Progress messages are handled by worker-manager.ts global listener
        // We only handle ready and error here
        if (type === 'ready' && data.model === modelName) {
          clearTimeout(timeout)
          worker.removeEventListener('message', messageHandler)
          // Ensure loading state is cleared (setModelLoaded is called by worker-manager.ts)
          store.setModelLoading('tts', false)
          resolve()
        } else if (type === 'error') {
          clearTimeout(timeout)
          worker.removeEventListener('message', messageHandler)
          store.setModelLoading('tts', false)
          reject(new Error(data.message))
        }
        // Note: progress messages are handled by worker-manager.ts global listener
      }

      worker.addEventListener('message', messageHandler)

      worker.postMessage({
        type: 'init',
        data: { model: modelName },
      })
    })
  }
}

